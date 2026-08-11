import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import * as productApi from '../api/productApi';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Maps productId -> live stock (or null if the product no longer exists)
  const [liveStock, setLiveStock] = useState({});
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setCheckingStock(false);
      return;
    }
    setCheckingStock(true);
    Promise.all(
      items.map((item) =>
        productApi
          .getProduct(item.productId)
          .then(({ data }) => [item.productId, data.product.stock])
          .catch(() => [item.productId, null])
      )
    )
      .then((entries) => setLiveStock(Object.fromEntries(entries)))
      .finally(() => setCheckingStock(false));
    // Re-check whenever the set of items or their quantities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => [i.productId, i.quantity]))]);

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h1>
        <p className="text-slate-500 mb-6">Add something you like from the catalog.</p>
        <Link
          to="/"
          className="inline-block px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const hasStockIssue = items.some((item) => {
    const stock = liveStock[item.productId];
    return stock === null || (stock !== undefined && item.quantity > stock);
  });

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Cart</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Subtotal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const stock = liveStock[item.productId];
              const removed = stock === null;
              const exceedsStock = !removed && stock !== undefined && item.quantity > stock;

              return (
                <tr key={item.productId}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.name}
                    {removed && (
                      <p className="text-xs font-normal text-red-600 mt-0.5">
                        No longer available — please remove
                      </p>
                    )}
                    {exceedsStock && (
                      <p className="text-xs font-normal text-red-600 mt-0.5">
                        Only {stock} left in stock
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">RM {item.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                      className={`w-16 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-2 ${
                        exceedsStock || removed
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-slate-300 focus:ring-indigo-500'
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    RM {(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        {hasStockIssue && !checkingStock && (
          <p className="text-sm text-red-600 mb-3">
            Some items in your cart exceed available stock. Adjust quantities or remove them before checking out.
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-900">
            Total: RM {totalAmount.toFixed(2)}
          </span>
          <button
            onClick={handleCheckout}
            disabled={checkingStock || hasStockIssue}
            className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checkingStock ? 'Checking stock…' : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
