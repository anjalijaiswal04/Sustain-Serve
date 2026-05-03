import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../utils/authContext';
import { Role } from '../utils/types';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthPage() {
  const { user, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('donor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const navigate = useNavigate();

  // Already logged in — redirect to correct dashboard
  if (user) {
    navigate(`/${user.role}`, { replace: true });
    return null;
  }

  const validate = () => {
    if (!formData.email.includes('@')) {
      toast.error("Valid email is required");
      return false;
    }
    // For login, admin can use any phone value (we check email+password for admin)
    const isAdminLogin = isLogin && formData.email === 'admin@sharefood.com';
    if (!isAdminLogin && !/^\d{10}$/.test(formData.phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (!isLogin && !formData.name.trim()) {
      toast.error("Name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isLogin) {
      const result = login(formData.phone, formData.password, formData.email);
      if (!result.success) {
        toast.error(result.error || "Login failed. Please try again.");
        return;
      }
      // Navigate based on the role of the newly logged-in user
      // We read from auth context — but login() already set the user in context.
      // We need to find out their role to navigate. Re-read from db since context
      // updates asynchronously via state.
      import('../utils/db').then(({ db }) => {
        const currentUser = db.getCurrentUser();
        if (currentUser) {
          toast.success(`Welcome back, ${currentUser.name}!`);
          navigate(`/${currentUser.role}`, { replace: true });
        }
      });
    } else {
      const result = register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password, role });
      if (!result.success) {
        toast.error(result.error || "Registration failed. Please try again.");
        return;
      }
      toast.success("Registration successful! Welcome aboard.");
      navigate(`/${role}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Sign in to your account' : 'Create new account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Type</label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {['donor', 'ngo', 'delivery'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r as Role)}
                        className={`px-3 py-2 border rounded-md text-sm font-medium capitalize ${
                          role === r
                            ? 'bg-emerald-600 text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name / Organization</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number (10 digits)</label>
              <div className="mt-1">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="\d{10}"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password (Min 6 characters)</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                {isLogin ? <><LogIn className="w-5 h-5 mr-2" /> Sign In</> : <><UserPlus className="w-5 h-5 mr-2" /> Register</>}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                {isLogin ? 'Create new account' : 'Sign in to existing account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
