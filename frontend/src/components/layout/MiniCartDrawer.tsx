import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, Plus, Minus, Trash2, Sparkles } from 'lucide-react';
import { useCart } from '../../features/cart/useCart';
import { formatUsd, formatKhr } from '../../config/currency';
import { Button } from '../common/Button';

export interface MiniCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniCartDrawer: React.FC<MiniCartDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    items,
    totalQuantity,
    subtotalUsd,
    totalPriceUsd,
    totalPriceKhr,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
  } = useCart();

  // Escape key dismissal and background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-line animate-in slide-in-from-right duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-line bg-cream flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cobalt text-butter flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-ink leading-tight">
                Your Order Bag
              </h3>
              <p className="text-xs text-ink-soft">
                {totalQuantity} {totalQuantity === 1 ? 'drink' : 'drinks'} selected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-line text-ink-soft hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close cart drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Delivery Perk Notification */}
        {subtotalUsd > 0 && (
          <div className="bg-butter/25 px-5 py-2.5 border-b border-line text-xs flex items-center gap-2 text-ink">
            <Sparkles className="w-4 h-4 text-cobalt shrink-0" />
            <span>
              {subtotalUsd >= 15 ? (
                <strong className="text-emerald-700 font-bold">You unlocked FREE delivery!</strong>
              ) : (
                <>
                  Add <strong>{formatUsd(15 - subtotalUsd)}</strong> more for free delivery
                </>
              )}
            </span>
          </div>
        )}

        {/* Items List or Empty State */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-xs mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-cream flex items-center justify-center mx-auto border border-line shadow-2xs">
                <img
                  src="/brand/brew-boba-cup-icon.webp"
                  alt="Brew & Boba"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-black text-xl text-ink uppercase tracking-tight">
                  Your Cup Is Waiting
                </h4>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Your cart is empty. Let's find something delicious.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    navigate('/menu');
                  }}
                  className="w-full text-xs font-bold"
                >
                  Explore Our Menu
                </Button>
              </div>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-cream/50 border border-line flex items-start justify-between gap-3 shadow-2xs transition-all hover:border-cobalt/40"
              >
                {/* Image & Description */}
                <div className="flex items-start gap-3 min-w-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-line"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shrink-0 border border-line">
                      <img
                        src="/brand/brew-boba-cup-icon.webp"
                        alt="Brew & Boba"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <h5 className="font-serif font-bold text-sm text-ink truncate">
                      {item.productName}
                    </h5>
                    <div className="flex flex-wrap gap-1 text-[10px] text-ink-soft">
                      <span className="px-1.5 py-0.5 rounded-md bg-white border border-line font-medium">
                        {item.size}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-butter/40 text-ink-dark font-bold border border-butter-deep/40">
                        {item.sugarLevel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-white border border-line font-medium">
                        {item.iceLevel}
                      </span>
                      {item.toppings?.map(top => (
                        <span
                          key={top}
                          className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                        >
                          +{top}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs font-black text-ink pt-0.5">
                      {formatUsd(item.subtotalUsd)}
                    </div>
                  </div>
                </div>

                {/* Actions: Stepper and Remove */}
                <div className="flex flex-col items-end justify-between h-full space-y-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-ink-soft hover:text-rose-600 cursor-pointer transition-colors"
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="cart-stepper scale-90 origin-right">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.id)}
                      className="cart-stepper-btn cart-stepper-btn-dec active:scale-90"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-ink">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.id)}
                      className="cart-stepper-btn cart-stepper-btn-inc active:scale-90"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Bottom Bar with Totals & Actions */}
        {items.length > 0 && (
          <div className="p-5 border-t border-line bg-cream space-y-3.5 shadow-lg">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-serif font-black text-base text-ink">
                  {formatUsd(subtotalUsd)}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-[11px] text-ink-soft">
                <span>Estimated in KHR</span>
                <span className="font-bold text-cobalt">{formatKhr(totalPriceKhr)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
                className="w-full justify-between shadow-md py-3.5"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                <span>Proceed to Checkout</span>
                <span>{formatUsd(totalPriceUsd)}</span>
              </Button>

              <Link
                to="/cart"
                onClick={onClose}
                className="block text-center text-xs font-bold text-ink-soft hover:text-cobalt py-1.5 transition-colors"
              >
                View Full Bag &amp; Special Instructions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
