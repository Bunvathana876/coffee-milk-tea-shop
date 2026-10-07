import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-16 text-center space-y-4 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
        <Coffee className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-stone-900">404</h1>
      <h2 className="text-lg font-bold text-stone-800">Page Not Found</h2>
      <p className="text-xs text-stone-500">
        The drink or page you are looking for does not exist or has been moved.
      </p>
      <div className="pt-2">
        <Link to="/">
          <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

