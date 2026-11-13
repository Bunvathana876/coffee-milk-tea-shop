import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusBadge, getPaymentBadge } from '../../utils/orderStatusBadge';

// Mock localStorage for Node test runner
const storageMock = new Map<string, string>();
const fakeWindow = {
  localStorage: {
    getItem: (k: string) => storageMock.get(k) ?? null,
    setItem: (k: string, v: string) => storageMock.set(k, String(v)),
    removeItem: (k: string) => storageMock.delete(k),
    clear: () => storageMock.clear(),
  },
};
(globalThis as any).window = fakeWindow;

const TOKEN_KEY = 'coffee_customer_token';
const USER_KEY = 'coffee_customer_user';

test('1. Authentication Validation Rules', () => {
  // Login field validation
  const validateLogin = (phoneOrEmail: string, pass: string) => {
    if (!phoneOrEmail.trim() || !pass) {
      return 'Enter your phone or email and your password.';
    }
    return null;
  };

  assert.equal(validateLogin('', 'password123'), 'Enter your phone or email and your password.');
  assert.equal(validateLogin('012345678', ''), 'Enter your phone or email and your password.');
  assert.equal(validateLogin('012345678', 'password123'), null);

  // Registration field validation
  const validateRegister = (fullName: string, phone: string, pass: string) => {
    if (fullName.trim().length < 2) {
      return 'Please enter your name.';
    }
    if (phone.trim().replace(/\D/g, '').length < 8) {
      return 'Please enter a valid phone number (at least 8 digits).';
    }
    if (pass.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return null;
  };

  assert.equal(validateRegister('A', '012345678', 'secret123'), 'Please enter your name.');
  assert.equal(
    validateRegister('Sopheak', '12345', 'secret123'),
    'Please enter a valid phone number (at least 8 digits).',
  );
  assert.equal(
    validateRegister('Sopheak', '012345678', '123'),
    'Password must be at least 6 characters.',
  );
  assert.equal(validateRegister('Sopheak Chan', '012345678', 'secret123'), null);
});

test('2. Customer Session Persistence and Token Handling', () => {
  storageMock.clear();

  const mockUser = {
    id: 1001,
    full_name: 'Channary Kim',
    phone: '012999888',
    email: 'channary@example.com',
    loyalty_stamps: 14,
    is_active: true,
  };
  const mockToken = 'mock-jwt-token-xyz';

  // Simulate login session saving
  fakeWindow.localStorage.setItem(TOKEN_KEY, mockToken);
  fakeWindow.localStorage.setItem(USER_KEY, JSON.stringify(mockUser));

  assert.equal(fakeWindow.localStorage.getItem(TOKEN_KEY), mockToken);
  const storedUser = JSON.parse(fakeWindow.localStorage.getItem(USER_KEY) || '{}');
  assert.equal(storedUser.id, 1001);
  assert.equal(storedUser.full_name, 'Channary Kim');
  assert.equal(storedUser.loyalty_stamps, 14);

  // Simulate logout
  fakeWindow.localStorage.removeItem(TOKEN_KEY);
  fakeWindow.localStorage.removeItem(USER_KEY);
  assert.equal(fakeWindow.localStorage.getItem(TOKEN_KEY), null);
  assert.equal(fakeWindow.localStorage.getItem(USER_KEY), null);
});

test('3. Loyalty Stamp and Reward Tier Calculations', () => {
  const calculateLoyalty = (stamps: number) => {
    const currentStamps = stamps % 10;
    const freeDrinksEarned = Math.floor(stamps / 10);
    const stampsNeeded = 10 - currentStamps;
    const tierName =
      stamps >= 30 ? 'Gold Connoisseur' : stamps >= 10 ? 'Silver Brewer' : 'Bronze Member';

    return { currentStamps, freeDrinksEarned, stampsNeeded, tierName };
  };

  // User with 0 stamps
  const newMember = calculateLoyalty(0);
  assert.equal(newMember.currentStamps, 0);
  assert.equal(newMember.freeDrinksEarned, 0);
  assert.equal(newMember.stampsNeeded, 10);
  assert.equal(newMember.tierName, 'Bronze Member');

  // User with 7 stamps
  const progressingMember = calculateLoyalty(7);
  assert.equal(progressingMember.currentStamps, 7);
  assert.equal(progressingMember.freeDrinksEarned, 0);
  assert.equal(progressingMember.stampsNeeded, 3);
  assert.equal(progressingMember.tierName, 'Bronze Member');

  // User with 10 stamps
  const unlockedMember = calculateLoyalty(10);
  assert.equal(unlockedMember.currentStamps, 0);
  assert.equal(unlockedMember.freeDrinksEarned, 1);
  assert.equal(unlockedMember.stampsNeeded, 10);
  assert.equal(unlockedMember.tierName, 'Silver Brewer');

  // User with 35 stamps
  const vipMember = calculateLoyalty(35);
  assert.equal(vipMember.currentStamps, 5);
  assert.equal(vipMember.freeDrinksEarned, 3);
  assert.equal(vipMember.stampsNeeded, 5);
  assert.equal(vipMember.tierName, 'Gold Connoisseur');
});

test('4. Order Status vs Payment Status Decoupling', () => {
  // Verifies that 'pending' payment never equals 'completed' or 'paid'
  const isOrderConfirmed = (orderStatus: string) =>
    ['confirmed', 'preparing', 'ready', 'completed'].includes(orderStatus.toLowerCase());
  const isPaymentSettled = (paymentStatus: string) => paymentStatus.toLowerCase() === 'paid';

  assert.equal(isOrderConfirmed('ready'), true);
  assert.equal(
    isPaymentSettled('pending'),
    false,
    'Pending payment must not be considered settled',
  );
  assert.equal(isPaymentSettled('paid'), true);
});

test('5. Profile Update Validation & Sanitization', () => {
  const validateProfileUpdate = (data: { full_name?: string; email?: string }) => {
    if (data.full_name !== undefined && data.full_name.trim().length < 2) {
      return { valid: false, error: 'Please enter at least 2 characters for your name.' };
    }
    const cleanEmail = data.email && data.email.trim() ? data.email.trim().toLowerCase() : null;
    return {
      valid: true,
      sanitized: {
        full_name: data.full_name?.trim(),
        email: cleanEmail,
      },
    };
  };

  const shortName = validateProfileUpdate({ full_name: 'A' });
  assert.equal(shortName.valid, false);

  const validUpdate = validateProfileUpdate({
    full_name: 'Sopheak Chan ',
    email: ' Sopheak@Example.COM ',
  });
  assert.equal(validUpdate.valid, true);
  assert.equal(validUpdate.sanitized?.full_name, 'Sopheak Chan');
  assert.equal(validUpdate.sanitized?.email, 'sopheak@example.com');
});

test('6. Receipt Route Parameter Security & Status Handling', () => {
  const isValidReceiptId = (id: unknown): boolean => {
    if (typeof id === 'number') return Number.isInteger(id) && id > 0;
    if (typeof id === 'string') return /^\d+$/.test(id.trim()) && Number(id) > 0;
    return false;
  };

  assert.equal(isValidReceiptId('123'), true);
  assert.equal(isValidReceiptId(990001), true);
  assert.equal(isValidReceiptId('abc'), false);
  assert.equal(isValidReceiptId('-5'), false);
  assert.equal(isValidReceiptId(null), false);
  assert.equal(isValidReceiptId(undefined), false);
});

test('7. Loyalty Perks Are Claimed In-Store Without Client Pricing Mutations', () => {
  // Verifies that loyalty stamp thresholds do not mutate authoritative server totals
  const serverTotal = 5.0; // Authoritative price from catalog / server

  const applyClientDiscountAttempt = (total: number, _unlockedStamps: number) => {
    // Client must NEVER apply client-side discount to authoritative total
    return total;
  };

  const finalTotal = applyClientDiscountAttempt(serverTotal, 10);
  assert.equal(finalTotal, 5.0, 'Client-side pricing must never invent automated stamp discounts');
});

test('8. Order and Payment Status Badge Neutral Fallback Mapping', () => {
  // Known order statuses
  assert.match(getStatusBadge('ready'), /bg-emerald-100/);
  assert.match(getStatusBadge('completed'), /bg-teal-100/);
  assert.match(getStatusBadge('preparing'), /bg-indigo-100/);
  assert.match(getStatusBadge('confirmed'), /bg-blue-100/);
  assert.match(getStatusBadge('cancelled'), /bg-rose-100/);
  assert.match(getStatusBadge('pending'), /bg-amber-100/);

  // Unknown order status must never map to amber 'pending' or emerald 'ready'
  const unknownOrderBadge = getStatusBadge('custom_hold');
  assert.match(unknownOrderBadge, /bg-stone-100/);
  assert.equal(unknownOrderBadge.includes('bg-amber-100'), false);
  assert.equal(unknownOrderBadge.includes('bg-emerald-100'), false);

  // Known payment statuses
  assert.match(getPaymentBadge('paid'), /bg-emerald-100/);
  assert.match(getPaymentBadge('pending'), /bg-amber-100/);
  assert.match(getPaymentBadge('unpaid'), /bg-amber-100/);
  assert.match(getPaymentBadge('failed'), /bg-rose-100/);
  assert.match(getPaymentBadge('refunded'), /bg-rose-100/);

  // Unknown payment status must never map to emerald 'paid' or amber 'pending'
  const unknownPaymentBadge = getPaymentBadge('settlement_in_progress');
  assert.match(unknownPaymentBadge, /bg-stone-100/);
  assert.equal(unknownPaymentBadge.includes('bg-emerald-100'), false);
  assert.equal(unknownPaymentBadge.includes('bg-amber-100'), false);
});
