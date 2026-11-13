import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { calculateItemPrice, parseToppings } from './calculations.js';

export class OrderInputError extends Error {
  constructor(detail, status = 422) {
    super(detail);
    this.status = status;
  }
}

const sugarLevels = new Set(['0%', '25%', '50%', '75%', '100%']);
const iceLevels = new Set(['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice']);
const orderFields = new Set([
  'customer_name',
  'customer_phone',
  'customer_email',
  'notes',
  'payment_method',
  'items',
  'currency',
  'subtotal_usd',
  'total_usd',
  'total_khr',
]);
const itemFields = new Set([
  'product_id',
  'product_name',
  'quantity',
  'unit_price_usd',
  'subtotal_usd',
  'size',
  'sugar_level',
  'ice_level',
  'toppings',
]);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new OrderInputError(
      `${label} must be a nonempty string of at most ${maxLength} characters.`,
    );
  }
  return value.trim();
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new OrderInputError(`${label} must be a string of at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

export function validateOrderPayload(body) {
  if (!isObject(body)) throw new OrderInputError('Order body must be a JSON object.');
  if (Object.keys(body).some(field => !orderFields.has(field))) {
    throw new OrderInputError('Order contains an unknown field.');
  }
  if (body.currency !== undefined && body.currency !== 'USD') {
    throw new OrderInputError('Order currency must be USD; KHR total is calculated by the server.');
  }
  const customer_name = requiredText(body.customer_name, 'Customer name', 255);
  const customer_phone = requiredText(body.customer_phone, 'Customer phone number', 50);
  if (!/^[+0-9() .-]+$/.test(customer_phone) || customer_phone.replace(/\D/g, '').length < 8) {
    throw new OrderInputError('Customer phone number must contain at least 8 digits.');
  }
  const customer_email = optionalText(body.customer_email, 'Customer email', 255);
  const notes = optionalText(body.notes, 'Notes', 2000);
  const payment_method = body.payment_method === undefined ? 'cash' : body.payment_method;
  if (!['cash', 'khqr'].includes(payment_method)) {
    throw new OrderInputError('Payment method must be cash or khqr.');
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new OrderInputError('Order must contain 1 to 50 items.');
  }

  const items = body.items.map((item, index) => {
    const label = `Item ${index + 1}`;
    if (!isObject(item)) throw new OrderInputError(`${label} must be an object.`);
    if (Object.keys(item).some(field => !itemFields.has(field))) {
      throw new OrderInputError(`${label} contains an unknown customization field.`);
    }
    if (
      !Number.isSafeInteger(item.product_id) ||
      item.product_id < 1 ||
      item.product_id > 2147483647
    ) {
      throw new OrderInputError(`${label} product_id must be a positive integer.`);
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new OrderInputError(`${label} quantity must be an integer from 1 to 50.`);
    }
    const size = item.size === undefined ? 'Medium' : item.size;
    const sugar_level = item.sugar_level === undefined ? '50%' : item.sugar_level;
    const ice_level = item.ice_level === undefined ? 'Normal Ice' : item.ice_level;
    if (typeof size !== 'string' || !Object.hasOwn(config.sizePriceModifiers, size)) {
      throw new OrderInputError(`${label} has an unavailable size.`);
    }
    if (!sugarLevels.has(sugar_level))
      throw new OrderInputError(`${label} has an unavailable sugar level.`);
    if (!iceLevels.has(ice_level))
      throw new OrderInputError(`${label} has an unavailable ice level.`);
    if (
      item.toppings !== undefined &&
      !Array.isArray(item.toppings) &&
      typeof item.toppings !== 'string'
    ) {
      throw new OrderInputError(`${label} toppings must be a list or comma-separated string.`);
    }
    if (Array.isArray(item.toppings) && item.toppings.some(value => typeof value !== 'string')) {
      throw new OrderInputError(`${label} toppings must contain only names.`);
    }
    const toppings = parseToppings(item.toppings ?? []);
    if (
      toppings.length > Object.keys(config.toppingPrices).length ||
      new Set(toppings).size !== toppings.length ||
      toppings.some(name => !Object.hasOwn(config.toppingPrices, name))
    ) {
      throw new OrderInputError(`${label} has an unknown or duplicate topping.`);
    }
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      size,
      sugar_level,
      ice_level,
      toppings,
    };
  });

  return { customer_name, customer_phone, customer_email, notes, payment_method, items };
}

export function readIdempotencyKey(header) {
  if (header === undefined) return null; // Legacy clients remain compatible.
  if (typeof header !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(header)) {
    throw new OrderInputError('Idempotency-Key must be 8 to 128 ASCII characters.', 400);
  }
  return header;
}

export function hashOrderPayload(order) {
  return createHash('sha256').update(JSON.stringify(order)).digest('hex');
}

export function calculateOrderItem(product, item) {
  const basePrice = Number(product.base_price_usd);
  if (!Number.isFinite(basePrice) || basePrice < 0 || Math.round(basePrice * 100) > 9999999999) {
    throw new Error('Invalid catalog price.');
  }
  const { unitPriceCents, toppingsString } = calculateItemPrice(
    basePrice,
    item.size,
    item.toppings,
  );
  const subtotalCents = unitPriceCents * item.quantity;
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 9999999999) {
    throw new OrderInputError('Order item exceeds the supported USD amount.');
  }
  return {
    ...item,
    product_name: product.name,
    unit_price_usd: unitPriceCents / 100,
    subtotal_usd: subtotalCents / 100,
    subtotalCents,
    toppings: toppingsString,
  };
}
