import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, Coffee, Phone } from 'lucide-react';
import { STORES } from '../../config/stores';

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
          <Link
            to="/menu"
            className="footer-order"
            aria-label="Explore the drink menu"
          >
            <ArrowRight size={34} />
          </Link>
        </div>
        <div className="footer-grid">
          <div>
            <Link to="/" className="footer-brand">
              <Coffee size={25} strokeWidth={1.5} />
              Brew &amp; Boba
            </Link>
            <p>Coffee, tea, and a little everyday joy.</p>
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
            <span>Let’s talk over a cup.</span>
            <a href={`tel:${STORES[0].phone.replace(/[^+\d]/g, '')}`}>
              <Phone size={15} />
              Call the café
            </a>
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
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                  .matches
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
