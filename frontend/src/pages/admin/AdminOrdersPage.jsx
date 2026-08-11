import { useEffect, useState } from 'react';
import * as orderApi from '../../api/orderApi';

const STATUS_OPTIONS = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    return orderApi
      .getAllOrders()
      .then(({ data }) => setOrders(data.orders))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);
    setError('');
    try {
      await orderApi.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading orders…</p>;
  }

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-slate-400 font-mono">{order._id}</p>
                <p className="text-sm text-slate-700 mt-0.5">
                  {order.user?.name} <span className="text-slate-400">({order.user?.email})</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                    STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {order.status}
                </span>
                <select
                  value={order.status}
                  disabled={updatingId === order._id}
                  onChange={(e) => handleStatusChange(order._id, e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
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
