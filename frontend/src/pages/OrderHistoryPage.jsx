import { useEffect, useState } from 'react';
import * as orderApi from '../api/orderApi';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then(({ data }) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading orders...</p>;
  if (orders.length === 0) return <p>You have no orders yet.</p>;

  return (
    <div>
      <h1>My Orders</h1>
      {orders.map((order) => (
        <div key={order._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <p>Order ID: {order._id}</p>
          <p>Status: {order.status}</p>
          <p>Total: RM {order.totalAmount.toFixed(2)}</p>
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
                {item.product?.name || 'Product'} x {item.quantity} — RM{' '}
                {(item.priceAtPurchase * item.quantity).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
