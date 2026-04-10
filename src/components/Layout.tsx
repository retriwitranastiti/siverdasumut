import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { logoutUser } from '../firebase';
import { LogOut, FileText, CheckSquare, Database, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) {
    return <Outlet />;
  }

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const getRoleColor = () => {
    return 'bg-slate-900';
  };

  const getNavLinks = () => {
    const links: any[] = [];

    if (currentUser.role === 'pengusul') {
      links.unshift({ path: '/pengusul', label: 'Kelola Usulan', icon: <FileText className="w-4 h-4 mr-2" /> });
    } else if (currentUser.role === 'verifikator') {
      links.unshift({ path: '/verifikator', label: 'Review Usulan', icon: <CheckSquare className="w-4 h-4 mr-2" /> });
    } else if (currentUser.role === 'bapperida') {
      links.unshift({ path: '/bapperida', label: 'Dashboard Bapperida', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> });
    }
    return links;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className={`${getRoleColor()} text-white shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="font-bold text-xl tracking-tight">SIVERDA-SUMUT</span>
              <span className="ml-4 px-2 py-1 bg-white/20 rounded-md text-sm font-medium capitalize">
                {currentUser.role}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">{currentUser.name}</span>
              <button 
                onClick={handleLogout}
                className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <aside className="w-64 pr-8 hidden md:block">
          <nav className="space-y-2">
            {getNavLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path 
                    ? `${getRoleColor()} text-white` 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
