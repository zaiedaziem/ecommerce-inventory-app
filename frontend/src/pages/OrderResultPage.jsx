import { Link, useSearchParams } from 'react-router-dom';

export default function OrderResultPage({ status }) {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div>
      <h1>{status === 'success' ? 'Payment Successful' : 'Payment Cancelled'}</h1>
      {orderId && <p>Order ID: {orderId}</p>}
      <p>
        <Link to="/orders">View my orders</Link> | <Link to="/">Continue shopping</Link>
      </p>
    </div>
  );
}
