import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as productApi from '../api/productApi';
import { useCart } from '../context/CartContext';

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

  if (error) return <p>{error}</p>;
  if (!product) return <p>Loading...</p>;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>RM {product.price.toFixed(2)}</p>
      <p>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>

      {product.stock > 0 && (
        <div>
          <label>
            Quantity:{' '}
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <button onClick={handleAddToCart}>Add to Cart</button>
        </div>
      )}
    </div>
  );
}
