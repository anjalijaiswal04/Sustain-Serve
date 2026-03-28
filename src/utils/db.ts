import { User, Donation, DeliveryTask } from './types';

// Initial Mock Admin
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@sharefood.com', phone: '1234567890', password: 'password', role: 'admin' },
];

export const db = {
  // Users
  getUsers: (): User[] => {
    const data = localStorage.getItem('sf_users');
    return data ? JSON.parse(data) : INITIAL_USERS;
  },
  saveUser: (user: User) => {
    const users = db.getUsers();
    users.push(user);
    localStorage.setItem('sf_users', JSON.stringify(users));
  },
  updateUser: (updatedUser: User) => {
    const users = db.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index > -1) {
      users[index] = updatedUser;
      localStorage.setItem('sf_users', JSON.stringify(users));
    }
  },
  deleteUser: (id: string) => {
    const users = db.getUsers().filter((u) => u.id !== id);
    localStorage.setItem('sf_users', JSON.stringify(users));
  },

  // Auth
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('sf_current_user');
    return user ? JSON.parse(user) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem('sf_current_user', JSON.stringify(user));
    else localStorage.removeItem('sf_current_user');
  },

  // Donations
  getDonations: (): Donation[] => {
    const data = localStorage.getItem('sf_donations');
    return data ? JSON.parse(data) : [];
  },
  saveDonation: (donation: Donation) => {
    const donations = db.getDonations();
    donations.push(donation);
    localStorage.setItem('sf_donations', JSON.stringify(donations));
  },
  updateDonation: (updatedDonation: Donation) => {
    const donations = db.getDonations();
    const index = donations.findIndex((d) => d.id === updatedDonation.id);
    if (index > -1) {
      donations[index] = updatedDonation;
      localStorage.setItem('sf_donations', JSON.stringify(donations));
    }
  },
  deleteDonation: (id: string) => {
    const donations = db.getDonations().filter((d) => d.id !== id);
    localStorage.setItem('sf_donations', JSON.stringify(donations));
  },

  // Deliveries
  getDeliveries: (): DeliveryTask[] => {
    const data = localStorage.getItem('sf_deliveries');
    return data ? JSON.parse(data) : [];
  },
  saveDelivery: (delivery: DeliveryTask) => {
    const deliveries = db.getDeliveries();
    deliveries.push(delivery);
    localStorage.setItem('sf_deliveries', JSON.stringify(deliveries));
  },
  updateDelivery: (updatedDelivery: DeliveryTask) => {
    const deliveries = db.getDeliveries();
    const index = deliveries.findIndex((d) => d.id === updatedDelivery.id);
    if (index > -1) {
      deliveries[index] = updatedDelivery;
      localStorage.setItem('sf_deliveries', JSON.stringify(deliveries));
    }
  }
};
