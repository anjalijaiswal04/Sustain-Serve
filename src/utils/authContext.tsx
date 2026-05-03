import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { db } from './db';
import { User, Role } from './types';

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string, email: string) => { success: boolean; error?: string };
  register: (data: { name: string; email: string; phone: string; password: string; role: Role }) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => db.getCurrentUser());
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Listen for auth changes from other tabs via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sf_current_user') {
        setUser(db.getCurrentUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (phone: string, password: string, email: string): { success: boolean; error?: string } => {
    // Admin special case — match by email + password
    if (email === 'admin@sharefood.com' && password === 'password') {
      let users = db.getUsers();
      let adminUser = users.find(u => u.role === 'admin');
      if (!adminUser) {
        // Re-seed admin if missing from localStorage
        adminUser = { id: '1', name: 'Admin User', email: 'admin@sharefood.com', phone: '1234567890', password: 'password', role: 'admin' };
        db.saveUser(adminUser);
      }
      db.setCurrentUser(adminUser);
      setUser(adminUser);
      return { success: true };
    }

    const users = db.getUsers();
    // Match by phone + password (the fields shown on the login form)
    const found = users.find(u => u.phone === phone && u.password === password);
    if (!found) {
      return { success: false, error: 'Invalid credentials or user not registered. Please register first.' };
    }
    db.setCurrentUser(found);
    setUser(found);
    return { success: true };
  };

  const register = (data: { name: string; email: string; phone: string; password: string; role: Role }): { success: boolean; error?: string } => {
    const users = db.getUsers();
    if (users.find(u => u.phone === data.phone)) {
      return { success: false, error: 'User with this phone number already exists.' };
    }
    if (users.find(u => u.email === data.email)) {
      return { success: false, error: 'User with this email already exists.' };
    }
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role,
    };
    db.saveUser(newUser);
    db.setCurrentUser(newUser);
    setUser(newUser);
    return { success: true };
  };

  const logout = () => {
    db.setCurrentUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
