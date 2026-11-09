import { useState } from 'react';
import { Heart, Plus, ArrowUpRight } from 'lucide-react';
import { useFavorites } from '../../features/favorites/useFavorites';
import { formatUsd, formatKhr } from '../../config/currency';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const canSelect = product.is_available && !!onSelect;
  const open = () => {
    if (canSelect) onSelect?.(product);
  };
  return (
    <article
      className={`drink-card ${product.is_available ? '' : 'drink-unavailable'}`}
    >
      <div className="drink-media">
        <button
          type="button"
          className="drink-image-button"
          onClick={open}
          disabled={!canSelect}
          aria-label={`View details and customize ${product.name}`}
        >
          {product.image && failedImage !== product.image ? (
            <img
              src={product.image}
              alt={product.name}
              width="600"
              height="750"
              loading="lazy"
              decoding="async"
              onError={() => setFailedImage(product.image ?? null)}
            />
          ) : (
            <span className="drink-placeholder">
              <img
                src="/brand/brew-boba-cup-icon.webp"
                alt="Brew & Boba"
                className="w-12 h-12 object-contain"
              />
              <span>Brew &amp; Boba</span>
            </span>
          )}
          <span className="drink-image-action">
            {product.is_available ? (
              <>
                Customize <ArrowUpRight size={17} />
              </>
            ) : (
              'Currently unavailable'
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={`${favorited ? 'Remove' : 'Save'} ${product.name}${favorited ? ' from favorites' : ' to favorites'}`}
          aria-pressed={favorited}
          className="drink-favorite"
        >
          <Heart size={18} className={favorited ? 'fill-rose-500 text-rose-500' : ''} />
        </button>
        {!product.is_available && (
          <span className="drink-availability drink-avail-sold">
            Sold out
          </span>
        )}
      </div>
      <div className="drink-info">
        <p className="drink-category">
          {product.category_name || product.category?.name || 'Brew & Boba'}
        </p>
        <h3>{product.name}</h3>
        {product.description && (
          <p className="drink-description">{product.description}</p>
        )}
        <div className="drink-price">
          <p>
            {formatUsd(product.base_price_usd)}
            <span>{formatKhr(product.base_price_usd)}</span>
          </p>
          <button
            type="button"
            onClick={open}
            disabled={!canSelect}
            aria-label={`Customize and add ${product.name} to cart`}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{product.is_available ? 'Customize' : 'Sold out'}</span>
            <span className="sm:hidden">{product.is_available ? 'Add' : 'Sold out'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
