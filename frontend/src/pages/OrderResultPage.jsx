import { Link, useSearchParams } from 'react-router-dom';

export default function OrderResultPage({ status }) {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const isSuccess = status === 'success';

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div
        className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl ${
          isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
        }`}
      >
        {isSuccess ? '✓' : '✕'}
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mt-4">
        {isSuccess ? 'Payment Successful' : 'Payment Cancelled'}
      </h1>

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
