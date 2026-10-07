import React from 'react';
import { Plus, Coffee } from 'lucide-react';
import type { Product } from '../../types';
import { formatUsd, formatKhr } from '../../config/currency';

export interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  return (
    <div
      onClick={() => onSelect && onSelect(product)}
      className="group bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:border-amber-300/80"
    >
      {/* Product Image Section */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
            <Coffee className="w-12 h-12" />
          </div>
        )}

        {/* Category Pill Tag */}
        {product.category_name && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-amber-900 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs border border-white/60">
            {product.category_name}
          </span>
        )}

        {/* Availability Badge */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-stone-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-amber-900 transition-colors line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing & Order Action */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-amber-950">
              {formatUsd(product.base_price_usd)}
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              {formatKhr(product.base_price_usd)}
            </div>
          </div>

          <button
            type="button"
            disabled={!product.is_available}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect(product);
            }}
            className="w-9 h-9 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white flex items-center justify-center shadow-sm shadow-amber-900/20 active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Customize and order drink"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

