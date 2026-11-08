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
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(
    null,
  );
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
        .filter(
          (product) =>
            selectedCategory === null ||
            product.category_id === selectedCategory,
        )
        .slice(0, 4),
    [products, selectedCategory],
  );
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
    setToastMessage(
      `Added ${customization.quantity} × ${product.name} to cart`,
    );
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
          <p className="eyebrow hero-enter">
            A little brew. A little boba. A lot of joy.
          </p>
          <h1 id="hero-title" className="hero-title">
            <span>Good days</span>
            <span>start with a</span>
            <span>
              <em>great</em> cup.
            </span>
          </h1>
          <p className="hero-description hero-enter">
            For the coffee faithful. The boba curious.
            <br />
            And everyone who could use a little pause.
          </p>
          <div className="hero-actions hero-enter">
            <Link to="/menu" className="cafe-button cafe-button-gold">
              Order Now <ArrowUpRight size={19} />
            </Link>
            <a href="#drinks" className="cafe-button cafe-button-light">
              Explore Menu <ArrowRight size={19} />
            </a>
          </div>
          <a href="#drinks" className="hero-scroll">
            <span>Find your kind of cup</span>
            <ArrowDown size={18} />
          </a>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>Coffee &amp; tea</span>
          <Coffee size={38} strokeWidth={1.4} />
          <strong>
            Better
            <br />
            together.
          </strong>
          <span>Brew &amp; Boba Café</span>
        </div>
        <span className="hero-edition" aria-hidden="true">
          The everyday ritual / Brew &amp; Boba
        </span>
      </section>
      <div
        className="cafe-ribbon"
        aria-label="Coffee, milk tea, and a cup your way"
      >
        <span>Coffee with character</span>
        <Sparkles aria-hidden="true" />
        <span>Tea with a twist</span>
        <Sparkles aria-hidden="true" />
        <span>A cup your way</span>
        <Sparkles aria-hidden="true" />
      </div>
      <section
        id="drinks"
        className="cafe-section cafe-container"
        aria-labelledby="drinks-title"
      >
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
          className="cafe-filters"
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
          {categories.map((category) => (
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
            {featured.map((product) => (
              <Reveal key={product.id}>
                <ProductCard
                  product={product}
                  onSelect={setCustomizingProduct}
                />
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
          Your size. Your sweetness. Your ice. Make it yours before adding to
          cart.
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
            <span className="story-seal" aria-hidden="true">
              A little pause.
              <br />
              <Sparkles size={28} />A lovely ritual.
            </span>
          </Reveal>
          <Reveal className="story-copy">
            <p className="eyebrow">02 / Two worlds, one café</p>
            <h2 id="story-title">
              Serious about
              <br />
              your cup.
              <br />
              <em>
                Easy about
                <br />
                everything else.
              </em>
            </h2>
            <p>
              Brew &amp; Boba brings two lovely rituals to the same table: the
              familiar comfort of coffee and the playful possibilities of milk
              tea.
            </p>
            <p>
              Our idea is simple. Find something you love, make it your own, and
              give yourself a moment to enjoy it. A little less rush. A little
              more you.
            </p>
            <Link to="/menu" className="cafe-button cafe-button-dark">
              Find your ritual <ArrowUpRight size={19} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section
        className="cafe-section cafe-container"
        aria-labelledby="categories-title"
      >
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
                <span className="category-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
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
            The menu categories are being prepared.{' '}
            <Link to="/menu">Browse drinks</Link>
          </p>
        )}
      </section>
      <section
        id="visit"
        className="cafe-experience"
        aria-labelledby="experience-title"
      >
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
          <p className="eyebrow">04 / Make room for a moment</p>
          <h2 id="experience-title">
            Less scrolling.
            <br />
            <em>More sipping.</em>
          </h2>
          <p>
            The first sip. The catch-up. That tiny break between one thing and
            the next. Here’s to making the everyday feel a little more special.
          </p>
          <Link to="/menu" className="cafe-button cafe-button-cream">
            Your next cup awaits <ArrowUpRight size={19} />
          </Link>
          <span className="experience-note">
            Good company starts with a good cup.
          </span>
        </Reveal>
      </section>
      <section id="rewards" className="cafe-club cafe-container">
        <Reveal>
          <div className="club-inner">
            <Sparkles size={42} strokeWidth={1.3} aria-hidden="true" />
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
      <section
        className="cafe-section cafe-container faq-layout"
        aria-labelledby="faq-title"
      >
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
