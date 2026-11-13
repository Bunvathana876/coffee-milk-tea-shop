import { randomInt } from 'node:crypto';
import { config } from '../config.js';

export function parseToppings(toppings) {
  if (Array.isArray(toppings)) {
    return toppings.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof toppings === 'string' && toppings.trim()) {
    return toppings
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function calculateItemPrice(basePriceUsd, size = 'Medium', toppings = []) {
  const sizeMod = config.sizePriceModifiers[size] ?? 0.0;
  const parsedToppings = parseToppings(toppings);
  const toppingsMod = parsedToppings.reduce((sum, topping) => {
    return sum + (config.toppingPrices[topping] ?? 0.0);
  }, 0.0);

  const unitPriceCents =
    Math.round(Number(basePriceUsd) * 100) +
    Math.round(sizeMod * 100) +
    Math.round(toppingsMod * 100);
  const unitPrice = unitPriceCents / 100;
  return {
    unitPrice,
    unitPriceCents,
    toppingsList: parsedToppings,
    toppingsString: parsedToppings.join(', '),
  };
}

export function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += chars.charAt(randomInt(chars.length));
  }
  return `ORD-${dateStr}-${rand}`;
}
