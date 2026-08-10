import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Products</Link>
      <Link to="/cart">Cart ({cartCount})</Link>
      {user ? (
        <>
          <Link to="/orders">My Orders</Link>
          <span style={{ marginLeft: 'auto' }}>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <span style={{ marginLeft: 'auto' }}>
          <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
        </span>
      )}
    </nav>
  );
}
