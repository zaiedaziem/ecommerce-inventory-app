const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrderStatusBadge({ order }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
        STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {order.status}
    </span>
  );
}
