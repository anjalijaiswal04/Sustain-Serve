import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../utils/authContext';
import { db } from '../utils/db';
import { Role } from '../utils/types';
import { LogIn, UserPlus, Utensils, Building2, Bike } from 'lucide-react';

const ROLE_OPTIONS: { value: Role; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'donor',
    label: 'Donor',
    icon: <Utensils className="w-5 h-5" />,
    desc: 'I donate food',
  },
  {
    value: 'ngo',
    label: 'NGO',
    icon: <Building2 className="w-5 h-5" />,
    desc: 'I accept & manage food',
  },
  {
    value: 'delivery',
    label: 'Delivery Agent',
    icon: <Bike className="w-5 h-5" />,
    desc: 'I deliver food',
  },
];

function roleDashboard(role: Role): string {
  switch (role) {
    case 'donor':    return '/donor';
    case 'ngo':      return '/ngo';
    case 'delivery': return '/delivery';
    case 'admin':    return '/admin';
    default:         return '/';
  }
}

export function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('donor');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  // Already logged in — send to their own dashboard immediately
  if (user) {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  const validate = () => {
    if (!formData.email.includes('@')) { toast.error('Valid email is required'); return false; }
    const isAdminLogin = isLogin && formData.email === 'admin@sharefood.com';
    if (!isAdminLogin && !/^\d{10}$/.test(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits'); return false;
    }
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    if (!isLogin && !formData.name.trim()) { toast.error('Name is required'); return false; }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isLogin) {
      const result = login(formData.phone, formData.password, formData.email);
      if (!result.success) {
        toast.error(result.error || 'Login failed. Please try again.');
        return;
      }
      // Read role synchronously from localStorage — login() already persisted it
      const currentUser = db.getCurrentUser();
      if (currentUser) {
        toast.success(`Welcome back, ${currentUser.name}!`);
        navigate(roleDashboard(currentUser.role), { replace: true });
      }
    } else {
      const result = register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password, role });
      if (!result.success) {
        toast.error(result.error || 'Registration failed. Please try again.');
        return;
      }
      toast.success(`Welcome, ${formData.name}! Your ${role} account is ready.`);
      navigate(roleDashboard(role), { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Sign in to your account' : 'Create new account'}
        </h2>
        {isLogin && (
          <p className="text-center text-sm text-gray-500 mt-2">
            You'll be taken straight to your dashboard after login.
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Role picker — register only */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 border-2 rounded-xl text-sm font-medium transition
                        ${role === opt.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'}`}
                    >
                      <span className={role === opt.value ? 'text-emerald-600' : 'text-gray-400'}>{opt.icon}</span>
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight text-center">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Name / Organisation</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={role === 'ngo' ? 'Organisation name' : 'Your full name'}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                    focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                  focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number (10 digits)</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                  focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password (Min 6 characters)</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                  focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent
                rounded-md shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {isLogin
                ? <><LogIn className="w-4 h-4" /> Sign In</>
                : <><UserPlus className="w-4 h-4" /> Create {role.charAt(0).toUpperCase() + role.slice(1)} Account</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Admin hint */}
          {isLogin && (
            <p className="mt-4 text-center text-xs text-gray-400">
              Admin? Use <span className="font-mono">admin@sharefood.com</span> with any phone &amp; password <span className="font-mono">password</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
