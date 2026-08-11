import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as productApi from '../api/productApi';
import { useCart } from '../context/CartContext';

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    productApi
      .getProduct(id)
      .then(({ data }) => setProduct(data.product))
      .catch(() => setError('Product not found'));
  }, [id]);

  if (error) {
    return <p className="text-red-600 text-center py-16">{error}</p>;
  }
  if (!product) {
    return <p className="text-slate-500 text-center py-16">Loading…</p>;
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        &larr; Back to products
      </Link>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="h-64 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <span className="text-white text-6xl font-bold opacity-90">{initials(product.name)}</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-slate-500 mt-2">{product.description}</p>
          <p className="text-3xl font-bold text-slate-900 mt-4">RM {product.price.toFixed(2)}</p>
          <span
            className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
              product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>

          {product.stock > 0 && (
            <div className="mt-6 flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Quantity
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="ml-2 w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <button
                onClick={handleAddToCart}
                className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
