import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col font-sans print:bg-white print:text-black antialiased selection:bg-caramel-soft/40 selection:text-espresso-dark">
      <div className="site-header-wrap print:hidden">
        <Navbar />
      </div>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className={
          pathname === '/' || pathname === '/about'
            ? 'home-main'
            : 'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 print:p-0 print:max-w-none'
        }
      >
        <Suspense
          fallback={
            <div className="cafe-empty" role="status">
              Preparing your next cup…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};
