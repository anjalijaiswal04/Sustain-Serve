import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getDemandPrediction } from '../utils/aiFeatures';
import { User, Donation } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { Users, Truck, Heart, Trash2, Edit, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  const refreshData = useCallback(() => {
    setUsers(db.getUsers());
    setDonations(db.getDonations());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time: auto-refresh when data changes in any tab
  useRealtime(refreshData);

  const deleteUser = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      db.deleteUser(id);
      toast.success("User deleted");
      refreshData();
    }
  };

  const deleteDonation = (id: string) => {
    if (confirm("Are you sure you want to delete this donation?")) {
      db.deleteDonation(id);
      toast.success("Donation deleted");
      refreshData();
    }
  };

  if (!currentUser) return <Navigate to="/auth" replace />;
  if (currentUser.role !== 'admin') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  const stats = {
    ngos: users.filter(u => u.role === 'ngo').length,
    totalDonations: donations.length,
    activeDeliveries: donations.filter(d => ['Assigned', 'Picked', 'OnTheWay'].includes(d.status)).length
  };

  const demand = getDemandPrediction(donations);
  const maxForecast = Math.max(...demand.weeklyForecast.map(f => f.predicted), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-blue-100 p-4 rounded-xl text-blue-600 mr-4"><Users className="w-8 h-8" /></div>
          <div><p className="text-gray-500 text-sm font-medium">Total NGOs</p><p className="text-3xl font-bold">{stats.ngos}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 mr-4"><Heart className="w-8 h-8" /></div>
          <div><p className="text-gray-500 text-sm font-medium">Total Donations</p><p className="text-3xl font-bold">{stats.totalDonations}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-purple-100 p-4 rounded-xl text-purple-600 mr-4"><Truck className="w-8 h-8" /></div>
          <div><p className="text-gray-500 text-sm font-medium">Active Deliveries</p><p className="text-3xl font-bold">{stats.activeDeliveries}</p></div>
        </div>
      </div>

      {/* AI Demand Prediction Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">AI Demand Prediction</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Sparkles className="w-3 h-3" /> Powered by ShareFood AI
          </span>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Top Category</p>
              <p className="text-lg font-bold text-emerald-900">{demand.topCategory}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 uppercase mb-1">Peak Donation Hour</p>
              <p className="text-lg font-bold text-blue-900">{demand.peakHour}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-500 uppercase mb-1">AI Insight</p>
              <p className="text-sm text-purple-900 leading-snug line-clamp-3">{demand.insight}</p>
            </div>
          </div>

          {/* Weekly Forecast Bar Chart */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Weekly Donation Forecast</p>
            <div className="flex items-end gap-2 h-24">
              {demand.weeklyForecast.map(({ day, predicted }) => {
                const heightPct = maxForecast > 0 ? Math.round((predicted / maxForecast) * 100) : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-emerald-500 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${predicted} donations predicted`}
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{u.name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 capitalize">{u.role}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{u.email}<br/>{u.phone}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => toast.error("Edit not implemented in demo")} className="text-blue-600 hover:text-blue-900 mr-4"><Edit className="w-4 h-4 inline"/></button>
                    {u.role !== 'admin' && (
                      <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline"/></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Donation Monitoring</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {donations.map(d => (
                <tr key={d.id}>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{d.foodName}</div><div className="text-xs text-gray-500">{d.quantity}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{d.donorName}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${d.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {d.status}
                  </span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => deleteDonation(d.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
