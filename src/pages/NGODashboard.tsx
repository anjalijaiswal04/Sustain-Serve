import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { Donation } from '../utils/types';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, CheckCircle, Truck, PhoneCall, Star } from 'lucide-react';
import L from 'leaflet';

// Fix leaflet marker icons missing issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function NGODashboard() {
  const user = db.getCurrentUser();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [ratingData, setRatingData] = useState({ food: 5, delivery: 5, comment: '' });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const all = db.getDonations();
    setDonations(all);
  };

  const handleAccept = (id: string) => {
    if (!user) return;
    const donation = db.getDonations().find(d => d.id === id);
    if (donation) {
      donation.status = 'Accepted';
      donation.ngoId = user.id;
      db.updateDonation(donation);
      toast.success("Donation Accepted! Searching for Delivery Partner...");
      
      // Simulate auto-assign delivery after 3 seconds
      setTimeout(() => {
        const d2 = db.getDonations().find(d => d.id === id);
        if (d2) {
          d2.status = 'Assigned';
          d2.deliveryId = 'del_123'; // Mock delivery partner
          db.updateDonation(d2);
          toast.success("Delivery Partner Assigned!");
          refreshData();
        }
      }, 3000);
      
      refreshData();
    }
  };

  const handleRate = () => {
    if (!ratingModal) return;
    const donation = db.getDonations().find(d => d.id === ratingModal);
    if (donation) {
      donation.ratings = ratingData;
      db.updateDonation(donation);
      toast.success("Thanks for your rating!");
      setRatingModal(null);
      refreshData();
    }
  };

  if (!user || user.role !== 'ngo') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  const availableDonations = donations.filter(d => d.status === 'Pending');
  const myDonations = donations.filter(d => d.ngoId === user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Map Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-emerald-600" /> Nearby Available Donations
        </h2>
        <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-inner border border-gray-300">
          <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {availableDonations.map(d => (
              <Marker key={d.id} position={[28.6139 + (Math.random() - 0.5) * 0.1, 77.2090 + (Math.random() - 0.5) * 0.1]}>
                <Popup>
                  <div className="font-bold">{d.foodName}</div>
                  <div>Qty: {d.quantity}</div>
                  <button onClick={() => handleAccept(d.id)} className="bg-emerald-600 text-white px-2 py-1 rounded mt-2 text-xs hover:bg-emerald-700">Accept Now</button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Available List */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">New Postings</h2>
          {availableDonations.length === 0 ? <p className="text-gray-500">No new postings right now.</p> : null}
          <div className="space-y-4">
            {availableDonations.map(d => (
              <div key={d.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <h3 className="font-bold text-lg">{d.foodName}</h3>
                  <p className="text-sm text-gray-600">Qty: {d.quantity} • {d.dietType} • {d.category}</p>
                  <p className="text-xs text-red-500 font-semibold mt-1">Expires in {d.consumableHours} hours</p>
                  <p className="text-sm text-gray-500 mt-2 flex items-center"><MapPin className="w-4 h-4 mr-1" /> {d.pickupAddress}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">New</span>
                  <button onClick={() => handleAccept(d.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 font-medium whitespace-nowrap">
                    Accept Donation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accepted & Tracking List */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Deliveries & Tracking</h2>
          {myDonations.length === 0 ? <p className="text-gray-500">You haven't accepted any donations yet.</p> : null}
          <div className="space-y-4">
            {myDonations.map(d => (
              <div key={d.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-2 text-white text-xs font-bold rounded-bl-lg
                  ${d.status === 'Accepted' ? 'bg-yellow-500' : 
                    d.status === 'Assigned' ? 'bg-blue-500' : 
                    d.status === 'Picked' ? 'bg-purple-500' :
                    d.status === 'Delivered' ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {d.status}
                </div>
                <h3 className="font-bold text-lg mb-1 pr-20">{d.foodName}</h3>
                <p className="text-sm text-gray-600 mb-3">From: {d.donorName}</p>
                
                <div className="flex items-center gap-4 text-sm mt-4 border-t pt-3">
                  <a href="tel:9999999999" className="text-emerald-600 flex items-center font-medium hover:underline">
                    <PhoneCall className="w-4 h-4 mr-1" /> Call Donor
                  </a>
                  {['Assigned', 'Picked', 'OnTheWay'].includes(d.status) && (
                    <a href="#" className="text-blue-600 flex items-center font-medium hover:underline">
                      <Truck className="w-4 h-4 mr-1" /> Track Delivery
                    </a>
                  )}
                  {d.status === 'Delivered' && !d.ratings && (
                    <button onClick={() => setRatingModal(d.id)} className="text-yellow-600 flex items-center font-medium hover:underline">
                      <Star className="w-4 h-4 mr-1" /> Rate Experience
                    </button>
                  )}
                  {d.ratings && (
                    <span className="text-green-600 flex items-center font-medium">
                      <CheckCircle className="w-4 h-4 mr-1" /> Rated
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Rate Delivery & Food</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Quality (1-5)</label>
                <input type="range" min="1" max="5" value={ratingData.food} onChange={e => setRatingData({...ratingData, food: parseInt(e.target.value)})} className="w-full accent-emerald-600" />
                <div className="text-center font-bold text-emerald-600">{ratingData.food} Stars</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Experience (1-5)</label>
                <input type="range" min="1" max="5" value={ratingData.delivery} onChange={e => setRatingData({...ratingData, delivery: parseInt(e.target.value)})} className="w-full accent-emerald-600" />
                <div className="text-center font-bold text-emerald-600">{ratingData.delivery} Stars</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500" value={ratingData.comment} onChange={e => setRatingData({...ratingData, comment: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setRatingModal(null)} className="flex-1 py-2 border rounded-md hover:bg-gray-50 font-medium text-gray-700">Cancel</button>
                <button onClick={handleRate} className="flex-1 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium shadow-sm">Submit Review</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
