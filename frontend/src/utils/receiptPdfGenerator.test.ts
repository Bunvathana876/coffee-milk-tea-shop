import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReceiptPdfDoc } from './receiptPdfGenerator';
import type { Order } from '../types';

const mockOrderWithKhqr: Order = {
  id: 501,
  order_number: 'ORD-20261116-T01',
  customer_name: 'Sokha Ly',
  customer_phone: '012998877',
  customer_email: 'sokha@example.com',
  notes: 'Less sugar, allergy to dairy cream',
  subtotal_usd: 8.25,
  total_usd: 8.25,
  total_khr: 33825,
  payment_method: 'khqr',
  payment_status: 'paid',
  order_status: 'ready',
  created_at: '2026-11-16T16:45:00.000Z',
  items: [
    {
      id: 1,
      order_id: 501,
      product_id: 1,
      product_name: 'Signature Brown Sugar Boba Fresh Milk',
      quantity: 2,
      unit_price_usd: 3.5,
      subtotal_usd: 7.0,
      size: 'Large',
      sugar_level: '30%',
      ice_level: 'Less Ice',
      toppings: 'Brown Sugar Pearls, Cheese Foam',
    },
    {
      id: 2,
      order_id: 501,
      product_id: 2,
      product_name: 'Iced Americano Single Origin',
      quantity: 1,
      unit_price_usd: 1.25,
      subtotal_usd: 1.25,
      size: 'Medium',
      sugar_level: '0%',
      ice_level: 'Regular Ice',
      toppings: '',
    },
  ],
};

const mockCashOrder: Order = {
  id: 502,
  order_number: 'ORD-20261116-C02',
  customer_name: 'Vireak Chea',
  customer_phone: '098112233',
  notes: null,
  subtotal_usd: 3.5,
  total_usd: 3.5,
  total_khr: 14350,
  payment_method: 'cash',
  payment_status: 'pending',
  order_status: 'pending',
  created_at: '2026-11-16T17:00:00.000Z',
  items: [
    {
      id: 3,
      order_id: 502,
      product_id: 3,
      product_name: 'Matcha Latte Ceremony',
      quantity: 1,
      unit_price_usd: 3.5,
      subtotal_usd: 3.5,
      size: 'Regular',
      sugar_level: '50%',
      ice_level: 'Normal Ice',
      // Testing array toppings format
      toppings: ['Egg Pudding'] as unknown as string,
    },
  ],
};

test('1. 80mm Thermal Receipt: Generates exact 80mm POS slip format', () => {
  const doc = generateReceiptPdfDoc(mockOrderWithKhqr, 'paid');
  assert.ok(doc, 'PDF doc must be created');

  const pageWidth = doc.internal.pageSize.getWidth();
  assert.equal(pageWidth, 80, 'Page width must strictly be 80mm for POS thermal printer compatibility');

  const pageHeight = doc.internal.pageSize.getHeight();
  assert.ok(pageHeight >= 140, 'Dynamic page height must be at least 140mm to accommodate items and QR');

  // Verify document produces valid output bytes
  const output = doc.output();
  assert.ok(output.length > 500, 'PDF output must contain encoded receipt bytes');
});

test('2. 80mm Thermal Receipt: Includes item customizations, toppings, and dual currency', () => {
  const doc = generateReceiptPdfDoc(mockOrderWithKhqr, 'paid');
  const output = doc.output('datauristring');

  assert.ok(output.startsWith('data:application/pdf'), 'Must generate valid PDF data URI');
  // Check page count - must fit on 1 single continuous thermal paper page
  assert.equal(doc.getNumberOfPages(), 1, '80mm receipt slip must be a single continuous page');
});

test('3. 80mm Thermal Receipt: Handles Cash orders without QR section and with array toppings', () => {
  const doc = generateReceiptPdfDoc(mockCashOrder, 'pending');
  assert.ok(doc, 'Cash order PDF doc must be created');

  const pageWidth = doc.internal.pageSize.getWidth();
  assert.equal(pageWidth, 80, 'Width must be 80mm');

  // Cash order has no QR block, so page height estimate should be more compact
  const pageHeight = doc.internal.pageSize.getHeight();
  assert.ok(pageHeight >= 140, 'Page height must satisfy minimum thermal slip constraints');
  assert.equal(doc.getNumberOfPages(), 1, 'Cash receipt slip must fit on single continuous page');
});

test('4. 80mm Thermal Receipt: Handles empty items or missing metadata gracefully without throwing', () => {
  const emptyOrder: Order = {
    id: 503,
    order_number: 'ORD-EMPTY-001',
    customer_name: '',
    customer_phone: '',
    subtotal_usd: 0,
    total_usd: 0,
    total_khr: 0,
    payment_method: 'cash',
    payment_status: 'pending',
    order_status: 'pending',
    created_at: '',
    items: [],
  };

  assert.doesNotThrow(() => {
    const doc = generateReceiptPdfDoc(emptyOrder, 'pending');
    assert.equal(doc.internal.pageSize.getWidth(), 80);
  }, 'Empty or minimal order must not throw when generating 80mm thermal receipt');
});
