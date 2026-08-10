import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div>
        <h1>Cart</h1>
        <p>
          Your cart is empty. <Link to="/">Browse products</Link>
        </p>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div>
      <h1>Cart</h1>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>RM {item.price.toFixed(2)}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                  style={{ width: '4rem' }}
                />
              </td>
              <td>RM {(item.price * item.quantity).toFixed(2)}</td>
              <td>
                <button onClick={() => removeFromCart(item.productId)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Total: RM {totalAmount.toFixed(2)}</h2>
      <button onClick={handleCheckout}>Proceed to Checkout</button>
    </div>
  );
}
