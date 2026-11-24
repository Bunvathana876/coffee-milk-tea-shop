import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { KitchenDisplayBoard } from '../components/KitchenDisplayBoard';
import { KitchenTicketModal } from '../components/KitchenTicketModal';
import type { AdminOrder } from '../lib/api';

const sampleOrders: AdminOrder[] = [
  {
    id: 101,
    order_number: 'ORD-20261116-P01',
    customer_name: 'Dara Sam',
    customer_phone: '012345678',
    customer_email: 'dara@example.com',
    notes: 'Less sweet please',
    subtotal_usd: 4.5,
    total_usd: 4.5,
    total_khr: 18450,
    payment_method: 'cash',
    payment_status: 'unpaid',
    order_status: 'pending',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
    items: [
      {
        id: 1,
        order_id: 101,
        product_id: 10,
        product_name: 'Classic Milk Tea',
        quantity: 1,
        unit_price_usd: 3.5,
        subtotal_usd: 4.5,
        size: 'Large',
        sugar_level: '30%',
        ice_level: 'Less Ice',
        toppings: 'Brown Sugar Boba',
      },
    ],
  },
  {
    id: 102,
    order_number: 'ORD-20261116-B02',
    customer_name: 'Sophea Pich',
    customer_phone: '098765432',
    notes: null,
    subtotal_usd: 3.25,
    total_usd: 3.25,
    total_khr: 13325,
    payment_method: 'khqr',
    payment_status: 'paid',
    order_status: 'preparing',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12m ago (urgent)
    items: [
      {
        id: 2,
        order_id: 102,
        product_id: 12,
        product_name: 'Iced Americano',
        quantity: 1,
        unit_price_usd: 3.25,
        subtotal_usd: 3.25,
        size: 'Medium',
        sugar_level: '0%',
        ice_level: 'Regular Ice',
        toppings: '',
      },
    ],
  },
  {
    id: 103,
    order_number: 'ORD-20261116-R03',
    customer_name: 'Bona Chen',
    customer_phone: '077112233',
    notes: 'Extra napkin',
    subtotal_usd: 5.0,
    total_usd: 5.0,
    total_khr: 20500,
    payment_method: 'khqr',
    payment_status: 'paid',
    order_status: 'ready',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2m ago
    items: [
      {
        id: 3,
        order_id: 103,
        product_id: 15,
        product_name: 'Matcha Latte',
        quantity: 1,
        unit_price_usd: 5.0,
        subtotal_usd: 5.0,
        size: 'Large',
        sugar_level: '50%',
        ice_level: 'Normal Ice',
        toppings: 'Egg Pudding',
      },
    ],
  },
  {
    id: 104,
    order_number: 'ORD-20261116-C04',
    customer_name: 'Vannak Meas',
    customer_phone: '088998877',
    notes: null,
    subtotal_usd: 4.0,
    total_usd: 4.0,
    total_khr: 16400,
    payment_method: 'cash',
    payment_status: 'paid',
    order_status: 'completed',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    items: [
      {
        id: 4,
        order_id: 104,
        product_id: 11,
        product_name: 'Espresso',
        quantity: 1,
        unit_price_usd: 4.0,
        subtotal_usd: 4.0,
        size: 'Small',
        sugar_level: '100%',
        ice_level: 'No Ice',
        toppings: '',
      },
    ],
  },
];

test('KitchenDisplayBoard renders the 3 canonical Kanban stages', () => {
  const html = renderToStaticMarkup(
    <KitchenDisplayBoard
      orders={sampleOrders}
      loading={false}
      onAdvanceStatus={async () => {}}
      onOpenDetails={() => {}}
      onPrintTicket={() => {}}
      busy={false}
    />,
  );

  // Column titles
  assert.ok(html.includes('Pending Queue'), 'must render Pending Queue column');
  assert.ok(html.includes('Brewing Station'), 'must render Brewing Station column');
  assert.ok(html.includes('Ready for Pickup'), 'must render Ready for Pickup column');

  // Subtitles
  assert.ok(html.includes('New tickets waiting to brew'), 'must show pending subtitle');
  assert.ok(html.includes('Currently being crafted'), 'must show preparing subtitle');
  assert.ok(html.includes('Packaged at counter'), 'must show ready subtitle');
});

test('KitchenDisplayBoard correctly partitions orders across stages and excludes completed orders', () => {
  const html = renderToStaticMarkup(
    <KitchenDisplayBoard
      orders={sampleOrders}
      loading={false}
      onAdvanceStatus={async () => {}}
      onOpenDetails={() => {}}
      onPrintTicket={() => {}}
      busy={false}
    />,
  );

  // Active tickets must appear
  assert.ok(html.includes('ORD-20261116-P01'), 'Pending ticket ORD-20261116-P01 must appear');
  assert.ok(html.includes('ORD-20261116-B02'), 'Preparing ticket ORD-20261116-B02 must appear');
  assert.ok(html.includes('ORD-20261116-R03'), 'Ready ticket ORD-20261116-R03 must appear');

  // Completed order #104 must NOT be rendered on active KDS board
  assert.ok(
    !html.includes('ORD-20261116-C04'),
    'Completed ticket ORD-20261116-C04 must not be in active kitchen board',
  );
  assert.ok(!html.includes('Vannak Meas'), 'Completed order customer must not appear on board');
});

test('KitchenDisplayBoard renders stage-specific action buttons for status advancement', () => {
  const html = renderToStaticMarkup(
    <KitchenDisplayBoard
      orders={sampleOrders}
      loading={false}
      onAdvanceStatus={async () => {}}
      onOpenDetails={() => {}}
      onPrintTicket={() => {}}
      busy={false}
    />,
  );

  // Stage 1: Pending -> Preparing
  assert.ok(html.includes('Start Brewing'), 'Pending tickets must offer "Start Brewing" action');
  assert.ok(
    html.includes('data-testid="advance-101"'),
    'Pending ticket must have advance-101 test ID',
  );

  // Stage 2: Preparing -> Ready
  assert.ok(html.includes('Mark Ready'), 'Preparing tickets must offer "Mark Ready" action');
  assert.ok(
    html.includes('data-testid="advance-102"'),
    'Preparing ticket must have advance-102 test ID',
  );

  // Stage 3: Ready -> Completed
  assert.ok(html.includes('Complete Order'), 'Ready tickets must offer "Complete Order" action');
  assert.ok(html.includes('Alert sent'), 'Ready tickets must display customer pickup alert indicator');
  assert.ok(
    html.includes('data-testid="advance-103"'),
    'Ready ticket must have advance-103 test ID',
  );
});

test('KitchenDisplayBoard displays drink customizations and ticket notes', () => {
  const html = renderToStaticMarkup(
    <KitchenDisplayBoard
      orders={sampleOrders}
      loading={false}
      onAdvanceStatus={async () => {}}
      onOpenDetails={() => {}}
      onPrintTicket={() => {}}
      busy={false}
    />,
  );

  // Customization tags for ticket 101
  assert.ok(html.includes('Classic Milk Tea'));
  assert.ok(html.includes('Large'));
  assert.ok(html.includes('30% sugar'));
  assert.ok(html.includes('Less Ice'));
  assert.ok(html.includes('+Brown Sugar Boba'));
  assert.ok(html.includes('Note:</strong> Less sweet please'));

  // Customization tags for ticket 103
  assert.ok(html.includes('Matcha Latte'));
  assert.ok(html.includes('+Egg Pudding'));
  assert.ok(html.includes('Note:</strong> Extra napkin'));
});

test('KitchenDisplayBoard renders empty state when a stage has no tickets', () => {
  const html = renderToStaticMarkup(
    <KitchenDisplayBoard
      orders={[]}
      loading={false}
      onAdvanceStatus={async () => {}}
      onOpenDetails={() => {}}
      onPrintTicket={() => {}}
      busy={false}
    />,
  );

  // Empty message shown in each column
  assert.ok(html.includes('No orders in this stage'));
  assert.ok(html.includes('All caught up'));
});

test('KitchenTicketModal renders ticket details for thermal kitchen printing', () => {
  const order = sampleOrders[0];
  const html = renderToStaticMarkup(
    <KitchenTicketModal order={order} isOpen={true} onClose={() => {}} />,
  );

  assert.ok(html.includes('BARISTA KITCHEN TICKET'));
  assert.ok(html.includes(order.order_number));
  assert.ok(html.includes(order.customer_name));
  assert.ok(html.includes('Classic Milk Tea'));
  assert.ok(html.includes('Cup Size:'));
  assert.ok(html.includes('Large'));
  assert.ok(html.includes('Sweetness:'));
  assert.ok(html.includes('30%'));
  assert.ok(html.includes('Ice Level:'));
  assert.ok(html.includes('Less Ice'));
  assert.ok(html.includes('+ Toppings: Brown Sugar Boba'));
  assert.ok(html.includes('Customer Notes / Instructions:'));
  assert.ok(html.includes('Less sweet please'));
  assert.ok(html.includes('kitchen-ticket-printable'));
  assert.ok(html.includes('print:w-[80mm]'));
  assert.ok(html.includes('80MM POS THERMAL'));
});

test('KitchenTicketModal handles array toppings, multiple items, and print isolation classes', () => {
  const multiItemOrder: AdminOrder = {
    id: 201,
    order_number: 'ORD-20261116-M01',
    customer_name: 'Chanthou Seng',
    customer_phone: '011223344',
    notes: 'Please pack separately',
    subtotal_usd: 8.5,
    total_usd: 8.5,
    total_khr: 34850,
    payment_method: 'khqr',
    payment_status: 'paid',
    order_status: 'preparing',
    created_at: new Date('2026-11-16T15:30:00Z').toISOString(),
    items: [
      {
        id: 11,
        order_id: 201,
        product_id: 5,
        product_name: 'Brown Sugar Boba Milk',
        quantity: 2,
        unit_price_usd: 3.75,
        subtotal_usd: 7.5,
        size: 'Large',
        sugar_level: '50%',
        ice_level: 'Regular Ice',
        // testing array or string format
        toppings: 'Grass Jelly, Cheese Foam' as unknown as string,
      },
      {
        id: 12,
        order_id: 201,
        product_id: 8,
        product_name: 'Espresso Single',
        quantity: 1,
        unit_price_usd: 1.0,
        subtotal_usd: 1.0,
        size: 'Small',
        sugar_level: '0%',
        ice_level: 'No Ice',
        toppings: '',
      },
    ],
  };

  const html = renderToStaticMarkup(
    <KitchenTicketModal order={multiItemOrder} isOpen={true} onClose={() => {}} />,
  );

  // Store information
  assert.ok(html.includes('BREW &amp; BOBA CAFÉ'));
  assert.ok(html.includes('Street 214, BKK1, Phnom Penh'));
  assert.ok(html.includes('+855 23 999 888'));

  // Order metadata
  assert.ok(html.includes('ORD-20261116-M01'));
  assert.ok(html.includes('Chanthou Seng'));
  assert.ok(html.includes('011223344'));

  // Multi-item details
  assert.ok(html.includes('Drink Items (2)'));
  assert.ok(html.includes('2× Brown Sugar Boba Milk'));
  assert.ok(html.includes('1× Espresso Single'));
  assert.ok(html.includes('+ Toppings: Grass Jelly, Cheese Foam'));
  assert.ok(html.includes('(@ $3.75 each)'));

  // Instructions
  assert.ok(html.includes('Please pack separately'));

  // Totals in dual currency
  assert.ok(html.includes('$8.50'));
  assert.ok(html.includes('34,850'));

  // Print isolation elements
  assert.ok(html.includes('print:hidden'), 'modal chrome must be hidden on print');
  assert.ok(html.includes('print:break-inside-avoid'), 'items must avoid print fragmentation');
  assert.ok(html.includes('KITCHEN PRODUCTION COPY'));
});

test('KitchenTicketModal returns null when closed or without order', () => {
  const htmlClosed = renderToStaticMarkup(
    <KitchenTicketModal order={sampleOrders[0]} isOpen={false} onClose={() => {}} />,
  );
  assert.equal(htmlClosed, '', 'must return null when isOpen is false');

  const htmlNoOrder = renderToStaticMarkup(
    <KitchenTicketModal order={null} isOpen={true} onClose={() => {}} />,
  );
  assert.equal(htmlNoOrder, '', 'must return null when order is null');
});
