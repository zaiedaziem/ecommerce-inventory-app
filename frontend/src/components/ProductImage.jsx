function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Shows the product photo, or a gradient placeholder with the product's initials.
// `className` sets the size/shape of the box; `textClassName` sizes the initials.
export default function ProductImage({ product, className = '', textClassName = 'text-3xl' }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        className={`object-cover bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center ${className}`}
    >
      <span className={`text-white font-bold opacity-90 ${textClassName}`}>
        {initials(product.name)}
      </span>
    </div>
  );
}
