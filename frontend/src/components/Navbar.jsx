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
    <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link to="/" className="text-xl font-bold text-indigo-600 tracking-tight">
          StackCart
        </Link>

        <Link to="/" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
          Products
        </Link>

        <Link
          to="/cart"
          className="relative text-slate-600 hover:text-indigo-600 transition-colors"
          aria-label="Cart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-semibold rounded-full h-4 w-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <Link to="/orders" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                My Orders
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Admin
                </Link>
              )}
              <span className="hidden sm:inline text-sm text-slate-500">
                {user.name}{' '}
                <span className="ml-1 inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
