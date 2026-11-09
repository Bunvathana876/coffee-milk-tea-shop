import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, ArrowLeft } from 'lucide-react';
import { useCart } from '../features/cart/useCart';
import { CartItem } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { Button } from '../components/common/Button';

export const CartPage: React.FC = () => {
  const {
    items,
    totalQuantity,
    subtotalUsd,
    totalPriceUsd,
    totalPriceKhr,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
  } = useCart();

  return (
    <div className="py-4 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="cart-page-header">
        <div className="space-y-2">
          <div className="cart-brand-badge">
            <img
              src="/brand/brew-boba-cup-icon.webp"
              alt="Brew & Boba cup"
              className="cart-badge-icon"
            />
            <span>Handcrafted Order</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-cobalt tracking-tight uppercase">
            Your Happy Little Cart.
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Good things are brewing. Review your drinks before checkout.
          </p>
        </div>

        {items.length > 0 && (
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-cobalt hover:text-cobalt-dark transition-colors self-start sm:self-center px-4 py-2 rounded-full bg-cream-deep border border-line/60 hover:bg-cream cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Add more drinks</span>
          </Link>
        )}
      </div>

      {/* Cart Content: Empty State or Items Grid */}
      {items.length === 0 ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-line p-8 sm:p-12 text-center space-y-5 shadow-xs my-8">
          <div className="w-24 h-24 rounded-3xl bg-cream-deep text-cobalt border border-line flex items-center justify-center mx-auto shadow-2xs">
            <img
              src="/brand/brew-boba-cup-icon.webp"
              alt="Brew & Boba cup"
              className="w-16 h-16 object-contain"
            />
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <h2 className="text-2xl font-serif font-black text-ink tracking-tight uppercase">
              Your Cup Is Waiting.
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Your cart is empty. Let's find something delicious.
            </p>
          </div>

          <div className="pt-2">
            <Link to="/menu">
              <Button variant="accent" size="lg" icon={<Coffee className="w-4 h-4" />}>
                Explore Our Menu
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Cart Summary Card */}
          <div className="lg:col-span-5 xl:col-span-4">
            <CartSummary
              totalQuantity={totalQuantity}
              subtotalUsd={subtotalUsd}
              totalPriceUsd={totalPriceUsd}
              totalPriceKhr={totalPriceKhr}
              onClearCart={clearCart}
            />
          </div>
        </div>
      )}
    </div>
  );
};
