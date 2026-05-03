import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getFreshnessTime } from '../utils/freshness';
import { Donation } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, PhoneCall, CheckCircle, Package, Timer, Building2 } from 'lucide-react';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Status step bar
function StatusSteps({ status }: { status: Donation['status'] }) {
  const steps: Array<{ key: Donation['status']; label: string }> = [
    { key: 'Assigned', label: 'Assigned' },
    { key: 'Picked',   label: 'Picked Up' },
    { key: 'OnTheWay', label: 'On the Way' },
    { key: 'Delivered', label: 'Delivered' },
  ];
  const order: Record<string, number> = { Assigned: 0, Picked: 1, OnTheWay: 2, Delivered: 3 };
  const current = order[status] ?? 0;

  return (
    <div className="flex items-center gap-0 mb-4">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1">
          <div className={`flex flex-col items-center flex-1 ${i < steps.length - 1 ? '' : ''}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold
              ${i <= current ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 text-gray-400'}`}>
              {i <= current ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] mt-0.5 text-center leading-tight font-medium
              ${i <= current ? 'text-emerald-700' : 'text-gray-400'}`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mb-3 ${i < current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function DeliveryDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);

  const refreshData = useCallback(() => setDonations(db.getDonations()), []);

  useEffect(() => { refreshData(); }, [refreshData]);
  useRealtime(refreshData);

  const updateStatus = (id: string, newStatus: Donation['status']) => {
    const donation = db.getDonations().find(d => d.id === id);
    if (donation) {
      donation.status = newStatus;
      db.updateDonation(donation);
      toast.success(`Status updated to ${newStatus}`);
      refreshData();
    }
  };

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'delivery') return <Navigate to={`/${user.role}`} replace />;

  // Only show tasks assigned to THIS delivery agent
  const myActive = donations.filter(
    d => d.deliveryId === user.id && ['Assigned', 'Picked', 'OnTheWay'].includes(d.status)
  );
  const myCompleted = donations.filter(
    d => d.deliveryId === user.id && d.status === 'Delivered'
  );

  // Stats for header
  const totalEarnings = myCompleted.length * 50; // mock ₹50 per delivery

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-black text-blue-600">{myActive.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Tasks</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-black text-emerald-600">{myCompleted.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Delivered</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-black text-purple-600">₹{totalEarnings}</p>
          <p className="text-xs text-gray-500 mt-0.5">Earnings</p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Navigation className="w-6 h-6 mr-2 text-emerald-600" /> Active Route
        </h2>
        <div className="h-[340px] w-full rounded-xl overflow-hidden shadow-inner border border-gray-300 relative z-0">
          <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {myActive.length > 0 && (
              <>
                <Marker position={[28.6139, 77.2090]}>
                  <Popup>📦 Pickup: {myActive[0].pickupAddress}</Popup>
                </Marker>
                <Marker position={[28.5839, 77.2290]}>
                  <Popup>🏢 Drop-off: {myActive[0].ngoName || 'NGO Location'}</Popup>
                </Marker>
                <Polyline positions={[[28.6139, 77.2090], [28.5839, 77.2290]]} color="#059669" weight={4} dashArray="10, 10" />
              </>
            )}
            {myActive.length === 0 && (
              <Marker position={[28.6139, 77.2090]}>
                <Popup>Your location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Active Tasks */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            My Current Tasks
            {myActive.length > 0 && (
              <span className="ml-2 text-sm font-normal text-blue-600">({myActive.length} active)</span>
            )}
          </h2>
          {myActive.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No active deliveries assigned to you.</p>
              <p className="text-xs mt-1">An NGO will assign you a task and it will appear here instantly.</p>
            </div>
          )}
          <div className="space-y-4">
            {myActive.map(d => {
              const freshness = getFreshnessTime(d.createdAt, d.consumableHours);
              return (
                <div key={d.id} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
                  {/* Status step bar */}
                  <StatusSteps status={d.status} />

                  {/* Food details */}
                  <div className="flex gap-3 mb-3">
                    <img src={d.image} alt={d.foodName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{d.foodName}</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{d.quantity} · {d.dietType} · {d.category}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Donor: <span className="font-medium text-gray-700">{d.donorName}</span></p>
                    </div>
                    <a href="tel:9999999999"
                      className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 h-fit"
                      title="Call Donor">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Freshness urgency */}
                  <div className={`text-xs font-semibold flex items-center gap-1 mb-3 px-2 py-1 rounded border inline-flex ${freshness.color}`}>
                    <Timer className="w-3 h-3" /> {freshness.label}
                  </div>

                  {/* Locations */}
                  <div className="space-y-2 text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-semibold text-gray-900 block text-xs uppercase tracking-wide text-red-500">Pickup</span>
                        {d.pickupAddress}
                      </span>
                    </p>
                    <div className="border-t border-dashed border-gray-200" />
                    <p className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-semibold text-gray-900 block text-xs uppercase tracking-wide text-emerald-600">Drop-off NGO</span>
                        {d.ngoName || 'NGO Base Location'}
                      </span>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 border-t pt-4">
                    <button disabled={d.status !== 'Assigned'} onClick={() => updateStatus(d.id, 'Picked')}
                      className={`py-2 rounded-lg text-sm font-bold transition
                        ${d.status === 'Assigned' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      Mark Picked
                    </button>
                    <button disabled={d.status !== 'Picked'} onClick={() => updateStatus(d.id, 'OnTheWay')}
                      className={`py-2 rounded-lg text-sm font-bold transition
                        ${d.status === 'Picked' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      On the Way
                    </button>
                    <button disabled={d.status !== 'OnTheWay'} onClick={() => updateStatus(d.id, 'Delivered')}
                      className={`py-2 rounded-lg text-sm font-bold transition
                        ${d.status === 'OnTheWay' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      Delivered
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Deliveries */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-emerald-600" /> My Completed Deliveries
          </h2>
          {myCompleted.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              No completed deliveries yet.
            </div>
          )}
          <div className="space-y-3">
            {myCompleted.map(d => (
              <div key={d.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-3">
                <img src={d.image} alt={d.foodName} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{d.foodName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{d.quantity} · {d.category}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" /> {d.pickupAddress}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-emerald-500" /> {d.ngoName || 'NGO'}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <div className="flex items-center text-emerald-700 text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                  </div>
                  <span className="text-xs text-purple-600 font-semibold">+₹50</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
