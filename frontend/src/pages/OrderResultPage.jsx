import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as paymentApi from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';

const RESULTS = {
  checking: { icon: '…', tone: 'bg-slate-100 text-slate-500', title: 'Confirming payment…' },
  paid: { icon: '✓', tone: 'bg-emerald-100 text-emerald-600', title: 'Payment Successful' },
  processing: {
    icon: '⏳',
    tone: 'bg-amber-100 text-amber-600',
    title: 'Payment Processing',
    detail: "We haven't received confirmation from Stripe yet. Your order will update automatically.",
  },
  cancelled: { icon: '✕', tone: 'bg-red-100 text-red-600', title: 'Payment Cancelled' },
};

export default function OrderResultPage({ status }) {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user } = useAuth();
  const isSuccess = status === 'success';
  const [result, setResult] = useState(isSuccess ? 'checking' : 'cancelled');

  // Returning from Stripe's success page only means the customer finished checkout, so ask the
  // backend to confirm the payment with Stripe rather than assuming it went through.
  useEffect(() => {
    if (!isSuccess) return;
    if (!orderId || !user) {
      setResult('processing');
      return;
    }
    paymentApi
      .verifyPayment(orderId)
      .then(({ data }) => setResult(data.order.status === 'pending' ? 'processing' : 'paid'))
      .catch(() => setResult('processing'));
  }, [isSuccess, orderId, user]);

  const view = RESULTS[result];

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div
        className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl ${view.tone}`}
      >
        {view.icon}
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mt-4">{view.title}</h1>
      {view.detail && <p className="text-sm text-slate-500 mt-2">{view.detail}</p>}

      {orderId && (
        <p className="text-sm text-slate-500 mt-2 font-mono break-all">Order ID: {orderId}</p>
      )}

      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <Link to="/orders" className="text-indigo-600 font-medium hover:underline">
          View my orders
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/" className="text-indigo-600 font-medium hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
