import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { Reveal } from '../components/common/Reveal';

export function AboutPage() {
  return (
    <div className="retro-home about-page">
      {/* Section A — Illustrated About Hero (3-Column Desktop Grid) */}
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="cafe-container about-hero-container">
          <div className="about-hero-grid">
            {/* Column 1: Left — Eyebrow, Title, Description, and Actions */}
            <div className="about-hero-col about-hero-text-col hero-enter">
              <div className="menu-hero-eyebrow">
                <img
                  src="/brand/hero-fusion-cup.png"
                  alt=""
                  aria-hidden="true"
                  width="18"
                  height="18"
                  className="w-4.5 h-4.5 object-contain"
                />
                <span>Our Philosophy · Brew &amp; Boba Café</span>
              </div>
              <h1 id="about-hero-title" className="about-hero-title">
                A Little Coffee.
                <br />
                A Lot of <em>Heart.</em>
              </h1>
              <p className="hero-description">
                More than a drink, it's the small moments worth sharing.
              </p>
              <div className="hero-actions">
                <Link to="/menu" className="cafe-button cafe-button-gold">
                  Explore Our Menu <ArrowRight size={17} />
                </Link>
                <a href="#story" className="cafe-button cafe-button-light">
                  Our Story <ArrowDown size={17} />
                </a>
              </div>
            </div>

            {/* Column 2: Center — Large hand-drawn café-team illustration */}
            <div className="about-hero-col about-hero-illustration-col hero-enter">
              <div className="about-hero-illustration-wrap">
                <img
                  src="/brand/about-cafe-team.webp"
                  alt="Illustration of a café team preparing coffee together"
                  width={1084}
                  height={826}
                  className="about-hero-illustration"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>

            {/* Column 3: Right — Tall cobalt-blue storytelling panel */}
            <div className="about-hero-col about-hero-card-col hero-enter">
              <div
                className="about-hero-story-card"
                role="region"
                aria-label="About our philosophy"
              >
                <div className="about-story-card-top">
                  <div className="about-story-card-icon">
                    <img
                      src="/brand/brew-boba-cup-icon.webp"
                      alt="Brew & Boba cup"
                      width="36"
                      height="36"
                      className="w-9 h-9 object-contain"
                    />
                  </div>
                  <span className="about-story-card-tag">Two Worlds, One Cup</span>
                </div>

                <div className="about-story-card-content">
                  <h2 className="about-story-card-title">
                    GOOD DRINKS.
                    <br />
                    <em>BETTER MOMENTS.</em>
                  </h2>

                  <p className="about-story-card-body">
                    Coffee brings comfort. Boba adds a little fun. At Brew &amp; Boba, we bring
                    both together so you can find your favorite drink, customize it your way,
                    and enjoy the little moments in between.
                  </p>
                </div>

                <div className="about-story-card-footer">
                  <span className="about-story-card-pace">YOUR CUP. YOUR PACE.</span>
                  <div className="about-story-card-accent" aria-hidden="true">
                    <img
                      src="/brand/brew-boba-cup-badge.webp"
                      alt=""
                      width="32"
                      height="32"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section B — Our Story */}
      <section
        id="story"
        className="cafe-section about-story-section"
        aria-labelledby="story-title"
      >
        <div className="cafe-container story-grid">
          <Reveal className="story-visual">
            {/* Butter-yellow organic backdrop shape */}
            <div className="story-image-backdrop" aria-hidden="true" />

            {/* Arched café-team illustration frame */}
            <div className="story-image-frame">
              <img
                src="/brand/about-story-team.webp"
                width="896"
                height="1100"
                loading="lazy"
                alt="Illustration of Brew & Boba café team preparing coffee and boba drinks together"
                className="story-team-illustration"
              />
            </div>

            {/* Circular mascot outline badge overlapping bottom-right corner */}
            <div className="story-seal" aria-hidden="true">
              <img
                src="/brand/brew-boba-outline-badge.webp"
                alt="Brew & Boba outline badge"
                width="110"
                height="110"
                className="w-20 h-20 object-contain"
              />
            </div>

            {/* Small cobalt decorative marks at top-right of arch */}
            <svg
              className="story-arch-spark"
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
            >
              <line x1="8" y1="26" x2="3" y2="31" stroke="#1345A3" strokeWidth="3" strokeLinecap="round" />
              <line x1="20" y1="12" x2="20" y2="4" stroke="#1345A3" strokeWidth="3" strokeLinecap="round" />
              <line x1="30" y1="22" x2="35" y2="25" stroke="#1345A3" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </Reveal>

          <Reveal className="story-copy">
            {/* Small rounded 01 / OUR STORY label */}
            <div className="story-eyebrow-pill">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1345A3"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" />
                <line x1="10" y1="2" x2="10" y2="4" />
                <line x1="14" y1="2" x2="14" y2="4" />
              </svg>
              <span>01 / OUR STORY</span>
            </div>

            {/* Large Heading: Good Coffee. Better Moments. with butter underline & spark */}
            <div className="story-heading-wrap">
              <h2 id="story-title" className="story-heading">
                <span className="story-heading-line1">Good Coffee.</span>
                <span className="story-heading-line2">
                  <em>Better Moments.</em>
                  {/* Butter-yellow curved underline accent */}
                  <svg
                    className="story-heading-underline"
                    viewBox="0 0 240 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M4 10C55 3 180 2 236 8C195 12 75 13 4 10Z" fill="#F5E4AD" />
                  </svg>
                  {/* Small cobalt radiating spark marks */}
                  <svg
                    className="story-heading-spark"
                    width="26"
                    height="26"
                    viewBox="0 0 26 26"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line x1="4" y1="16" x2="1" y2="20" stroke="#1345A3" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="13" y1="8" x2="13" y2="3" stroke="#1345A3" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="20" y1="14" x2="25" y2="17" stroke="#1345A3" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>
            </div>

            {/* Short readable storytelling paragraphs */}
            <p className="story-lead">
              Brew &amp; Boba brings coffee and boba together in one happy place. Whether you're starting your morning or taking an afternoon break, there's always a reason to enjoy a little something special.
            </p>
            <p className="story-sub">
              We pull fresh espresso, blend fragrant matcha, and prepare brown sugar boba in small batches daily. Every drink is handcrafted to your taste—fresh, balanced, and made with heart.
            </p>

            {/* Horizontal row of three illustrated features */}
            <div className="story-features-row">
              <div className="story-feature-card">
                <div className="story-feature-icon">
                  <img
                    src="/brand/about-story-coffee.webp"
                    alt=""
                    aria-hidden="true"
                    width="44"
                    height="44"
                    loading="lazy"
                    className="story-feature-img"
                  />
                </div>
                <div className="story-feature-text">
                  <strong>Specialty</strong>
                  <span>Coffee</span>
                </div>
              </div>

              <div className="story-feature-card">
                <div className="story-feature-icon">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="#1345A3"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M8 9h16l-2 17a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3L8 9Z" />
                    <path d="M6 9h20" />
                    <line x1="17" y1="2" x2="13" y2="9" />
                    <circle cx="13" cy="23" r="1.5" fill="#1345A3" />
                    <circle cx="17" cy="22" r="1.5" fill="#1345A3" />
                    <circle cx="15" cy="19" r="1.5" fill="#1345A3" />
                    <circle cx="19" cy="24" r="1.5" fill="#1345A3" />
                    <circle cx="11" cy="24" r="1.5" fill="#1345A3" />
                  </svg>
                </div>
                <div className="story-feature-text">
                  <strong>Artisanal</strong>
                  <span>Boba</span>
                </div>
              </div>

              <div className="story-feature-card">
                <div className="story-feature-icon">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="#1345A3"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 27s-10-6.5-12-13.5C2 7.5 7 3.5 12 5.5c2.5 1 4 3.5 4 3.5s1.5-2.5 4-3.5c5-2 10 2 8 8-2 7-12 13.5-12 13.5z" />
                  </svg>
                </div>
                <div className="story-feature-text">
                  <strong>Made</strong>
                  <span>With Heart</span>
                </div>
              </div>
            </div>

            {/* Warm butter-colored quote card with cobalt border accent and coffee-cup illustration */}
            <div className="about-quote-box">
              <div className="about-quote-content">
                <span className="about-quote-mark" aria-hidden="true">“</span>
                <p>
                  A great café doesn't just brew drinks—it creates space for people to slow down, reconnect, and feel at home.
                </p>
              </div>
              <div className="about-quote-illustration" aria-hidden="true">
                <img
                  src="/brand/about-story-cup.webp"
                  alt=""
                  width="88"
                  height="88"
                  loading="lazy"
                  className="about-quote-cup-img"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section C — Our Values */}
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
                  Three thoughtful commitments behind every drink we craft across our counter every single day.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="about-values-grid">
            <Reveal className="about-value-card">
              <div className="about-value-icon">
                <img
                  src="/brand/brew-boba-cup-icon.webp"
                  alt=""
                  aria-hidden="true"
                  width="36"
                  height="36"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <span className="about-value-num">01 / Quality</span>
              <h3>Made With Care</h3>
              <p>
                A thoughtful drink experience, one cup at a time. Quality coffee, fragrant tea leaves, and freshly prepared boba.
              </p>
            </Reveal>

            <Reveal className="about-value-card">
              <div className="about-value-icon">
                <img
                  src="/brand/hero-crafted-custom.png"
                  alt=""
                  aria-hidden="true"
                  width="32"
                  height="32"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="about-value-num">02 / Choice</span>
              <h3>Your Drink, Your Way</h3>
              <p>
                Choose the sweetness, ice, and size that suit you. Handcrafted to order so every single sip feels uniquely yours.
              </p>
            </Reveal>

            <Reveal className="about-value-card">
              <div className="about-value-icon">
                <img
                  src="/brand/brew-boba-mascot-badge.webp"
                  alt=""
                  aria-hidden="true"
                  width="36"
                  height="36"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <span className="about-value-num">03 / Community</span>
              <h3>Moments Worth Sharing</h3>
              <p>
                Good drinks make everyday moments a little brighter. A cozy place to pause, catch up with friends, and feel right at home.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Section D — The Brew & Boba Experience Gallery */}
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
                  From artisan coffee preparation to rich milk tea and cozy café corners, here is a glimpse into our daily craft.
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
                  alt="Water poured slowly through freshly ground coffee in a café pour-over dripper"
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
                <span className="eyebrow">Boba &amp; Milk Tea</span>
                <h3>Handcrafted Boba</h3>
                <p>Freshly steeped robust black tea combined with chewy, caramelized pearls.</p>
              </div>
            </Reveal>

            <Reveal className="about-gallery-item about-gallery-wide">
              <div className="about-gallery-media">
                <img
                  src="/images/cafe-1200.webp"
                  width="1200"
                  height="793"
                  loading="lazy"
                  alt="Warm amber lights and vintage seating inside Brew & Boba Café"
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

      {/* Section E — Final Call to Action */}
      <section className="about-cta-section" aria-labelledby="about-cta-title">
        <div className="cafe-container">
          <Reveal>
            <div className="about-cta-card">
              <div className="about-cta-decor" aria-hidden="true">
                <img
                  src="/brand/brew-boba-cup-badge.webp"
                  alt=""
                  width="80"
                  height="80"
                  className="w-20 h-20 object-contain drop-shadow-md"
                />
              </div>
              <p className="eyebrow">04 / Fresh Daily</p>
              <h2 id="about-cta-title" className="about-cta-title">
                YOUR NEXT FAVORITE SIP
                <br />
                <em>IS WAITING.</em>
              </h2>
              <p className="about-cta-text">
                Coffee, boba, and a little happiness—all in one place. Discover your next favorite drink crafted just the way you like it.
              </p>
              <div className="about-cta-buttons">
                <Link to="/menu" className="cafe-button cafe-button-gold">
                  Explore Our Menu <ArrowRight size={19} />
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
