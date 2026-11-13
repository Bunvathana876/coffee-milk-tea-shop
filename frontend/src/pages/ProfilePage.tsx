import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Award,
  LogOut,
  Coffee,
  Sparkles,
  Trophy,
  Heart,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Store,
  Flame,
  Edit3,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LoyaltyCard } from '../components/auth/LoyaltyCard';
import { useFavorites } from '../features/favorites/useFavorites';
import { updateCustomerProfile } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, token, isAuthenticated, logout, openAuthModal, refreshProfile } = useAuth();
  const { favoriteIds } = useFavorites();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Coffee preferences (stored locally for seamless personalization)
  const [sweetness, setSweetness] = useState<string>(() => {
    return localStorage.getItem('brew_pref_sweetness') || '50% Half Sweet';
  });
  const [iceLevel, setIceLevel] = useState<string>(() => {
    return localStorage.getItem('brew_pref_ice') || 'Regular Ice';
  });
  const [milkPref, setMilkPref] = useState<string>(() => {
    return localStorage.getItem('brew_pref_milk') || 'Barista Oat Milk';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = () => {
    localStorage.setItem('brew_pref_sweetness', sweetness);
    localStorage.setItem('brew_pref_ice', iceLevel);
    localStorage.setItem('brew_pref_milk', milkPref);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2400);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (editName.trim().length < 2) {
      setEditError('Please enter at least 2 characters for your name.');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      await updateCustomerProfile(token, {
        full_name: editName.trim(),
        email: editEmail.trim() || undefined,
      });
      await refreshProfile();
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalStamps = user?.loyalty_stamps || 0;
  const currentStamps = totalStamps % 10;
  const freeDrinksEarned = Math.floor(totalStamps / 10);
  const tierName =
    totalStamps >= 30 ? 'Gold Connoisseur' : totalStamps >= 10 ? 'Silver Brewer' : 'Bronze Member';

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-12 sm:space-y-16 pb-20 sm:pb-28 max-w-4xl mx-auto py-4">
        {/* Guest Hero Section */}
        <section className="relative rounded-[2.5rem] bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] text-white p-8 sm:p-14 overflow-hidden shadow-2xl border-2 border-butter/30 text-center">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-butter/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-butter/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-white/15 border border-white/20 text-butter mx-auto flex items-center justify-center shadow-lg">
              <img
                src="/brand/brew-boba-mascot-badge.webp"
                alt="Brew & Boba Mascot"
                className="w-14 h-14 object-contain"
              />
            </div>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-butter font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                The Brew Club™
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white uppercase">
                Your Little Café Corner.
              </h1>
              <p className="text-white/85 text-sm sm:text-base leading-relaxed">
                Join <strong className="text-butter">The Brew Club™</strong> to track your digital
                loyalty stamps, unlock complimentary drinks, save taste preferences, and check out
                with 1-tap ease.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-butter hover:bg-[#faeec7] text-ink-dark font-black text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-butter-deep"
              >
                <User className="w-4 h-4" />
                <span>Sign In or Join Club</span>
              </button>
              <Link
                to="/menu"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4 text-butter" />
                <span>Explore Menu First</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits Grid for Guests */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-serif font-black text-2xl text-ink">Member Privileges</h2>
            <p className="text-xs sm:text-sm text-ink-soft">
              Every handcrafted cup brings you closer to exclusive rewards
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="account-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-black">
                <Trophy className="w-5 h-5 text-cobalt" />
              </div>
              <h3 className="font-serif font-black text-lg text-ink">Free Drink Stamp Pass</h3>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Earn 1 digital stamp for every signature drink. Get a free beverage of your choice
                after every 10 stamps.
              </p>
            </div>

            <div className="account-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black">
                <Sliders className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-serif font-black text-lg text-ink">Personalized Taste</h3>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Save your favorite sweetness, ice level, and oat milk preferences for automated
                1-click orders.
              </p>
            </div>

            <div className="account-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5 text-cobalt" />
              </div>
              <h3 className="font-serif font-black text-lg text-ink">Express Pick-Up</h3>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Order ahead from your device to skip the counter queue and pick up fresh handcrafted
                cups immediately.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 pb-24 sm:pb-32 max-w-5xl mx-auto py-4 animate-in fade-in duration-200">
      {/* 1. Header Profile Banner */}
      <section className="relative rounded-[2.5rem] bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] text-cream p-7 sm:p-10 overflow-hidden shadow-2xl border border-cobalt/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-butter/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-butter/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
          {/* User Info Avatar & Title */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-butter text-cobalt-dark flex items-center justify-center font-serif font-black text-2xl sm:text-3xl shadow-xl shrink-0 ring-4 ring-white/10">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-cream tracking-tight uppercase">
                  {user.full_name}
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-butter/20 text-butter border border-butter/30 text-xs font-black uppercase tracking-wider">
                  {tierName}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cream/80 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-butter" />
                  {user.phone}
                </span>
                {user.email && (
                  <span className="hidden sm:flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-butter" />
                    {user.email}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditName(user.full_name);
                setEditEmail(user.email || '');
                setIsEditing(!isEditing);
              }}
              className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-butter" />
              <span>Edit Profile</span>
            </button>

            <Link
              to="/rewards"
              className="px-4 sm:px-5 py-2.5 rounded-full bg-butter hover:bg-butter-light text-cobalt-dark font-black text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Brew Club</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-white/15 hover:border-rose-400/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* Edit Profile Form Banner */}
      {isEditing && (
        <form
          onSubmit={handleUpdateProfile}
          className="account-card space-y-4 border-cobalt/40 bg-white shadow-md animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cobalt" />
              <h3 className="font-serif font-black text-base text-ink">Edit Account Details</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs font-bold text-ink-soft hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {editError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="editName" className="text-xs font-bold text-ink">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cream font-sans text-xs font-medium focus:border-cobalt outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="editEmail" className="text-xs font-bold text-ink">
                Email Address (Optional)
              </label>
              <input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cream font-sans text-xs font-medium focus:border-cobalt outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-ink-soft hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-cobalt hover:bg-cobalt-dark text-butter font-black text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      )}

      {editSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Account details updated successfully!</span>
        </div>
      )}

      {/* 2. Key Metrics Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="account-card p-4 sm:p-5">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cobalt" />
            Current Stamps
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-ink">
            {currentStamps}
            <span className="text-sm font-semibold text-ink-muted"> / 10</span>
          </div>
          <div className="text-[11px] text-ink-soft mt-1">
            {10 - currentStamps} more to next free drink
          </div>
        </div>

        <div className="account-card p-4 sm:p-5">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-cobalt" />
            Free Drinks
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
            {freeDrinksEarned}
          </div>
          <div className="text-[11px] text-ink-soft mt-1">Available in-store</div>
        </div>

        <div className="account-card p-4 sm:p-5">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-cobalt" />
            Lifetime Stamps
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-ink">{totalStamps}</div>
          <div className="text-[11px] text-ink-soft mt-1">Total Cups Enjoyed</div>
        </div>

        <div className="account-card p-4 sm:p-5">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cobalt" />
            Club Tier
          </div>
          <div className="mt-2 text-base sm:text-lg font-black text-ink truncate">{tierName}</div>
          <div className="text-[11px] text-cobalt font-semibold mt-1">Perks Active</div>
        </div>
      </section>

      {/* 3. Loyalty Stamp Pass & Account Details */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Digital Stamp Pass & Shortcuts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-black text-xl sm:text-2xl text-ink flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cobalt" />
              Digital Stamp Pass
            </h2>
            <Link
              to="/rewards"
              className="text-xs font-bold text-cobalt hover:text-cobalt-dark flex items-center gap-1"
            >
              <span>Explore Perks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="account-card p-6 sm:p-7">
            <LoyaltyCard stamps={totalStamps} />
          </div>

          {/* Quick Hub Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              to="/orders"
              className="p-4 rounded-2xl bg-white border border-line hover:border-cobalt/40 transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cobalt/10 text-cobalt flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-cobalt" />
                </div>
                <div>
                  <div className="font-black text-sm text-ink group-hover:text-cobalt transition-colors">
                    Order History
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    View past receipts &amp; live status
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/menu"
              className="p-4 rounded-2xl bg-white border border-line hover:border-cobalt/40 transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cobalt/10 text-cobalt flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <div className="font-black text-sm text-ink group-hover:text-cobalt transition-colors">
                    Saved Drinks ({favoriteIds.length})
                  </div>
                  <div className="text-[11px] text-ink-soft">Explore your favorite cups</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right Column: Preferences & Account Settings */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="font-serif font-black text-xl sm:text-2xl text-ink flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cobalt" />
            Taste Preferences
          </h2>

          <div className="account-card space-y-4">
            <p className="text-xs text-ink-soft leading-relaxed">
              Saved on this device for your quick reference. Individual drink recipes (size,
              sweetness, ice, and toppings) are tailored per item in the drink menu modal.
            </p>

            {/* Sweetness */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Default Sweetness</span>
                <span className="text-cobalt text-[11px] font-bold">{sweetness}</span>
              </label>
              <select
                value={sweetness}
                onChange={e => setSweetness(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-cream border border-line text-xs font-bold text-ink focus:border-cobalt outline-none cursor-pointer"
              >
                <option value="100% Full Sweet">100% Full Sweet</option>
                <option value="70% Less Sweet">70% Less Sweet</option>
                <option value="50% Half Sweet">50% Half Sweet (Recommended)</option>
                <option value="30% Micro Sweet">30% Micro Sweet</option>
                <option value="0% Sugar-Free">0% Sugar-Free (Pure Tea &amp; Coffee)</option>
              </select>
            </div>

            {/* Ice Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Default Ice Level</span>
                <span className="text-cobalt text-[11px] font-bold">{iceLevel}</span>
              </label>
              <select
                value={iceLevel}
                onChange={e => setIceLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-cream border border-line text-xs font-bold text-ink focus:border-cobalt outline-none cursor-pointer"
              >
                <option value="Regular Ice">Regular Ice (Chilled)</option>
                <option value="Less Ice">Less Ice (More Volume)</option>
                <option value="No Ice">No Ice</option>
                <option value="Warm / Hot">Warm / Hot Drink</option>
              </select>
            </div>

            {/* Milk Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Milk Preference</span>
                <span className="text-cobalt text-[11px] font-bold">{milkPref}</span>
              </label>
              <select
                value={milkPref}
                onChange={e => setMilkPref(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-cream border border-line text-xs font-bold text-ink focus:border-cobalt outline-none cursor-pointer"
              >
                <option value="Barista Oat Milk">Barista Oat Milk (Creamy &amp; Nutty)</option>
                <option value="Fresh Whole Milk">Fresh Whole Milk (Classic)</option>
                <option value="Organic Almond Milk">Organic Almond Milk (Light)</option>
                <option value="Lactose-Free Milk">Lactose-Free Milk</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="w-full py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-dark text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-butter" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>

          {/* Account Details Box */}
          <div className="account-card space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-ink-muted">
              Account Information
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-ink-soft">Full Name</span>
                <span className="font-black text-ink">{user.full_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-ink-soft">Phone</span>
                <span className="font-black text-ink">{user.phone}</span>
              </div>
              {user.email && (
                <div className="flex items-center justify-between py-2 border-b border-line">
                  <span className="text-ink-soft">Email</span>
                  <span className="font-black text-ink">{user.email}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-ink-soft">Default Store</span>
                <span className="font-black text-cobalt flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  BKK1 Flagship
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
