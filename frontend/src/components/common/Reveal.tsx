import { useEffect, useRef, type ReactNode } from 'react';

/** Content stays visible when observation or motion is unavailable. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.reveal = 'visible';
          observer.unobserve(element);
        }
      },
      { threshold: 0.06 },
    );
    const reveal = () => {
      if (preference.matches) {
        element.dataset.reveal = 'visible';
        observer.disconnect();
      }
    };
    if (!preference.matches) {
      element.dataset.reveal = 'waiting';
      observer.observe(element);
    }
    preference.addEventListener('change', reveal);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', reveal);
      delete element.dataset.reveal;
    };
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
