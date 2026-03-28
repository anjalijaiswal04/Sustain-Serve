import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../utils/db';
import { Role } from '../utils/types';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('donor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const navigate = useNavigate();

  const validate = () => {
    if (!/^\d{10}$/.test(formData.phone)) {
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
    if (!formData.email.includes('@')) {
      toast.error("Valid email is required");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isLogin) {
      // Allow specific admin login override for simplicity
      if (formData.email === 'admin@sharefood.com' && formData.password === 'password') {
        const adminUser = db.getUsers().find(u => u.role === 'admin')!;
        db.setCurrentUser(adminUser);
        toast.success("Welcome Admin!");
        navigate('/admin');
        window.location.reload();
        return;
      }

      const users = db.getUsers();
      const user = users.find(u => u.phone === formData.phone && u.password === formData.password);
      
      if (!user) {
        toast.error("Invalid credentials or user not registered. Please register first.");
        return;
      }
      
      db.setCurrentUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/${user.role}`);
      window.location.reload();
    } else {
      const users = db.getUsers();
      if (users.find(u => u.phone === formData.phone)) {
        toast.error("User with this phone number already exists.");
        return;
      }
      
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        role,
        joinedDate: new Date().toISOString()
      };
      
      db.saveUser(newUser);
      db.setCurrentUser(newUser);
      toast.success("Registration successful!");
      navigate(`/${role}`);
      window.location.reload();
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
