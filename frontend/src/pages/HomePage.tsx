import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, ArrowRight, CupSoda, Sparkles, QrCode, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { CustomizationModal } from '../components/product/CustomizationModal';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useCart } from '../features/cart/useCart';
import type { Product, DrinkCustomization } from '../types';

export const HomePage: React.FC = () => {
  const { addItem } = useCart();
  const { categories, loading: catLoading } = useCategories();
  const { products, loading: prodLoading, error, refetch } = useProducts({ isAvailable: true });

  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const featuredDrinks = products.slice(0, 6);

  const handleAddToCart = (product: Product, customization: DrinkCustomization) => {
    addItem({
      productId: product.id,
      productName: product.name,
      image: product.image,
      size: customization.size,
      sugarLevel: customization.sugar_level,
      iceLevel: customization.ice_level,
      unitPriceUsd: customization.unit_price_usd,
      quantity: customization.quantity,
    });

    setToastMessage(
      `Added ${customization.quantity}x ${product.name} (${customization.size}, ${customization.sugar_level} Sugar, ${customization.ice_level}) to cart!`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-800 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white p-1 ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 text-white p-8 sm:p-12 overflow-hidden shadow-xl shadow-amber-950/15">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-amber-600/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-700/60 text-amber-200 border border-amber-500/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Freshly Handcrafted in Phnom Penh
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Artisan Coffee & Craft Milk Tea
          </h1>

          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed">
            From single-origin espresso roasts to creamy brown sugar boba and refreshing fruit teas, each drink is prepared fresh to order.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all active:scale-95"
            >
              Order Now <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white text-xs font-medium backdrop-blur-sm border border-white/10">
              <QrCode className="w-4 h-4 text-amber-300" />
              ABA KHQR Accepted ($ & ៛)
            </div>
          </div>
        </div>
      </section>

      {/* Categories Horizontal Quick Scroll */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Explore by Category</h2>
            <p className="text-xs text-stone-500">Pick your favorite flavor profile</p>
          </div>
          <Link to="/menu" className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-stone-200/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/menu?category=${encodeURIComponent(cat.name)}`}
                className="group p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-300/80 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-800 group-hover:scale-110 transition-transform">
                  {cat.name === 'Coffee' ? <Coffee className="w-6 h-6" /> : <CupSoda className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 group-hover:text-amber-900">{cat.name}</h3>
                  <span className="text-[11px] text-stone-500">{cat.product_count ?? 0} drinks</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Drinks Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Popular Drinks</h2>
            <p className="text-xs text-stone-500">Café favorites ordered by our community</p>
          </div>
          <Link to="/menu" className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1">
            See full menu ({products.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {prodLoading ? (
          <Loading message="Fetching freshly brewed drinks from backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {featuredDrinks.map((drink) => (
              <ProductCard
                key={drink.id}
                product={drink}
                onSelect={(selectedProd) => setCustomizingProduct(selectedProd)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Café Experience Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center">
            <Coffee className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-stone-900">Customizable Drinks</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Adjust sweetness levels (0% to 100%), ice options, and cup sizes to fit your exact taste.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-stone-900">Seamless Local Payments</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Real-time dual currency display (USD / KHR) with ABA KHQR payment readiness.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-stone-900">Fresh Quality Guarantee</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Crafted with organic tea leaves, high-altitude coffee beans, and real tropical fruit purées.
          </p>
        </div>
      </section>

      {/* Customization Modal */}
      <CustomizationModal
        product={customizingProduct}
        isOpen={!!customizingProduct}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};
