import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, CupSoda, CheckCircle2 } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { CustomizationModal } from '../components/product/CustomizationModal';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useCart } from '../features/cart/useCart';
import type { Product, DrinkCustomization } from '../types';

export const MenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { addItem } = useCart();
  const { categories, loading: catLoading } = useCategories();
  
  const { products, loading: prodLoading, error, refetch } = useProducts({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    search: searchQuery || undefined,
    isAvailable: true,
  });

  const handleCategoryClick = (catName: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (catName === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', catName);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

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
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-800 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white p-1 ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">Café Drink Menu</h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Handcrafted specialty espresso drinks, milk teas, and real fruit blends
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search drinks (e.g. latte, boba)..."
            className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-colors"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategoryClick('All')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-amber-900 text-white shadow-sm shadow-amber-950/20'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
          }`}
        >
          All Drinks
        </button>

        {!catLoading &&
          categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-amber-900 text-white shadow-sm shadow-amber-950/20'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              {cat.name}
              {cat.product_count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
                      ? 'bg-amber-800 text-amber-200'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {cat.product_count}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* Product List Content */}
      {prodLoading ? (
        <Loading message="Loading drinks catalog..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : products.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-stone-200 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
            <CupSoda className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-base">No drinks found</h3>
          <p className="text-xs text-stone-500">
            We couldn't find any drinks matching "{searchInput || selectedCategory}". Try clearing your filters or searching for something else.
          </p>
          <button
            onClick={() => {
              handleCategoryClick('All');
              handleClearSearch();
            }}
            className="text-xs font-bold text-amber-800 hover:underline cursor-pointer pt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Showing <strong>{products.length}</strong> available drinks</span>
            {selectedCategory !== 'All' && (
              <span className="font-medium text-amber-800">Filtered by: {selectedCategory}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(selectedProd) => setCustomizingProduct(selectedProd)}
              />
            ))}
          </div>
        </div>
      )}

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
