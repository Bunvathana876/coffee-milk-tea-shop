import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, Sparkles } from 'lucide-react';

const COPYRIGHT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="cafe-footer">
      <div className="cafe-container">
        <div className="footer-invitation">
          <p>
            One more good thing
            <br />
            <em>to look forward to.</em>
          </p>
          <Link to="/menu" className="footer-order" aria-label="Explore the drink menu">
            <ArrowRight size={34} />
          </Link>
        </div>
        <div className="footer-grid">
          <div>
            <Link to="/" className="footer-brand group">
              <span className="footer-brand-badge">
                <img
                  src="/brand/brew-boba-mascot-badge.webp"
                  alt="Brew & Boba Mascot Badge"
                  width="44"
                  height="44"
                  className="w-11 h-11 object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
                />
              </span>
              <span>Brew &amp; Boba</span>
            </Link>
            <p>Coffee, boba, and all the little moments in between.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link to="/menu">Menu</Link>
            <Link to="/about">About Us</Link>
            <Link to="/orders">Your orders</Link>
          </nav>
          <nav aria-label="Your café account">
            <Link to="/profile">Your profile</Link>
            <Link to="/rewards">Brew Club</Link>
            <Link to="/menu?category=Favorites">Saved drinks</Link>
          </nav>
          <div className="footer-contact">
            <span>Everyday coffee &amp; boba rituals.</span>
            <Link to="/about">
              <Sparkles size={15} />
              Our story
            </Link>
            <Link to="/#mobile-app">Order from your phone</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {COPYRIGHT_YEAR} Brew &amp; Boba Café</span>
          <span>Made for your daily pause.</span>
          <a
            href="#main-content"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              })
            }
          >
            Back to top <ArrowUp size={15} />
          </a>
        </div>
      </div>
    </footer>
  );
}
