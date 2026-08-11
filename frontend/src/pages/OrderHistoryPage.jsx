import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as orderApi from '../api/orderApi';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then(({ data }) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-500 text-center py-16">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No orders yet</h1>
        <p className="text-slate-500 mb-6">Once you check out, your orders will show up here.</p>
        <Link
          to="/"
          className="inline-block px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs text-slate-400 font-mono">{order._id}</span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                  STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {order.status}
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {order.items.map((item, i) => (
                <li key={i} className="py-2 flex justify-between text-sm">
                  <span className="text-slate-700">
                    {item.product?.name || 'Product'} <span className="text-slate-400">x {item.quantity}</span>
                  </span>
                  <span className="font-medium text-slate-900">
                    RM {(item.priceAtPurchase * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
              <span className="text-sm font-semibold text-slate-900">Total</span>
              <span className="text-sm font-bold text-slate-900">RM {order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
