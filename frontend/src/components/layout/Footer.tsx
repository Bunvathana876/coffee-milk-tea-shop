import React from 'react';
import { Coffee, MapPin, Clock, Phone, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-auto border-t border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-xl bg-amber-700 flex items-center justify-center text-white">
                <Coffee className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg">Brew & Boba Café</span>
            </div>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Handcrafted specialty coffees, slow-brewed milk teas, and fresh fruit infusions.
              Designed with love in Phnom Penh, Cambodia.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-amber-400 font-medium">
              <span>Dual Currency: USD ($) & KHR (៛)</span>
              <span>•</span>
              <span>ABA KHQR Supported</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/menu" className="hover:text-amber-400 transition-colors">Drink Menu</Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-amber-400 transition-colors">My Cart</Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-amber-400 transition-colors">Checkout</Link>
              </li>
            </ul>
          </div>

          {/* Café Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200">Café Hours & Info</h4>
            <div className="space-y-2 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Daily: 7:00 AM – 8:30 PM</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>BKK1, Phnom Penh, Cambodia</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>+855 (0) 12 345 678</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© 2026 Brew & Boba. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> using React, TypeScript & FastAPI
          </p>
        </div>

      </div>
    </footer>
  );
};
