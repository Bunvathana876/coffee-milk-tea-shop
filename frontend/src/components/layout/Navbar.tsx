import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  User,
  Search,
  Menu,
  ArrowUpRight,
} from 'lucide-react';
import { useCart } from '../../features/cart/useCart';
import { useAuth } from '../../features/auth/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ProfileModal } from '../auth/ProfileModal';
import { StoreSelectorModal } from './StoreSelectorModal';
import { STORES, type StoreLocation } from '../../config/stores';
import { SearchModal } from './SearchModal';
import { MiniCartDrawer } from './MiniCartDrawer';
import { CustomizationModal } from '../product/CustomizationModal';
import type { Product, DrinkCustomization } from '../../types';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);

  // Drink customization modal for quick search selection
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(
    null,
  );

  // Selected pickup store (defaults to BKK1 Flagship)
  const [selectedStore, setSelectedStore] = useState<StoreLocation>(() => {
    try {
      const savedId = localStorage.getItem('brew_boba_selected_store_id');
      const found = STORES.find((s) => s.id === savedId);
      return found || STORES[0];
    } catch {
      return STORES[0];
    }
  });

  const { totalQuantity, addItem } = useCart();
  const {
    user,
    isAuthenticated,
    authModalOpen,
    authModalOptions,
    openAuthModal,
    closeAuthModal,
  } = useAuth();

  useEffect(() => {
    if (mobileMenu.current) mobileMenu.current.open = false;
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const timer = setTimeout(() => {
      const hashId = location.hash.slice(1);
      const target =
        document.getElementById(hashId) ||
        (hashId === 'about' ? document.getElementById('story') : null);
      target?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [location.hash, location.pathname]);

  // Handle global keyboard shortcut ⌘K or Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectStore = (store: StoreLocation) => {
    setSelectedStore(store);
    try {
      localStorage.setItem('brew_boba_selected_store_id', store.id);
    } catch {
      // ignore
    }
  };

  const handleAddToCart = (
    product: Product,
    customization: DrinkCustomization,
  ) => {
    addItem({
      productId: product.id,
      productName: product.name,
      image: product.image,
      size: customization.size,
      sugarLevel: customization.sugar_level,
      iceLevel: customization.ice_level,
      toppings: customization.toppings || [],
      unitPriceUsd: customization.unit_price_usd,
      quantity: customization.quantity,
    });
    setCustomizingProduct(null);
    setMiniCartOpen(true);
  };

  return (
    <>
      <header className="cafe-header">
        <div className="cafe-nav-inner">
          <nav className="desktop-links" aria-label="Main navigation">
            <Link
              to="/"
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Home
            </Link>
            <Link
              to="/menu"
              aria-current={location.pathname === '/menu' ? 'page' : undefined}
            >
              Menu
            </Link>
            <Link
              to="/about"
              aria-current={
                location.pathname === '/about' ? 'page' : undefined
              }
            >
              About
            </Link>
            <Link
              to="/orders"
              aria-current={
                location.pathname === '/orders' ? 'page' : undefined
              }
            >
              Orders
            </Link>
          </nav>
          <Link
            to="/"
            className="cafe-brand group"
            aria-label="Brew & Boba Café home"
          >
            <span className="cafe-brand-badge">
              <img
                src="/brand/brew-boba-cup-icon.webp"
                alt="Brew & Boba Café cup icon"
                width="42"
                height="42"
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </span>
            <span className="cafe-brand-copy">
              <span className="cafe-brand-name">
                Brew <i>&amp;</i> Boba
              </span>
              <small>COFFEE · BOBA · YOUR DAILY PAUSE</small>
            </span>
          </Link>
          <div className="nav-controls">
            <button
              type="button"
              className="nav-icon search-trigger"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search drinks"
            >
              <Search size={19} />
            </button>
            {isAuthenticated && user ? (
              <Link
                to="/profile"
                className="nav-account"
                aria-label="Open your profile"
              >
                <User size={18} />
                <span>{user.full_name.split(' ')[0]}</span>
              </Link>
            ) : (
              <button
                type="button"
                className="nav-account"
                onClick={openAuthModal}
              >
                <User size={18} />
                <span>Log in</span>
              </button>
            )}
            <button
              type="button"
              className="nav-cart"
              onClick={() => setMiniCartOpen(true)}
              aria-label={`Open shopping cart with ${totalQuantity} items`}
            >
              <ShoppingBag size={18} />
              <span className="nav-cart-badge">{totalQuantity}</span>
            </button>
            <Link to="/menu" className="nav-order">
              Order Now <ArrowUpRight size={17} />
            </Link>
            <details
              className="mobile-menu"
              ref={mobileMenu}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && mobileMenu.current) {
                  mobileMenu.current.open = false;
                  mobileMenu.current.querySelector('summary')?.focus();
                }
              }}
            >
              <summary aria-label="Toggle navigation menu">
                <Menu size={22} />
              </summary>
              <nav
                aria-label="Mobile navigation"
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest('a') &&
                    mobileMenu.current
                  )
                    mobileMenu.current.open = false;
                }}
              >
                <div className="mobile-menu-header">
                  <div className="flex items-center gap-2">
                    <img
                      src="/brand/brew-boba-cup-icon.webp"
                      alt=""
                      width="26"
                      height="26"
                      className="w-6.5 h-6.5 object-contain"
                    />
                    <span className="font-serif font-black text-ink text-sm tracking-tight">
                      Brew &amp; Boba
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-cobalt uppercase tracking-wider bg-butter/40 px-2.5 py-0.5 rounded-full border border-butter/60">
                    Order Ahead
                  </span>
                </div>
                <div className="mobile-menu-links">
                  <Link to="/">Home</Link>
                  <Link to="/menu">Menu</Link>
                  <Link to="/about">About</Link>
                  <Link to="/orders">Orders</Link>
                  <Link to="/cart">Cart ({totalQuantity})</Link>
                  <Link to="/rewards">Rewards</Link>
                  <Link to="/profile">Profile</Link>
                </div>
                <div className="mobile-menu-actions">
                  <button
                    type="button"
                    onClick={() => {
                      if (mobileMenu.current) mobileMenu.current.open = false;
                      setStoreModalOpen(true);
                    }}
                  >
                    Pickup store
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (mobileMenu.current) mobileMenu.current.open = false;
                      setSearchModalOpen(true);
                    }}
                  >
                    Search drinks
                  </button>
                </div>
              </nav>
            </details>
          </div>
        </div>
      </header>

      {/* 4. Modals & Drawers */}
      <StoreSelectorModal
        isOpen={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        selectedStoreId={selectedStore.id}
        onSelectStore={handleSelectStore}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={(product) => setCustomizingProduct(product)}
      />

      <MiniCartDrawer
        isOpen={miniCartOpen}
        onClose={() => setMiniCartOpen(false)}
      />

      <CustomizationModal
        product={customizingProduct}
        isOpen={!!customizingProduct}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <AuthModal
        key={`${authModalOpen}-${authModalOptions.mode ?? 'login'}`}
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalOptions.mode}
        redirectTo={authModalOptions.redirectTo}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenRewards={() => navigate('/rewards')}
      />
    </>
  );
};
