import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Coffee,
  Trophy,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LoyaltyCard } from '../components/auth/LoyaltyCard';

interface RewardPerk {
  id: string;
  title: string;
  costStamps: number;
  description: string;
  category: string;
  badge?: string;
  isUnlocked: boolean;
}

export const RewardsPage: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const totalStamps = user?.loyalty_stamps || 0;
  const currentStamps = totalStamps % 10;
  const freeDrinksEarned = Math.floor(totalStamps / 10);
  const stampsNeeded = 10 - currentStamps;

  // Determine user tier based on verified lifetime stamps
  const tierName =
    totalStamps >= 30 ? 'Gold Connoisseur' : totalStamps >= 10 ? 'Silver Brewer' : 'Bronze Member';

  const REWARD_PERKS: RewardPerk[] = [
    {
      id: 'free-drink',
      title: 'Free Handcrafted Drink',
      costStamps: 10,
      description:
        'Any signature coffee, milk tea, or ceremonial matcha in any size with your choice of sweetness, ice, and toppings.',
      category: 'Signature',
      badge: 'Core Benefit',
      isUnlocked: currentStamps === 10 || totalStamps >= 10,
    },
    {
      id: 'bakery-treat',
      title: 'Artisanal Bakery Pairing',
      costStamps: 5,
      description:
        'Enjoy a warm butter croissant or house-baked matcha scone alongside your favorite beverage.',
      category: 'In-Store',
      isUnlocked: currentStamps >= 5,
    },
    {
      id: 'oat-milk',
      title: 'Complimentary Plant Milk Upgrade',
      costStamps: 3,
      description:
        'Upgrade your latte or boba milk tea to premium Barista Oat Milk or Organic Almond Milk.',
      category: 'Customization',
      badge: 'Quick Unlock',
      isUnlocked: currentStamps >= 3,
    },
    {
      id: 'birthday-treat',
      title: 'Birthday Celebration Beverage',
      costStamps: 0,
      description:
        'Enjoy a celebratory complimentary drink of your choice during your birthday month at our BKK1 café.',
      category: 'Member Exclusive',
      badge: 'Annual Perk',
      isUnlocked: isAuthenticated,
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-12 pb-20 sm:pb-28 max-w-5xl mx-auto py-4 animate-in fade-in duration-200">
      {/* 1. Header & Member Digital Pass Card */}
      <section className="relative rounded-[2.5rem] bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] text-white p-7 sm:p-12 overflow-hidden shadow-2xl border-2 border-butter/30">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-butter/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-butter/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-12">
          {/* Left Column: Headline & Status */}
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-butter font-bold text-xs uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-butter" />
              <span>The Brew Club™ Rewards</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight leading-[1.1] uppercase">
              Every 10th cup is <span className="text-butter italic font-normal">on us.</span>
            </h1>

            <p className="text-xs sm:text-sm text-cream/90 leading-relaxed">
              Earn a digital stamp with every handcrafted drink ordered online or in-store at our
              BKK1 flagship bar. No paper cards to lose—just simple, honest sips.
            </p>

            {isAuthenticated && user && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-butter font-bold">
                  {tierName}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white font-semibold">
                  {freeDrinksEarned} Free Drinks Ready
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white/80">
                  {stampsNeeded} stamps to next free drink
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-butter hover:bg-[#faeec7] text-ink-dark font-black text-xs sm:text-sm shadow-xl transition-all active:scale-95 border border-butter-deep"
              >
                <Coffee className="w-4 h-4" />
                <span>Order Ahead &amp; Earn</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer active:scale-95"
                >
                  <span>Sign In to Save Stamps</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Digital Stamp Pass Widget */}
          <div className="w-full lg:max-w-md">
            <LoyaltyCard stamps={totalStamps} />
          </div>
        </div>
      </section>

      {/* 2. Unlockable Perks & Rewards Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cobalt">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Redeem &amp; Enjoy</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink tracking-tight mt-0.5">
              Available Brew Club Perks
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Present your digital punch pass to your barista in-store to claim complimentary
              rewards.
            </p>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-line hover:border-cobalt/50 text-xs sm:text-sm font-bold text-ink hover:text-cobalt shadow-2xs transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <span>Browse Menu</span>
            <ChevronRight className="w-4 h-4 text-cobalt" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {REWARD_PERKS.map(perk => (
            <article
              key={perk.id}
              className={`account-card flex flex-col justify-between space-y-4 ${
                perk.isUnlocked ? 'border-cobalt/40 ring-1 ring-cobalt/20' : 'opacity-85'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cream-deep border border-line text-ink-soft">
                    {perk.category}
                  </span>
                  {perk.badge && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cobalt/10 text-cobalt border border-cobalt/20">
                      {perk.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-ink leading-snug">
                    {perk.title}
                  </h3>
                  <p className="text-xs text-ink-soft leading-relaxed">{perk.description}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-line/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ink-soft uppercase font-bold block">Cost</span>
                  <span className="font-serif font-black text-sm text-cobalt">
                    {perk.costStamps === 0 ? 'Member Perk' : `${perk.costStamps} Stamps`}
                  </span>
                </div>

                {perk.isUnlocked ? (
                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cobalt hover:bg-cobalt-dark text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <span>Claim In-Store</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-[11px] font-semibold text-ink-soft bg-cream-deep px-3 py-1 rounded-full border border-line">
                    Need {perk.costStamps - currentStamps} more
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Informational Disclaimer Notice */}
        <div className="p-4 rounded-2xl bg-cream-deep/60 border border-line flex items-start gap-3 text-xs text-ink-soft">
          <Info className="w-4 h-4 text-cobalt shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Loyalty Transparency:</strong> Digital stamps are automatically credited for
            every paid beverage order linked to your phone number. Free drinks and member tier perks
            are verified and redeemed in-person at our BKK1 flagship bar.
          </p>
        </div>
      </section>

      {/* 3. How It Works: 3 Clean Steps */}
      <section className="account-card p-7 sm:p-10 space-y-8">
        <div className="text-center max-w-lg mx-auto space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-cobalt">
            Simple &amp; Honest
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink tracking-tight uppercase">
            How The Brew Club Works
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft">
            No complex point formulas. 1 drink = 1 stamp. Reach 10 stamps = 1 free beverage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-cream border border-line/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cobalt text-butter flex items-center justify-center font-bold text-sm shadow-xs">
              01
            </div>
            <h3 className="font-serif font-bold text-base text-ink">Order Handcrafted Drinks</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Order online for pickup or provide your phone number at our counter. Every drink you
              purchase automatically earns you one digital stamp.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-cream border border-line/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cobalt text-butter flex items-center justify-center font-bold text-sm shadow-xs">
              02
            </div>
            <h3 className="font-serif font-bold text-base text-ink">Collect Digital Stamps</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Your stamps sync instantly to your phone. Check your live balance anytime right here
              on this page without needing paper cards.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-cream border border-line/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cobalt text-butter flex items-center justify-center font-bold text-sm shadow-xs">
              03
            </div>
            <h3 className="font-serif font-bold text-base text-ink">Enjoy Your Free Beverage</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Once you hit 10 stamps, apply your reward to any signature pour-over, boba, or
              ceremonial matcha on your next checkout.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Member Tiers & Privileges Card */}
      <section className="bg-gradient-to-r from-cobalt to-cobalt-dark text-white rounded-3xl p-7 sm:p-10 border-2 border-butter/30 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-butter uppercase tracking-wider">
              Exclusive Privileges
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-black uppercase">
              Unlock Higher Tiers As You Sip
            </h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-white/90 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Lifetime Accumulated Stamps</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15 space-y-2">
            <span className="text-xs font-bold text-butter uppercase">Bronze Member (0–9)</span>
            <p className="text-xs text-white/80">
              1 digital stamp per drink, birthday reward beverage, and instant order pickup.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15 space-y-2">
            <span className="text-xs font-bold text-slate-200 uppercase">
              Silver Brewer (10–29)
            </span>
            <p className="text-xs text-white/80">
              All Bronze perks + 1 free bakery treat, free syrup upgrades, and seasonal tasting
              previews.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/10 border border-butter/40 space-y-2 relative overflow-hidden">
            <span className="text-xs font-bold text-butter uppercase">Gold Connoisseur (30+)</span>
            <p className="text-xs text-white/80">
              All Silver perks + monthly coffee tastings, double stamps every Tuesday, and VIP
              priority.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RewardsPage;
