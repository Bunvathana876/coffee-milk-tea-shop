import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Coffee, ShoppingBag, Menu as MenuIcon, X, Sparkles } from 'lucide-react';
import { useCart } from '../../features/cart/useCart';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalQuantity } = useCart();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Menu', path: '/menu' },
    { label: 'Cart', path: '/cart' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-amber-800 flex items-center justify-center text-amber-50 shadow-sm shadow-amber-900/20 group-hover:bg-amber-900 transition-colors">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-stone-900 tracking-tight block leading-tight">
              Brew & Boba
            </span>
            <span className="text-[11px] font-medium text-amber-800 tracking-wide flex items-center gap-1">
              Phnom Penh Café <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/60">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive(link.path)
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action: Cart Pill & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            aria-label={`Cart with ${totalQuantity} items`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 text-amber-900 hover:bg-amber-100/80 border border-amber-200/60 transition-colors text-xs font-bold"
          >
            <ShoppingBag className="w-4 h-4 text-amber-800" />
            <span className="hidden sm:inline">Cart</span>
            <span
              className={`w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold transition-all ${
                totalQuantity > 0 ? 'bg-amber-800 ring-2 ring-amber-300' : 'bg-stone-400'
              }`}
            >
              {totalQuantity}
            </span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive(link.path)
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>{link.label}</span>
              {link.path === '/cart' && totalQuantity > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] flex items-center justify-center font-bold">
                  {totalQuantity}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

