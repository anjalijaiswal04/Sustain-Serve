import { Link, useNavigate } from 'react-router-dom';
import { LogOut, HeartHandshake, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../utils/authContext';
import { Role } from '../utils/types';

function dashboardPath(role: Role): string {
  switch (role) {
    case 'donor':    return '/donor';
    case 'ngo':      return '/ngo';
    case 'delivery': return '/delivery';
    case 'admin':    return '/admin';
    default:         return '/';
  }
}

function roleLabel(role: Role): string {
  switch (role) {
    case 'donor':    return 'Donor';
    case 'ngo':      return 'NGO';
    case 'delivery': return 'Delivery Agent';
    case 'admin':    return 'Admin';
    default:         return role;
  }
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-emerald-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
              <HeartHandshake className="w-8 h-8" />
              <span>ShareFood AI</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* My Dashboard button — always takes user to their own dashboard */}
                <Link
                  to={dashboardPath(user.role)}
                  className="hidden sm:flex items-center gap-1.5 bg-white/15 hover:bg-white/25
                    px-3 py-1.5 rounded-md text-sm font-medium transition"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Dashboard
                </Link>

                {/* User info */}
                <div className="text-right hidden sm:block">
                  <p className="font-medium text-sm leading-tight">{user.name}</p>
                  <p className="text-emerald-200 text-xs">{roleLabel(user.role)}</p>
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                  {user.name.charAt(0)}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 hover:bg-emerald-700 px-2 py-1.5 rounded-md transition text-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-white text-emerald-600 px-4 py-2 rounded-md font-medium hover:bg-emerald-50 transition text-sm"
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
