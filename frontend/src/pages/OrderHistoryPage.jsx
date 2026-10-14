import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as orderApi from '../api/orderApi';
import OrderStatusBadge from '../components/OrderStatusBadge';

const STATUS_HINTS = {
  pending: 'Awaiting payment. Unpaid orders are cancelled automatically after an hour.',
  paid: 'Payment received. We are preparing your order for shipping.',
  shipped: 'On its way. Confirm once it arrives.',
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then(({ data }) => setOrders(data.orders))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  // The response isn't populated with product names, so only status fields are merged in.
  const handleReceive = async (order) => {
    if (!window.confirm('Confirm you have received this order?')) return;
    setUpdatingId(order._id);
    setError('');
    try {
      const { data } = await orderApi.receiveOrder(order._id);
      const { status, deliveredAt } = data.order;
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status, deliveredAt } : o)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

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
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="space-y-4">
        {orders.map((order) => {
          const busy = updatingId === order._id;
          const hint = STATUS_HINTS[order.status];

          return (
            <div key={order._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs text-slate-400 font-mono">{order._id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Placed {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <OrderStatusBadge order={order} />
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

              {hint && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{hint}</p>
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => handleReceive(order)}
                      disabled={busy}
                      className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      {busy ? 'Updating…' : 'Order received'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
