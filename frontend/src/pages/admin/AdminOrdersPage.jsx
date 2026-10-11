import { useEffect, useState } from 'react';
import * as orderApi from '../../api/orderApi';
import OrderStatusBadge from '../../components/OrderStatusBadge';

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

  // Admins only ship paid orders; payment comes from Stripe and cancel/receive are customer actions.
  const handleShip = async (orderId) => {
    setUpdatingId(orderId);
    setError('');
    try {
      const { data } = await orderApi.shipOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: data.order.status } : o))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark order as shipped');
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
                <OrderStatusBadge order={order} />
                {order.status === 'paid' && (
                  <button
                    onClick={() => handleShip(order._id)}
                    disabled={updatingId === order._id}
                    className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {updatingId === order._id ? 'Updating…' : 'Mark as shipped'}
                  </button>
                )}
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
