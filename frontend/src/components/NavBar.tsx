import { NavLink } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-5xl mx-auto flex items-center gap-6 h-14">
        <span className="font-bold text-gray-900 text-lg">🧾 영수증 관리</span>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`
          }
        >
          대시보드
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`
          }
        >
          업로드
        </NavLink>
      </div>
    </nav>
  );
}
