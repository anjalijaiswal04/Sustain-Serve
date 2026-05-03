import { Link, useNavigate } from 'react-router-dom';
import { LogOut, HeartHandshake } from 'lucide-react';
import { useAuth } from '../utils/authContext';

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
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
              <HeartHandshake className="w-8 h-8" />
              <span>ShareFood AI</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="text-right mr-4 hidden sm:block">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-emerald-200 text-xs capitalize">{user.role} Account</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold uppercase">
                  {user.name.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center hover:bg-emerald-700 p-2 rounded-md transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-white text-emerald-600 px-4 py-2 rounded-md font-medium hover:bg-emerald-50 transition"
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
