import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import * as orderApi from '../api/orderApi';
import * as paymentApi from '../api/paymentApi';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      const { data: orderData } = await orderApi.createOrder(orderItems);
      const { data: sessionData } = await paymentApi.createCheckoutSession(orderData.order._id);
      clearCart();
      window.location.href = sessionData.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.productId} className="py-2.5 flex justify-between text-sm">
              <span className="text-slate-700">
                {item.name} <span className="text-slate-400">x {item.quantity}</span>
              </span>
              <span className="font-medium text-slate-900">
                RM {(item.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-xl font-bold text-slate-900">RM {totalAmount.toFixed(2)}</span>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading}
          className="mt-5 w-full py-2.5 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Redirecting to Stripe…' : 'Pay with Stripe'}
        </button>
      </div>
    </div>
  );
}
