import { NavLink, Outlet } from 'react-router-dom';

const tabClass = ({ isActive }) =>
  `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function AdminLayout() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 bg-white border border-slate-200 rounded-lg p-1.5 w-fit shadow-sm">
        <NavLink to="/admin/products" className={tabClass}>
          Products
        </NavLink>
        <NavLink to="/admin/categories" className={tabClass}>
          Categories
        </NavLink>
        <NavLink to="/admin/orders" className={tabClass}>
          Orders
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
