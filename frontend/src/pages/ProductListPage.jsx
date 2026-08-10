import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productApi from '../api/productApi';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    productApi
      .getAllProducts()
      .then(({ data }) => setProducts(data.products))
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Products</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {products.map((product) => (
          <Link
            key={product._id}
            to={`/products/${product._id}`}
            style={{ border: '1px solid #ccc', padding: '1rem', textDecoration: 'none', color: 'inherit' }}
          >
            <h3>{product.name}</h3>
            <p>RM {product.price.toFixed(2)}</p>
            <p>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
