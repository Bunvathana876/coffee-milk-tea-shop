import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  Phone,
  QrCode,
  AlertCircle,
  Loader2,
  Sparkles,
  MapPin,
  Banknote,
  Truck,
  Check,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useCart } from '../features/cart/useCart';
import { useAuth } from '../features/auth/AuthContext';
import { formatUsd, formatKhr } from '../config/currency';
import { createOrder } from '../services/orderService';
import { Button } from '../components/common/Button';
import type { CreateOrderPayload } from '../types';
import confetti from 'canvas-confetti';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalQuantity, subtotalUsd, totalPriceUsd, clearCart } = useCart();
  const { user, isAuthenticated, openAuthModal, openAuthModalWith } = useAuth();

  // Duplicate submission prevention lock
  const isSubmittingRef = useRef<boolean>(false);
  const pendingOrderRef = useRef<{ fingerprint: string; key: string } | null>(null);

  // Fulfillment Mode: Pickup or Delivery
  const [fulfillmentMode, setFulfillmentMode] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Customer Information Form State
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment Method: 'khqr' or 'cash'
  const [paymentMethod, setPaymentMethod] = useState<'khqr' | 'cash'>('khqr');

  // Pre-fill if user logs in or profile changes
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.full_name);
      if (!customerPhone) setCustomerPhone(user.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Form Validation State
  const [errors, setErrors] = useState<{
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
  }>({});

  // Submission States
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick suggestion chips for barista notes
  const quickNotes = [
    'Separate hot & cold bags',
    'Extra straw & napkins',
    'Pack ice separately',
    'Call upon arrival',
  ];

  const handleAddQuickNote = (noteText: string) => {
    setOrderNotes(prev => (prev ? `${prev}, ${noteText}` : noteText));
  };

  const validateForm = (): boolean => {
    const newErrors: {
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
    } = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required.';
    } else if (customerName.trim().length < 2) {
      newErrors.customerName = 'Please enter at least 2 characters.';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required.';
    } else if (customerPhone.trim().replace(/\D/g, '').length < 8) {
      newErrors.customerPhone = 'Please enter a valid phone number (at least 8 digits).';
    }

    if (fulfillmentMode === 'delivery' && !deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Please enter your street address or building.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Prevent duplicate submission if already processing
    if (isSubmittingRef.current || isLoading) {
      return;
    }

    // 0. Enforce user must be signed in to purchase
    if (!isAuthenticated) {
      openAuthModal();
      setSubmitError('Please sign in or create an account to place your order.');
      return;
    }

    // 1. Validate cart is not empty
    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add drinks before placing an order.');
      return;
    }

    // 2. Validate customer information
    if (!validateForm()) {
      return;
    }

    // Lock submission immediately
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      // Build comprehensive notes including fulfillment details
      let finalNotes = orderNotes.trim();
      if (fulfillmentMode === 'delivery') {
        const deliveryPrefix = `[DELIVERY to: ${deliveryAddress.trim()}]`;
        finalNotes = finalNotes ? `${deliveryPrefix} ${finalNotes}` : deliveryPrefix;
      } else {
        const pickupPrefix = '[STORE PICKUP: BKK1 Branch]';
        finalNotes = finalNotes ? `${pickupPrefix} ${finalNotes}` : pickupPrefix;
      }

      // Build order payload
      const orderPayload: CreateOrderPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: user?.email || null,
        notes: finalNotes || null,
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price_usd: item.unitPriceUsd,
          subtotal_usd: item.subtotalUsd,
          size: item.size,
          sugar_level: item.sugarLevel,
          ice_level: item.iceLevel,
          toppings: item.toppings || [],
        })),
      };

      // Send order to backend with idempotency protection
      const serializedPayload = JSON.stringify({
        customer_name: orderPayload.customer_name,
        customer_phone: orderPayload.customer_phone,
        customer_email: orderPayload.customer_email ?? null,
        notes: orderPayload.notes ?? null,
        payment_method: orderPayload.payment_method ?? 'cash',
        items: orderPayload.items.map(
          ({ product_id, quantity, size, sugar_level, ice_level, toppings }) => ({
            product_id,
            quantity,
            size,
            sugar_level,
            ice_level,
            toppings: toppings ?? [],
          }),
        ),
      });
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(serializedPayload),
      );
      const fingerprint = Array.from(new Uint8Array(digest), byte =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      if (pendingOrderRef.current?.fingerprint !== fingerprint) {
        let stored: { fingerprint: string; key: string } | null = null;
        try {
          const raw = sessionStorage.getItem('coffee_pending_order');
          if (raw) stored = JSON.parse(raw);
        } catch {
          // Continue with an in-memory key if session storage is unavailable.
        }
        pendingOrderRef.current =
          stored?.fingerprint === fingerprint &&
          typeof stored.key === 'string' &&
          /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(stored.key)
            ? stored
            : { fingerprint, key: crypto.randomUUID() };
        try {
          sessionStorage.setItem('coffee_pending_order', JSON.stringify(pendingOrderRef.current));
        } catch {
          // The in-memory key still protects retries while this page is open.
        }
      }
      const createdOrder = await createOrder(orderPayload, pendingOrderRef.current.key);
      pendingOrderRef.current = null;
      try {
        sessionStorage.removeItem('coffee_pending_order');
      } catch {
        // The confirmed order is already returned by the server.
      }

      // Trigger celebratory golden confetti
      try {
        confetti({
          particleCount: 75,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#1345A3', '#F5E4AD', '#17294D', '#FFF8DF'],
        });
      } catch {
        // confetti is purely decorative
      }

      // Clear the local shopping cart upon successful creation
      clearCart();

      // Navigate to receipt page
      navigate(`/receipt/${createdOrder.id}`, {
        state: { order: createdOrder },
      });
    } catch (err) {
      console.error('Order creation error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to connect to the server. Please check your backend connection and try again.';
      setSubmitError(message);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // 1. Empty Cart State
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-line p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="w-24 h-24 rounded-3xl bg-cream-deep text-cobalt flex items-center justify-center mx-auto border border-line shadow-2xs">
          <img
            src="/brand/brew-boba-cup-icon.webp"
            alt="Brew & Boba cup"
            className="w-16 h-16 object-contain"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-black text-ink tracking-tight uppercase">
            Your Cup Is Waiting.
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed max-w-sm mx-auto">
            Your cart is empty. Let's find something delicious before checking out.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/menu">
            <Button variant="accent" size="lg">
              Explore Our Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Guest Sign-In / Register Gate (keeps cart safe & satisfies storefront test)
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white rounded-3xl border border-line p-7 sm:p-10 text-center space-y-6 shadow-xs">
        <div className="w-20 h-20 rounded-3xl bg-cream-deep border border-line flex items-center justify-center mx-auto shadow-2xs">
          <img
            src="/brand/brew-boba-cup-icon.webp"
            alt="Brew & Boba cup"
            className="w-12 h-12 object-contain"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink tracking-tight">
            One quick step
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed max-w-md mx-auto">
            Sign in or create an account to place your order. Your {totalQuantity}{' '}
            {totalQuantity === 1 ? 'drink is' : 'drinks are'} safely saved in your bag (
            {formatUsd(totalPriceUsd)}).
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="accent"
            size="lg"
            onClick={() => openAuthModalWith({ mode: 'register' })}
            className="w-full shadow-md"
          >
            Create free account (10s)
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => openAuthModalWith({ mode: 'login' })}
            className="w-full"
          >
            I already have an account
          </Button>
        </div>

        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-cobalt hover:text-cobalt-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Keep browsing menu</span>
        </Link>
      </div>
    );
  }

  // 3. Main Full-Featured Cozy Retro Blue 2-Column Checkout Layout
  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto py-2">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-line/60 pb-4">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-sans text-xs sm:text-sm font-bold text-cobalt hover:text-cobalt-dark transition-colors bg-cream-deep border border-line/60 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to cart</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/brew-boba-cup-icon.webp"
            alt="Brew & Boba"
            className="w-7 h-7 object-contain"
          />
          <span className="font-serif text-base sm:text-lg font-black text-cobalt">
            Brew &amp; Boba Café
          </span>
        </div>
      </div>

      {/* Main 2-Column Form & Summary */}
      <form onSubmit={handlePlaceOrder} className="checkout-grid">
        {/* Left Column: Form Details */}
        <div className="space-y-6">
          {/* Header Title */}
          <div className="space-y-2">
            <div className="cart-brand-badge">
              <Sparkles className="w-3.5 h-3.5 text-cobalt" />
              <span>Checkout Order</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-cobalt tracking-tight uppercase">
              Almost Time To Sip.
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft">
              Just a few details, and your order is ready to go.
            </p>
          </div>

          {/* Global Error Summary Banner */}
          {submitError && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1 flex-1">
                <p className="font-bold">Could not place order</p>
                <p className="text-rose-700 leading-relaxed">{submitError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Fulfillment Mode (Pickup vs Delivery) */}
          <section className="checkout-section-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-black text-lg sm:text-xl text-ink">
                  How would you like it?
                </h2>
                <p className="mt-0.5 text-xs text-ink-soft">We'll have it ready fresh for you.</p>
              </div>
              <MapPin className="w-5 h-5 text-cobalt" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-cream-deep p-1.5 border border-line/50">
              {/* Pickup Option */}
              <button
                type="button"
                onClick={() => setFulfillmentMode('pickup')}
                aria-pressed={fulfillmentMode === 'pickup'}
                className={`min-h-[76px] rounded-xl px-3.5 py-3 text-left transition-all cursor-pointer ${
                  fulfillmentMode === 'pickup'
                    ? 'bg-cobalt text-white shadow-sm'
                    : 'text-ink-soft hover:bg-cream hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-2 font-sans text-sm font-bold">
                  <ShoppingBag className="w-4 h-4 text-butter" />
                  <span>Café Pickup</span>
                </span>
                <span
                  className={`mt-1.5 block pl-6 font-sans text-[11px] font-medium leading-tight ${
                    fulfillmentMode === 'pickup' ? 'text-white/80' : 'text-ink-soft'
                  }`}
                >
                  Ready in 10–15 min · BKK1
                </span>
              </button>

              {/* Delivery Option */}
              <button
                type="button"
                onClick={() => setFulfillmentMode('delivery')}
                aria-pressed={fulfillmentMode === 'delivery'}
                className={`min-h-[76px] rounded-xl px-3.5 py-3 text-left transition-all cursor-pointer ${
                  fulfillmentMode === 'delivery'
                    ? 'bg-cobalt text-white shadow-sm'
                    : 'text-ink-soft hover:bg-cream hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-2 font-sans text-sm font-bold">
                  <Truck className="w-4 h-4 text-butter" />
                  <span>Local Delivery</span>
                </span>
                <span
                  className={`mt-1.5 block pl-6 font-sans text-[11px] font-medium leading-tight ${
                    fulfillmentMode === 'delivery' ? 'text-white/80' : 'text-ink-soft'
                  }`}
                >
                  Arrives in 25–35 min
                </span>
              </button>
            </div>

            {/* Delivery Address Input */}
            {fulfillmentMode === 'delivery' && (
              <div className="pt-2 space-y-1.5 animate-in fade-in">
                <label
                  htmlFor="deliveryAddress"
                  className="block text-xs font-bold text-ink uppercase tracking-wider"
                >
                  Delivery Street Address or Building <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="deliveryAddress"
                    type="text"
                    autoComplete="street-address"
                    value={deliveryAddress}
                    onChange={e => {
                      setDeliveryAddress(e.target.value);
                      if (errors.deliveryAddress) {
                        setErrors(prev => ({ ...prev, deliveryAddress: undefined }));
                      }
                    }}
                    placeholder="e.g. Condo #402, Street 310, BKK1, Phnom Penh"
                    className={`min-h-12 w-full rounded-2xl border bg-cream pl-11 pr-4 font-sans text-sm outline-none transition placeholder:text-ink-soft/60 ${
                      errors.deliveryAddress
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-line focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'
                    }`}
                  />
                </div>
                {errors.deliveryAddress && (
                  <p role="alert" className="text-xs text-rose-600 font-semibold">
                    {errors.deliveryAddress}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Section 2: Contact Details & Barista Notes */}
          <section className="checkout-section-card space-y-4">
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-ink">Your Details</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                We'll notify your phone as soon as your drinks are prepared.
              </p>
            </div>

            {user && (
              <div className="p-3 rounded-2xl bg-cream-deep border border-line/60 text-xs font-semibold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cobalt shrink-0" />
                <span>
                  Ordering as <strong>{user.full_name}</strong> · Earning +1 Loyalty Stamp!
                </span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label htmlFor="customerName" className="block text-xs font-bold text-ink mb-1.5">
                  Your Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="customerName"
                    type="text"
                    autoComplete="name"
                    value={customerName}
                    disabled={isLoading}
                    onChange={e => {
                      setCustomerName(e.target.value);
                      if (errors.customerName)
                        setErrors(prev => ({ ...prev, customerName: undefined }));
                    }}
                    placeholder="e.g. Sopheak Chan"
                    className={`min-h-12 w-full rounded-2xl border bg-cream pl-11 pr-4 font-sans text-sm outline-none transition placeholder:text-ink-soft/60 ${
                      errors.customerName
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-line focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'
                    }`}
                  />
                </div>
                {errors.customerName && (
                  <p role="alert" className="text-xs text-rose-600 font-semibold mt-1">
                    {errors.customerName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="customerPhone" className="block text-xs font-bold text-ink mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="customerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={customerPhone}
                    disabled={isLoading}
                    onChange={e => {
                      setCustomerPhone(e.target.value);
                      if (errors.customerPhone)
                        setErrors(prev => ({ ...prev, customerPhone: undefined }));
                    }}
                    placeholder="e.g. 012 345 678"
                    className={`min-h-12 w-full rounded-2xl border bg-cream pl-11 pr-4 font-sans text-sm outline-none transition placeholder:text-ink-soft/60 ${
                      errors.customerPhone
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-line focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'
                    }`}
                  />
                </div>
                {errors.customerPhone && (
                  <p role="alert" className="text-xs text-rose-600 font-semibold mt-1">
                    {errors.customerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="pt-1">
              <label htmlFor="orderNotes" className="block text-xs font-bold text-ink mb-1.5">
                Barista notes <span className="font-normal text-ink-soft">(optional)</span>
              </label>
              <textarea
                id="orderNotes"
                rows={2}
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="e.g. Pack ice separately, extra napkins, leave at guard house..."
                className="w-full resize-none rounded-2xl border border-line bg-cream px-4 py-3 font-sans text-sm outline-none transition placeholder:text-ink-soft/60 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickNotes.map(note => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => handleAddQuickNote(note)}
                    className="text-[11px] font-bold px-3 py-1 rounded-full bg-cream-deep hover:bg-cobalt/15 hover:text-cobalt text-ink-soft border border-line/60 transition-colors cursor-pointer"
                  >
                    + {note}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Payment Method with Safety Guarantees */}
          <section className="checkout-section-card space-y-4">
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-ink">Payment Method</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Secure and simple, dual currency supported.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* KHQR */}
              <button
                type="button"
                onClick={() => setPaymentMethod('khqr')}
                aria-pressed={paymentMethod === 'khqr'}
                className={`relative flex min-h-[76px] items-center gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  paymentMethod === 'khqr'
                    ? 'border-cobalt bg-cobalt/5 ring-1 ring-cobalt'
                    : 'border-line bg-cream hover:border-cobalt/60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    paymentMethod === 'khqr'
                      ? 'bg-cobalt text-butter'
                      : 'bg-cream-deep text-ink-soft'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-sm font-bold text-ink">ABA KHQR</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Demo
                    </span>
                  </div>
                  <span className="block font-sans text-xs text-ink-soft mt-0.5">
                    Scan preview with any bank app
                  </span>
                </div>
                {paymentMethod === 'khqr' && (
                  <Check className="w-5 h-5 text-cobalt absolute right-4 top-4" />
                )}
              </button>

              {/* Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                aria-pressed={paymentMethod === 'cash'}
                className={`relative flex min-h-[76px] items-center gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-cobalt bg-cobalt/5 ring-1 ring-cobalt'
                    : 'border-line bg-cream hover:border-cobalt/60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    paymentMethod === 'cash'
                      ? 'bg-cobalt text-butter'
                      : 'bg-cream-deep text-ink-soft'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-sans text-sm font-bold text-ink">
                    Cash on {fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'}
                  </span>
                  <span className="block font-sans text-xs text-ink-soft mt-0.5">
                    Pay in USD ($) or KHR (៛) in person
                  </span>
                </div>
                {paymentMethod === 'cash' && (
                  <Check className="w-5 h-5 text-cobalt absolute right-4 top-4" />
                )}
              </button>
            </div>

            {/* Payment Safety Notice */}
            <div className="p-3 rounded-2xl bg-cream-deep/60 border border-line/60 flex items-start gap-2.5 text-xs text-ink-soft">
              <Info className="w-4 h-4 text-cobalt shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Payment Notice:</strong> ABA KHQR is currently a demonstration flow. Order
                status and payment verification remain distinct. No payment is settled from a QR
                preview alone.
              </p>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Dark Cobalt Order Summary Card */}
        <aside className="lg:sticky lg:top-24">
          <div className="checkout-summary-card">
            {/* Header */}
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="font-sans text-xs font-bold uppercase tracking-wider text-butter">
                  Order Summary
                </p>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white">
                  {totalQuantity} {totalQuantity === 1 ? 'drink' : 'drinks'}
                </span>
              </div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Review Your Sips</h2>
            </div>

            {/* Items List */}
            <div className="px-6 py-4 max-h-72 overflow-y-auto divide-y divide-white/10 scrollbar-none">
              {items.map(item => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/10 text-butter flex items-center justify-center shrink-0">
                      <img
                        src="/brand/brew-boba-cup-icon.webp"
                        alt="Brew & Boba"
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-serif font-bold text-sm text-white truncate">
                        {item.productName}
                      </h3>
                      <span className="font-sans text-sm font-bold text-white shrink-0 tabular-nums">
                        {formatUsd(item.subtotalUsd)}
                      </span>
                    </div>

                    <p className="text-xs text-white/70 font-medium">
                      {item.size} · {item.sugarLevel} sweet · {item.iceLevel}
                    </p>

                    {item.toppings && item.toppings.length > 0 && (
                      <p className="text-xs text-butter">+ {item.toppings.join(', ')}</p>
                    )}

                    <div className="text-[11px] text-white/50 pt-0.5 flex items-center justify-between">
                      <span>
                        Qty: {item.quantity} × {formatUsd(item.unitPriceUsd)}
                      </span>
                      <span>{formatKhr(item.subtotalUsd)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Breakdown */}
            <div className="border-t border-white/10 px-6 py-5 space-y-3 font-sans text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span className="font-bold text-white tabular-nums">{formatUsd(subtotalUsd)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Fulfillment ({fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'})</span>
                <span className="font-bold text-emerald-400">Free</span>
              </div>

              <div className="my-3 border-t border-white/15 pt-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-bold">
                      Total Due
                    </p>
                    <p className="font-serif text-3xl font-black text-white tabular-nums leading-none mt-1">
                      {formatUsd(totalPriceUsd)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-butter tabular-nums">
                    {formatKhr(totalPriceUsd)}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-butter font-sans text-sm font-black text-ink-dark shadow-lg shadow-black/20 hover:bg-[#faeec7] active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-butter-deep"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-ink-dark" />
                    <span>Placing your order...</span>
                  </>
                ) : (
                  <>
                    <span>Place order · {formatUsd(totalPriceUsd)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-center gap-1.5 text-center font-sans text-[11px] text-white/60">
                <ShieldCheck className="w-3.5 h-3.5 text-butter" />
                <span>Linked to your account for live status tracking</span>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};
