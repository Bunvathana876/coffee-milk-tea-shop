import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Coffee,
  CupSoda,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { ProductCard } from '../components/product/ProductCard';
import { CustomizationModal } from '../components/product/CustomizationModal';
import { ProductGridSkeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Reveal } from '../components/common/Reveal';
import { MobileAppSection } from '../components/home/MobileAppSection';
import { useCart } from '../features/cart/useCart';
import { useAuth } from '../features/auth/AuthContext';
import type { Product, DrinkCustomization } from '../types';

const FAQS = [
  [
    'Can I make a drink my own?',
    'Absolutely. Open a drink to choose your size, sweetness, ice and available toppings. Your price updates as you customize, before you add it to your cart.',
  ],
  [
    'How do I place an order?',
    'Choose your drinks, check your cart, then sign in or create an account at checkout. Review your details and payment choice before placing your order.',
  ],
  [
    'Can I see prices in riel?',
    'Yes. Drink cards and checkout show USD prices alongside their KHR equivalents. The final order total is calculated by the café server.',
  ],
  [
    'Where can I find my order?',
    'Sign in and open Orders to find orders linked to your account. Open a receipt to review its details and refresh its status.',
  ],
  [
    'Does the KHQR code take a real payment?',
    'The current KHQR experience is a demo and has no banking connection. Scanning it does not confirm payment. Your receipt shows the payment status recorded by the server.',
  ],
];

export function HomePage() {
  const { addItem } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { products, loading, error, refetch } = useProducts();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: retryCategories,
  } = useCategories();
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const featured = useMemo(
    () =>
      products
        .filter(product => selectedCategory === null || product.category_id === selectedCategory)
        .slice(0, 4),
    [products, selectedCategory],
  );
  const handleAddToCart = (product: Product, customization: DrinkCustomization) => {
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
    setToastMessage(`Added ${customization.quantity} × ${product.name} to cart`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="retro-home">
      {toastMessage && (
        <div role="status" className="cafe-toast">
          <Check size={20} />
          <span>{toastMessage}</span>
          <Link to="/cart">View cart</Link>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToastMessage(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <section className="cafe-hero" aria-labelledby="hero-title">
        <img
          className="cafe-hero-photo"
          src="/images/cafe-1800.webp"
          srcSet="/images/cafe-640.webp 640w, /images/cafe-1200.webp 1200w, /images/cafe-1800.webp 1800w"
          sizes="100vw"
          width="1800"
          height="1190"
          alt="Warm pendant lights and a vintage café sign"
          fetchPriority="high"
        />
        <div className="cafe-hero-shade" />
        <div className="cafe-hero-content cafe-container">
          <div className="hero-text-col">
            <div className="hero-eyebrow-wrap hero-enter">
              <p className="eyebrow hero-eyebrow">
                <img
                  src="/brand/hero-fusion-cup.png"
                  alt=""
                  aria-hidden="true"
                  width="22"
                  height="22"
                  className="hero-badge-icon"
                />
                <span>Specialty Coffee &amp; Artisanal Boba · Two Worlds, One Cup</span>
              </p>
            </div>
            <h1 id="hero-title" className="hero-title">
              <span className="hero-title-line">Good drinks.</span>
              <span className="hero-title-line">
                <em>Good days.</em>
              </span>
            </h1>
            <p className="hero-description hero-enter">
              Coffee, boba, and all the little moments in between.
            </p>
            <div className="hero-actions hero-enter">
              <Link to="/menu" className="cafe-button cafe-button-dark hero-btn-menu">
                <span>Explore Menu</span>
                <ArrowUpRight size={19} />
              </Link>
              <Link to="/about" className="cafe-button cafe-button-light hero-btn-story">
                <span>Our Story</span>
                <ArrowRight size={19} />
              </Link>
            </div>
            <a href="#drinks" className="hero-scroll">
              <span>Find your kind of cup</span>
              <ArrowDown size={18} />
            </a>
          </div>

          <div className="hero-artwork-col">
            <div className="hero-mascot-card">
              <div className="hero-mascot-halo" aria-hidden="true" />
              <div className="hero-floating-pill hero-floating-pill-left" aria-hidden="true">
                <img
                  src="/brand/hero-crafted-custom.png"
                  alt=""
                  aria-hidden="true"
                  width="22"
                  height="22"
                  className="hero-pill-icon"
                />
                <span>Crafted Your Way</span>
              </div>
              <div className="hero-floating-pill hero-floating-pill-right" aria-hidden="true">
                <img
                  src="/brand/brew-boba-cup-icon.webp"
                  alt=""
                  width="18"
                  height="18"
                  className="w-4.5 h-4.5 object-contain inline-block mr-1"
                />
                <span>Specialty Coffee &amp; Boba</span>
              </div>
              <img
                src="/brand/brew-boba-primary.webp"
                alt="Brew & Boba boy mascot holding a fresh drink"
                width="480"
                height="480"
                className="hero-mascot-img animate-float"
                fetchPriority="high"
              />
              <div className="hero-stamp" aria-hidden="true">
                <span>Crafted For You</span>
                <img
                  src="/brand/brew-boba-cup-icon.webp"
                  alt=""
                  width="28"
                  height="28"
                  className="w-7 h-7 object-contain drop-shadow"
                />
                <strong>
                  Better
                  <br />
                  Together.
                </strong>
                <span>Brew &amp; Boba</span>
              </div>
            </div>
          </div>
        </div>
        <span className="hero-edition" aria-hidden="true">
          The everyday ritual / Brew &amp; Boba
        </span>
      </section>
      <div className="cafe-ribbon" aria-label="Coffee, milk tea, and a cup your way">
        <div className="marquee-container" aria-hidden="true">
          <div className="marquee-content">
            <span>Brewed with Love</span>
            <Sparkles size={16} />
            <span>Boba Makes It Better</span>
            <Sparkles size={16} />
            <span>Sip Something Good</span>
            <Sparkles size={16} />
            <span>Two Worlds, One Happy Cup</span>
            <Sparkles size={16} />
            <span>Brewed with Love</span>
            <Sparkles size={16} />
            <span>Boba Makes It Better</span>
            <Sparkles size={16} />
            <span>Sip Something Good</span>
            <Sparkles size={16} />
            <span>Two Worlds, One Happy Cup</span>
            <Sparkles size={16} />
          </div>
          <div className="marquee-content">
            <span>Brewed with Love</span>
            <Sparkles size={16} />
            <span>Boba Makes It Better</span>
            <Sparkles size={16} />
            <span>Sip Something Good</span>
            <Sparkles size={16} />
            <span>Two Worlds, One Happy Cup</span>
            <Sparkles size={16} />
            <span>Brewed with Love</span>
            <Sparkles size={16} />
            <span>Boba Makes It Better</span>
            <Sparkles size={16} />
            <span>Sip Something Good</span>
            <Sparkles size={16} />
            <span>Two Worlds, One Happy Cup</span>
            <Sparkles size={16} />
          </div>
        </div>
      </div>
      <section id="drinks" className="cafe-section cafe-container" aria-labelledby="drinks-title">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / Find your new usual</p>
              <h2 id="drinks-title">
                Meet your
                <br />
                <em>next favorite.</em>
              </h2>
            </div>
            <div className="section-aside">
              <p>
                A bold brew or a sweet little escape?
                <br />
                There’s a cup with your name on it.
              </p>
              <Link className="text-link" to="/menu">
                The whole menu <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
        </Reveal>
        <div
          className="cafe-filters scrollbar-none"
          role="group"
          aria-label="Filter featured drinks"
        >
          <button
            type="button"
            aria-pressed={selectedCategory === null}
            className={selectedCategory === null ? 'is-active' : ''}
            onClick={() => setSelectedCategory(null)}
          >
            All drinks
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              className={selectedCategory === category.id ? 'is-active' : ''}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : featured.length ? (
          <div className="drink-grid">
            {featured.map(product => (
              <Reveal key={product.id}>
                <ProductCard product={product} onSelect={setCustomizingProduct} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="cafe-empty">
            <Coffee size={30} />
            <h3>No drinks in this selection yet.</h3>
            <p>Try another category or browse the full menu.</p>
            <Link to="/menu" className="text-link">
              Explore menu <ArrowRight size={18} />
            </Link>
          </div>
        )}
        <p className="menu-footnote">
          Your size. Your sweetness. Your ice. Make it yours before adding to cart.
        </p>
      </section>
      <div id="about" />
      <section id="story" className="cafe-story" aria-labelledby="story-title">
        <div className="cafe-container story-grid">
          <Reveal className="story-visual">
            <div className="story-image-frame">
              <img
                src="/images/coffee-900.webp"
                width="900"
                height="600"
                loading="lazy"
                alt="Water poured slowly through a coffee filter at a café counter"
              />
            </div>
            <div className="story-seal" aria-hidden="true">
              <img
                src="/brand/brew-boba-outline-badge.webp"
                alt="Brew & Boba outline badge"
                width="110"
                height="110"
                className="w-22 h-22 object-contain"
              />
            </div>
          </Reveal>
          <Reveal className="story-copy">
            <p className="eyebrow">02 / Two worlds, one café</p>
            <h2 id="story-title">
              Good Coffee.
              <br />
              <em>Better Moments.</em>
            </h2>
            <p>
              Brew &amp; Boba brings two lovely rituals to the same table: the familiar comfort of
              specialty coffee and the playful possibilities of handcrafted milk tea.
            </p>
            <p>
              Our idea is simple. Find something you love, make it your own, and give yourself a
              moment to enjoy it. A little less rush. A little more you.
            </p>
            <div className="story-perk-card">
              <img
                src="/brand/brew-boba-cup-badge.webp"
                alt="Brew & Boba cup badge"
                width="52"
                height="52"
                className="w-13 h-13 object-contain drop-shadow"
              />
              <div>
                <strong className="block text-ink font-bold text-sm">Made Fresh Your Way</strong>
                <p className="text-xs text-ink-soft m-0 leading-relaxed">
                  Adjust size, sweetness, ice level, and toppings for every single cup.
                </p>
              </div>
            </div>
            <Link to="/about" className="cafe-button cafe-button-dark mt-4">
              Our Story <ArrowUpRight size={19} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="cafe-section cafe-container" aria-labelledby="categories-title">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / Follow your mood</p>
              <h2 id="categories-title">
                What’s your
                <br />
                <em>cup of happy?</em>
              </h2>
            </div>
            <CupSoda
              className="category-heading-icon"
              size={88}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>
        </Reveal>
        {categoriesLoading ? (
          <p role="status" className="cafe-empty">
            Pouring the categories…
          </p>
        ) : categoriesError ? (
          <ErrorState message={categoriesError} onRetry={retryCategories} />
        ) : categories.length ? (
          <div className="category-index">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/menu?category=${encodeURIComponent(category.name)}`}
                className="category-row"
              >
                <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{category.name}</h3>
                  {category.description && <p>{category.description}</p>}
                </div>
                <ArrowUpRight size={30} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="cafe-empty">
            The menu categories are being prepared. <Link to="/menu">Browse drinks</Link>
          </p>
        )}
      </section>
      <section id="visit" className="cafe-experience" aria-labelledby="experience-title">
        <div className="experience-image">
          <img
            src="/images/slow-moments-1200.webp"
            width="1200"
            height="800"
            loading="lazy"
            alt="Coffee cups and a French press beside a leafy café window"
          />
        </div>
        <Reveal className="experience-copy">
          <p className="eyebrow">04 / Freshly Brewed Joy</p>
          <h2 id="experience-title">
            YOUR NEXT FAVORITE
            <br />
            <em>SIP IS WAITING.</em>
          </h2>
          <p>
            The first sip. The catch-up. That tiny break between one thing and the next. Here’s to
            making the everyday feel a little more special.
          </p>
          <Link to="/menu" className="cafe-button cafe-button-gold">
            Explore Our Menu <ArrowUpRight size={19} />
          </Link>
          <span className="experience-note">Good company starts with a good cup.</span>
        </Reveal>
      </section>
      <section id="rewards" className="cafe-club cafe-container">
        <Reveal>
          <div className="club-inner">
            <img
              src="/brand/brew-boba-mascot-badge.webp"
              alt="Brew Club Mascot Badge"
              width="64"
              height="64"
              className="w-16 h-16 object-contain shrink-0 drop-shadow"
            />
            <div>
              <p className="eyebrow">A little more Brew &amp; Boba</p>
              <h2>Your cup. Your club.</h2>
              <p>
                {isAuthenticated
                  ? `Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}. Your rewards and preferences are right here.`
                  : 'Keep your favorites close and your café profile in one place.'}
              </p>
            </div>
            {isAuthenticated ? (
              <Link className="cafe-button cafe-button-dark" to="/rewards">
                Your rewards <ArrowUpRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                className="cafe-button cafe-button-dark"
                onClick={openAuthModal}
              >
                Join the Brew Club <ArrowUpRight size={18} />
              </button>
            )}
          </div>
        </Reveal>
      </section>
      <section className="cafe-section cafe-container faq-layout" aria-labelledby="faq-title">
        <Reveal>
          <p className="eyebrow">05 / A few good answers</p>
          <h2 id="faq-title">
            Glad
            <br />
            <em>you asked.</em>
          </h2>
          <p className="faq-intro">A little clarity before your next cup.</p>
        </Reveal>
        <div className="cafe-faq">
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <Plus size={21} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <MobileAppSection />
      <CustomizationModal
        product={customizingProduct}
        isOpen={!!customizingProduct}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
