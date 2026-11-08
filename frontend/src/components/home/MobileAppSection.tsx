import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import { generateQrMatrix, matrixToSvgPath } from '../../utils/qrCode';

export function MobileAppSection() {
  const mobileLink = window.location.origin;
  const qr = useMemo(() => {
    try {
      const matrix = generateQrMatrix(mobileLink);
      return { path: matrixToSvgPath(matrix), size: matrix.length };
    } catch {
      return null;
    }
  }, [mobileLink]);
  return (
    <section
      id="mobile-app"
      className="mobile-web-note cafe-container"
      aria-labelledby="mobile-web-title"
    >
      <Smartphone size={27} strokeWidth={1.5} aria-hidden="true" />
      <div>
        <h2 id="mobile-web-title">Your café, wherever you are.</h2>
        <p>Browse, customize and order from this website on your phone.</p>
        <Link to="/menu" className="text-link">
          Take a look <ArrowUpRight size={18} />
        </Link>
      </div>
      {qr && (
        <a
          href={mobileLink}
          className="mobile-web-qr"
          aria-label="Open the storefront; QR code opens this website on your phone"
        >
          <svg
            viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`}
            role="img"
            aria-label="QR code for this storefront"
            width="112"
            height="112"
            shapeRendering="crispEdges"
          >
            <rect
              x="-4"
              y="-4"
              width={qr.size + 8}
              height={qr.size + 8}
              fill="white"
            />
            <path d={qr.path} fill="#191714" />
          </svg>
          <span>Scan to open this website</span>
        </a>
      )}
    </section>
  );
}
