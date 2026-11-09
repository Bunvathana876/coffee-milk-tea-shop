import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';
import { Reveal } from '../components/common/Reveal';

export function AboutPage() {
  return (
    <div className="retro-home about-page">
      {/* Section A — Cinematic Hero */}
      <section className="cafe-hero about-hero" aria-labelledby="about-hero-title">
        <img
          className="cafe-hero-photo about-hero-photo"
          src="/images/cafe-1800.webp"
          srcSet="/images/cafe-640.webp 640w, /images/cafe-1200.webp 1200w, /images/cafe-1800.webp 1800w"
          sizes="100vw"
          width="1800"
          height="1190"
          alt="Warm and inviting café interior with amber pendant lights"
          fetchPriority="high"
        />
        <div className="cafe-hero-shade about-hero-shade" />
        <div className="cafe-hero-content cafe-container">
          <p className="eyebrow hero-enter">
            Coffee, milk tea &amp; a place to pause
          </p>
          <h1 id="about-hero-title" className="hero-title">
            <span>Two drink cultures.</span>
            <span>
              One happy <em>place.</em>
            </span>
          </h1>
          <p className="hero-description hero-enter">
            Brew &amp; Boba brings specialty coffee and handcrafted milk tea together
            in one warm neighborhood café. Come for a drink made your way, and stay
            for the easygoing atmosphere.
          </p>
          <div className="hero-actions hero-enter">
            <a href="#story" className="cafe-button cafe-button-gold">
              Our Story <ArrowDown size={19} />
            </a>
            <Link to="/menu" className="cafe-button cafe-button-light">
              Explore Menu <ArrowUpRight size={19} />
            </Link>
          </div>
          <a href="#story" className="hero-scroll">
            <span>Read our story</span>
            <ArrowDown size={18} />
          </a>
        </div>
        <div className="hero-stamp about-hero-stamp" aria-hidden="true">
          <span>Crafted with heart</span>
          <Coffee size={38} strokeWidth={1.4} />
          <strong>
            Every cup
            <br />
            counts.
          </strong>
          <span>Brew &amp; Boba Café</span>
        </div>
        <span className="hero-edition" aria-hidden="true">
          The everyday ritual / Brew &amp; Boba
        </span>
      </section>

      {/* Section B — Our Story */}
      <section
        id="story"
        className="cafe-section about-story-section"
        aria-labelledby="story-title"
      >
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
          </Reveal>
          <Reveal className="story-copy">
            <p className="eyebrow">01 / The Story</p>
            <h2 id="story-title">
              Good Coffee.
              <br />
              <em>Better Moments.</em>
            </h2>
            <p className="about-lead">
              We started Brew &amp; Boba with a simple idea: coffee people and boba
              people should have one place they both love.
            </p>
            <p>
              So we brought the care of a specialty coffee bar together with the
              fun and creativity of a milk tea shop. We grind, pull, steep, shake,
              and cook in small batches so every order tastes fresh.
            </p>
            <p>
              Whether you are meeting a friend, opening your laptop, or taking five
              quiet minutes for yourself, you are always welcome here.
            </p>
            <div className="about-quote-box">
              <p>
                “A great café doesn't just brew drinks—it creates space for people to
                slow down, reconnect, and feel at home.”
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section C — What We Believe */}
      <section
        className="cafe-section about-values-section"
        aria-labelledby="values-title"
      >
        <div className="cafe-container">
          <Reveal>
            <div className="section-heading about-values-heading">
              <div>
                <p className="eyebrow">02 / What We Believe</p>
                <h2 id="values-title">
                  Craft In Every Cup.
                  <br />
                  <em>Care In Every Detail.</em>
                </h2>
              </div>
              <div className="section-aside">
                <p>
                  Three core commitments guide everything we roast, steep, and
                  serve across our counter every single day.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="about-values-grid">
            <Reveal className="about-value-card">
              <div className="about-value-icon about-value-icon-teal">
                <Sparkles size={26} aria-hidden="true" />
              </div>
              <span className="about-value-num">01 / Quality</span>
              <h3>Fresh Is Better</h3>
              <p>
                Quality beans, freshly steeped tea, and small-batch pearls give
                every drink the flavor and texture it deserves.
              </p>
            </Reveal>

            <Reveal className="about-value-card">
              <div className="about-value-icon about-value-icon-orange">
                <Sliders size={26} aria-hidden="true" />
              </div>
              <span className="about-value-num">02 / Choice</span>
              <h3>Your Drink, Your Way</h3>
              <p>
                Adjust the sweetness, ice, size, and toppings. We make every cup
                to order, exactly how you like it.
              </p>
            </Reveal>

            <Reveal className="about-value-card">
              <div className="about-value-icon about-value-icon-gold">
                <Users size={26} aria-hidden="true" />
              </div>
              <span className="about-value-num">03 / Community</span>
              <h3>Everyone Is Welcome</h3>
              <p>
                A comfortable café for conversation, quiet focus, and everyday
                moments—served with warmth and without the rush.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Section D — The Brew & Boba Experience */}
      <section
        className="cafe-section about-experience-section"
        aria-labelledby="experience-gallery-title"
      >
        <div className="cafe-container">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">03 / The Experience</p>
                <h2 id="experience-gallery-title">
                  The Brew &amp; Boba
                  <br />
                  <em>Experience.</em>
                </h2>
              </div>
              <div className="section-aside">
                <p>
                  From artisan coffee preparation to rich milk tea and cozy café
                  corners, here is a glimpse into our daily craft.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="about-gallery-grid">
            <Reveal className="about-gallery-item about-gallery-hero">
              <div className="about-gallery-media">
                <img
                  src="/images/slow-moments-1200.webp"
                  width="1200"
                  height="800"
                  loading="lazy"
                  alt="Cozy café table with coffee cups and French press beside a sunlit window"
                />
                <div className="about-gallery-overlay" />
              </div>
              <div className="about-gallery-caption">
                <span className="eyebrow">Cozy Café Atmosphere</span>
                <h3>The Sunlit Corner</h3>
                <p>An unhurried space to read, talk, or simply enjoy a quiet breath.</p>
              </div>
            </Reveal>

            <Reveal className="about-gallery-item about-gallery-card">
              <div className="about-gallery-media">
                <img
                  src="/images/coffee-900.webp"
                  width="900"
                  height="600"
                  loading="lazy"
                  alt="Water poured slowly through freshly ground coffee in a pour-over dripper"
                />
                <div className="about-gallery-overlay" />
              </div>
              <div className="about-gallery-caption">
                <span className="eyebrow">Coffee Preparation</span>
                <h3>Artisanal Extraction</h3>
                <p>Carefully controlled water temperature and grind precision for vibrant flavor.</p>
              </div>
            </Reveal>

            <Reveal className="about-gallery-item about-gallery-card">
              <div className="about-gallery-media">
                <img
                  src="/images/boba-900.webp"
                  width="900"
                  height="600"
                  loading="lazy"
                  alt="Creamy milk tea layered with slow-cooked brown sugar boba pearls"
                />
                <div className="about-gallery-overlay" />
              </div>
              <div className="about-gallery-caption">
                <span className="eyebrow">Milk Tea &amp; Boba</span>
                <h3>Handcrafted Boba</h3>
                <p>Freshly steeped black tea combined with chewy, caramelized pearls.</p>
              </div>
            </Reveal>

            <Reveal className="about-gallery-item about-gallery-wide">
              <div className="about-gallery-media">
                <img
                  src="/images/cafe-1200.webp"
                  width="1200"
                  height="793"
                  loading="lazy"
                  alt="Warm amber lights and vintage sign inside Brew & Boba Café"
                />
                <div className="about-gallery-overlay" />
              </div>
              <div className="about-gallery-caption">
                <span className="eyebrow">Neighborhood Warmth</span>
                <h3>A Place for Everyone</h3>
                <p>A welcoming atmosphere where coffee faithfuls and boba lovers feel equally at home.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Section E — Discover Our Menu */}
      <section className="about-cta-section" aria-labelledby="about-cta-title">
        <div className="cafe-container">
          <Reveal>
            <div className="about-cta-card">
              <div className="about-cta-decor" aria-hidden="true">
                <Sparkles size={40} />
              </div>
              <p className="eyebrow">04 / Discover Our Menu</p>
              <h2 id="about-cta-title" className="about-cta-title">
                Your Next Favorite Drink
                <br />
                <em>Is Waiting.</em>
              </h2>
              <p className="about-cta-text">
                Explore our full selection of specialty espresso, handcrafted milk
                teas, matcha lattes, and fruit smoothies. Made to order, exactly
                as you like it.
              </p>
              <div className="about-cta-buttons">
                <Link to="/menu" className="cafe-button cafe-button-gold">
                  Explore Menu <ArrowRight size={19} />
                </Link>
                <Link to="/" className="cafe-button cafe-button-light">
                  Back to Home <ArrowUpRight size={19} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
