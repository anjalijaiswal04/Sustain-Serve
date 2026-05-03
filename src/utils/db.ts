import { User, Donation, DeliveryTask } from './types';
import { emitDataChange } from './socket';

// Initial Mock Admin
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@sharefood.com', phone: '1234567890', password: 'password', role: 'admin' },
];

// Broadcast a data-change event so same-browser tabs can also refresh
function broadcastLocal() {
  try {
    const ch = new BroadcastChannel('sharefood_realtime');
    ch.postMessage({ ts: Date.now() });
    ch.close();
  } catch { /* not supported */ }
  window.dispatchEvent(new CustomEvent('sf_data_update'));
}

export const db = {
  // Users
  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem('sf_users');
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch { return INITIAL_USERS; }
  },
  saveUser: (user: User) => {
    const users = db.getUsers();
    if (!users.find(u => u.id === user.id)) users.push(user);
    localStorage.setItem('sf_users', JSON.stringify(users));
    emitDataChange('users', 'save', user);
    broadcastLocal();
  },
  updateUser: (updatedUser: User) => {
    const users = db.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index > -1) {
      users[index] = updatedUser;
      localStorage.setItem('sf_users', JSON.stringify(users));
      emitDataChange('users', 'update', updatedUser);
      broadcastLocal();
    }
  },
  deleteUser: (id: string) => {
    const users = db.getUsers().filter((u) => u.id !== id);
    localStorage.setItem('sf_users', JSON.stringify(users));
    emitDataChange('users', 'delete', id);
    broadcastLocal();
  },

  // Auth
  getCurrentUser: (): User | null => {
    try {
      const raw = localStorage.getItem('sf_current_user');
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      return JSON.parse(raw);
    } catch { return null; }
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem('sf_current_user', JSON.stringify(user));
    else localStorage.removeItem('sf_current_user');
  },

  // Donations
  getDonations: (): Donation[] => {
    try {
      const data = localStorage.getItem('sf_donations');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },
  saveDonation: (donation: Donation) => {
    const donations = db.getDonations();
    if (!donations.find(d => d.id === donation.id)) donations.push(donation);
    localStorage.setItem('sf_donations', JSON.stringify(donations));
    emitDataChange('donations', 'save', donation);
    broadcastLocal();
  },
  updateDonation: (updatedDonation: Donation) => {
    const donations = db.getDonations();
    const index = donations.findIndex((d) => d.id === updatedDonation.id);
    if (index > -1) {
      donations[index] = updatedDonation;
      localStorage.setItem('sf_donations', JSON.stringify(donations));
      emitDataChange('donations', 'update', updatedDonation);
      broadcastLocal();
    }
  },
  deleteDonation: (id: string) => {
    const donations = db.getDonations().filter((d) => d.id !== id);
    localStorage.setItem('sf_donations', JSON.stringify(donations));
    emitDataChange('donations', 'delete', id);
    broadcastLocal();
  },

  // Deliveries
  getDeliveries: (): DeliveryTask[] => {
    try {
      const data = localStorage.getItem('sf_deliveries');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },
  saveDelivery: (delivery: DeliveryTask) => {
    const deliveries = db.getDeliveries();
    if (!deliveries.find(d => d.id === delivery.id)) deliveries.push(delivery);
    localStorage.setItem('sf_deliveries', JSON.stringify(deliveries));
    emitDataChange('deliveries', 'save', delivery);
    broadcastLocal();
  },
  updateDelivery: (updatedDelivery: DeliveryTask) => {
    const deliveries = db.getDeliveries();
    const index = deliveries.findIndex((d) => d.id === updatedDelivery.id);
    if (index > -1) {
      deliveries[index] = updatedDelivery;
      localStorage.setItem('sf_deliveries', JSON.stringify(deliveries));
      emitDataChange('deliveries', 'update', updatedDelivery);
      broadcastLocal();
    }
  },
};
