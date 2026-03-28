import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { Donation } from '../utils/types';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, PhoneCall, CheckCircle, Package } from 'lucide-react';
import L from 'leaflet';

export function DeliveryDashboard() {
  const user = db.getCurrentUser();
  const [donations, setDonations] = useState<Donation[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setDonations(db.getDonations());
  };

  const updateStatus = (id: string, newStatus: Donation['status']) => {
    const donation = db.getDonations().find(d => d.id === id);
    if (donation) {
      donation.status = newStatus;
      db.updateDonation(donation);
      toast.success(`Status updated to ${newStatus}`);
      refreshData();
    }
  };

  if (!user || user.role !== 'delivery') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  // Let's pretend user.id matches 'del_123' used in the auto-assign or real logic later.
  // We'll show any "Assigned" as a pending task for the demo.
  const myTasks = donations.filter(d => ['Assigned', 'Picked', 'OnTheWay'].includes(d.status));
  const completed = donations.filter(d => d.status === 'Delivered');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Map Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Navigation className="w-6 h-6 mr-2 text-emerald-600" /> Active Route
        </h2>
        <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-inner border border-gray-300 relative z-0">
          <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {myTasks.length > 0 && (
              <>
                <Marker position={[28.6139, 77.2090]}>
                  <Popup>Pickup: {myTasks[0].pickupAddress}</Popup>
                </Marker>
                <Marker position={[28.5839, 77.2290]}>
                  <Popup>Drop-off: NGO Location</Popup>
                </Marker>
                <Polyline positions={[[28.6139, 77.2090], [28.5839, 77.2290]]} color="emerald" weight={4} dashArray="10, 10" />
              </>
            )}
          </MapContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Active Tasks */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Tasks</h2>
          {myTasks.length === 0 ? <p className="text-gray-500">No active deliveries assigned right now.</p> : null}
          <div className="space-y-4">
            {myTasks.map(d => (
              <div key={d.id} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg flex items-center"><Package className="w-5 h-5 mr-2 text-blue-600"/> {d.foodName}</h3>
                    <p className="text-sm text-gray-600 font-medium mt-1">Status: <span className="text-blue-700">{d.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <a href="tel:9999999999" className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200" title="Call Donor"><PhoneCall className="w-4 h-4"/></a>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  <p className="flex items-start"><MapPin className="w-4 h-4 mr-2 text-red-500 mt-0.5 shrink-0"/> <span className="font-semibold mr-1">Pickup:</span> {d.pickupAddress}</p>
                  <p className="flex items-start"><MapPin className="w-4 h-4 mr-2 text-green-500 mt-0.5 shrink-0"/> <span className="font-semibold mr-1">Drop-off:</span> NGO Base</p>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t pt-4">
                  <button 
                    disabled={d.status !== 'Assigned'}
                    onClick={() => updateStatus(d.id, 'Picked')}
                    className={`py-2 rounded text-sm font-bold ${d.status === 'Assigned' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    Mark Picked
                  </button>
                  <button 
                    disabled={d.status !== 'Picked'}
                    onClick={() => updateStatus(d.id, 'OnTheWay')}
                    className={`py-2 rounded text-sm font-bold ${d.status === 'Picked' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    On Way
                  </button>
                  <button 
                    disabled={d.status !== 'OnTheWay'}
                    onClick={() => updateStatus(d.id, 'Delivered')}
                    className={`py-2 rounded text-sm font-bold ${d.status === 'OnTheWay' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    Delivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed List */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-emerald-600" /> Completed Deliveries
          </h2>
          {completed.length === 0 ? <p className="text-gray-500">No completed deliveries yet.</p> : null}
          <div className="space-y-3">
            {completed.map(d => (
              <div key={d.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 opacity-80">
                <h3 className="font-bold text-gray-800">{d.foodName}</h3>
                <p className="text-sm text-gray-600 mt-1">From: {d.pickupAddress}</p>
                <div className="flex items-center text-green-700 text-sm font-bold mt-2">
                  <CheckCircle className="w-4 h-4 mr-1" /> Delivered
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
