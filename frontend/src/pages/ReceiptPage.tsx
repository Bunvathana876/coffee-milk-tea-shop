import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Printer } from 'lucide-react';
import { Button } from '../components/common/Button';

export const ReceiptPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">Order Placed Successfully!</h1>
          <p className="text-xs text-stone-500 font-mono">
            Order Reference: <strong className="text-stone-800">#{orderId || 'ORD-PENDING'}</strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 space-y-2">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold text-emerald-700 uppercase">Paid & Preparing</span>
          </div>
          <div className="flex justify-between">
            <span>Payment Mode:</span>
            <span className="font-medium text-stone-800">Mock ABA KHQR</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            Print Receipt
          </Button>
          <Link to="/menu" className="w-full">
            <Button variant="primary" className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
              Order Another Drink
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

