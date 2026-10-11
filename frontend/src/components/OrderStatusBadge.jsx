const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

const REFUND_LABELS = {
  pending: { text: 'Refund processing', style: 'bg-amber-100 text-amber-700' },
  refunded: { text: 'Refunded', style: 'bg-violet-100 text-violet-700' },
  failed: { text: 'Refund failed', style: 'bg-red-600 text-white' },
};

const pill = 'text-xs font-medium px-2.5 py-1 rounded-full';

// Order status pill, plus a refund pill for cancelled orders that had been paid.
export default function OrderStatusBadge({ order }) {
  const refund = REFUND_LABELS[order.refundStatus];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${pill} capitalize ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
        {order.status}
      </span>
      {refund && <span className={`${pill} ${refund.style}`}>{refund.text}</span>}
    </span>
  );
}
