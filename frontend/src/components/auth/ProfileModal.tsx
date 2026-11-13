import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, User, Phone, Mail, LogOut, Award, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { LoyaltyCard } from './LoyaltyCard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRewards?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenRewards }) => {
  const { user, logout } = useAuth();

  // Escape key listener and background scroll lock
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

  if (!isOpen || !user) return null;

  const totalStamps = user.loyalty_stamps || 0;
  const tierName =
    totalStamps >= 30 ? 'Gold Connoisseur' : totalStamps >= 10 ? 'Silver Brewer' : 'Bronze Member';

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Member Profile"
    >
      <div
        className="w-full max-w-lg bg-cream rounded-3xl shadow-2xl border border-line overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-butter text-cobalt-dark flex items-center justify-center font-serif font-black text-xl shadow-md shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-lg text-white tracking-tight">
                  {user.full_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-butter/20 text-butter border border-butter/30 text-[10px] font-black uppercase tracking-wider">
                  {tierName}
                </span>
              </div>
              <p className="text-xs text-cream/80">{user.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-cream flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close profile modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Digital Loyalty Punch Card */}
          <LoyaltyCard stamps={totalStamps} />

          {/* Account Details */}
          <div className="rounded-2xl border border-line divide-y divide-line bg-white text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-ink-soft font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-cobalt" /> Full Name
              </span>
              <span className="font-extrabold text-ink">{user.full_name}</span>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-ink-soft font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-cobalt" /> Phone Number
              </span>
              <span className="font-extrabold text-ink">{user.phone}</span>
            </div>
            {user.email && (
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-ink-soft font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cobalt" /> Email
                </span>
                <span className="font-extrabold text-ink">{user.email}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/orders"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-white border border-line hover:border-cobalt/40 text-ink font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-cobalt" />
              <span>Order History</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRewards?.();
              }}
              className="py-3 px-4 rounded-2xl bg-butter/40 hover:bg-butter/60 text-cobalt font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border border-butter-deep/40"
            >
              <Award className="w-4 h-4 text-cobalt" />
              <span>Rewards &amp; Perks</span>
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
