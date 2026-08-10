import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import * as orderApi from '../api/orderApi';
import * as paymentApi from '../api/paymentApi';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    navigate('/cart');
    return null;
  }

  return (
    <div>
      <h1>Checkout</h1>
      <ul>
        {items.map((item) => (
          <li key={item.productId}>
            {item.name} x {item.quantity} — RM {(item.price * item.quantity).toFixed(2)}
          </li>
        ))}
      </ul>
      <h2>Total: RM {totalAmount.toFixed(2)}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handlePay} disabled={loading}>
        {loading ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
      </button>
    </div>
  );
}
