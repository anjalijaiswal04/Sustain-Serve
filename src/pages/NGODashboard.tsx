import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getAIAllocationSuggestion } from '../utils/aiFeatures';
import { getFreshnessTime } from '../utils/freshness';
import { Donation, User } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, CheckCircle, Truck, PhoneCall, Star, Sparkles, Timer, User as UserIcon, X } from 'lucide-react';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FreshnessBar({ createdAt, consumableHours }: { createdAt: string; consumableHours: number }) {
  const [info, setInfo] = useState(() => getFreshnessTime(createdAt, consumableHours));
  useEffect(() => {
    const id = setInterval(() => setInfo(getFreshnessTime(createdAt, consumableHours)), 30000);
    return () => clearInterval(id);
  }, [createdAt, consumableHours]);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className={`flex items-center gap-1 font-semibold ${info.isExpired ? 'text-gray-400' : info.color.split(' ')[0]}`}>
          <Timer className="w-3 h-3" /> {info.label}
        </span>
        <span className="text-gray-400">{info.percentRemaining}% fresh</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${info.barColor}`}
          style={{ width: `${info.percentRemaining}%` }} />
      </div>
    </div>
  );
}

// ─── Assign Delivery Agent Modal ─────────────────────────────────────────────
function AssignAgentModal({
  donation,
  agents,
  onAssign,
  onClose,
}: {
  donation: Donation;
  agents: User[];
  onAssign: (donationId: string, agent: User) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string>('');

  const handleConfirm = () => {
    const agent = agents.find(a => a.id === selected);
    if (!agent) { toast.error('Please select a delivery agent.'); return; }
    onAssign(donation.id, agent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Assign Delivery Agent</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{donation.foodName} · {donation.quantity}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent list */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-2">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <UserIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No delivery agents registered yet.</p>
              <p className="text-xs mt-1 text-gray-400">Ask agents to register with the "Delivery" role.</p>
            </div>
          ) : (
            agents.map(agent => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelected(agent.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border-2 transition
                  ${selected === agent.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${selected === agent.id ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${selected === agent.id ? 'text-emerald-800' : 'text-gray-900'}`}>
                    {agent.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{agent.phone} · {agent.email}</p>
                </div>
                {selected === agent.id && (
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!selected}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition
              ${selected
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            Assign Agent
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function NGODashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [assignModal, setAssignModal] = useState<Donation | null>(null);
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [ratingData, setRatingData] = useState({ food: 5, delivery: 5, comment: '' });

  const refreshData = useCallback(() => {
    setDonations(db.getDonations());
    // Load only registered delivery-role users
    setAgents(db.getUsers().filter(u => u.role === 'delivery'));
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);
  useRealtime(refreshData);

  // Step 1: Accept the donation (Pending → Accepted), open agent picker
  const handleAccept = (id: string) => {
    if (!user) return;
    const donation = db.getDonations().find(d => d.id === id);
    if (!donation) return;
    donation.status = 'Accepted';
    donation.ngoId = user.id;
    donation.ngoName = user.name;
    db.updateDonation(donation);
    toast.success('Donation accepted! Now choose a delivery agent.');
    refreshData();
    setAssignModal(donation);
  };

  // Step 2: Assign a specific agent (Accepted → Assigned)
  const handleAssign = (donationId: string, agent: User) => {
    const donation = db.getDonations().find(d => d.id === donationId);
    if (!donation) return;
    donation.status = 'Assigned';
    donation.deliveryId = agent.id;
    donation.deliveryName = agent.name;
    donation.deliveryPhone = agent.phone;
    db.updateDonation(donation);
    toast.success(`Delivery assigned to ${agent.name}. They'll see it instantly!`);
    refreshData();
  };

  // Re-assign: open modal for already-accepted donations
  const handleReassign = (donation: Donation) => {
    setAssignModal(donation);
  };

  const handleRate = () => {
    if (!ratingModal) return;
    const donation = db.getDonations().find(d => d.id === ratingModal);
    if (donation) {
      donation.ratings = ratingData;
      db.updateDonation(donation);
      toast.success('Thanks for your rating!');
      setRatingModal(null);
      refreshData();
    }
  };

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'ngo') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  const availableDonations = donations.filter(d => d.status === 'Pending');
  const myDonations = donations.filter(d => d.ngoId === user.id);

  const sortedAvailable = [...availableDonations].sort((a, b) =>
    getAIAllocationSuggestion(b).priorityScore - getAIAllocationSuggestion(a).priorityScore
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Map */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-emerald-600" /> Nearby Available Donations
          <span className="ml-3 text-sm font-normal text-emerald-600">{availableDonations.length} available</span>
        </h2>
        <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-inner border border-gray-300">
          <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {sortedAvailable.map((d, i) => (
              <Marker key={d.id} position={[28.6139 + (i * 0.02 - 0.04), 77.2090 + (i * 0.02 - 0.04)]}>
                <Popup>
                  <div className="font-bold">{d.foodName}</div>
                  <div>Qty: {d.quantity}</div>
                  <div className="text-xs text-red-500">{getFreshnessTime(d.createdAt, d.consumableHours).label}</div>
                  <button onClick={() => handleAccept(d.id)}
                    className="bg-emerald-600 text-white px-2 py-1 rounded mt-2 text-xs hover:bg-emerald-700">
                    Accept Now
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Available Donations — AI sorted */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            New Postings
            {sortedAvailable.length > 0 && (
              <span className="text-xs font-normal text-emerald-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI-sorted by urgency
              </span>
            )}
          </h2>
          {sortedAvailable.length === 0 && <p className="text-gray-500">No new postings right now.</p>}
          <div className="space-y-4">
            {sortedAvailable.map(d => {
              const ai = getAIAllocationSuggestion(d);
              return (
                <div key={d.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="flex gap-3 mb-3">
                    <img src={d.image} alt={d.foodName} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg leading-tight">{d.foodName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ai.urgencyColor}`}>
                          {ai.urgencyLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Qty: {d.quantity} • {d.dietType} • {d.category}</p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" /> {d.pickupAddress}
                      </p>
                    </div>
                  </div>
                  <FreshnessBar createdAt={d.createdAt} consumableHours={d.consumableHours} />
                  <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 rounded px-2 py-1">
                    🤖 {ai.allocationAdvice}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">New</span>
                    <button onClick={() => handleAccept(d.id)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 font-medium text-sm">
                      Accept &amp; Assign Agent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Accepted Donations */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Deliveries &amp; Tracking</h2>
          {myDonations.length === 0 && <p className="text-gray-500">You haven't accepted any donations yet.</p>}
          <div className="space-y-4">
            {myDonations.map(d => {
              const freshness = getFreshnessTime(d.createdAt, d.consumableHours);
              return (
                <div key={d.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 right-0 p-2 text-white text-xs font-bold rounded-bl-lg
                    ${d.status === 'Accepted' ? 'bg-yellow-500' :
                      d.status === 'Assigned' ? 'bg-blue-500' :
                      d.status === 'Picked' ? 'bg-purple-500' :
                      d.status === 'Delivered' ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {d.status}
                  </div>
                  <div className="flex gap-3 pr-20">
                    <img src={d.image} alt={d.foodName} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg mb-0.5">{d.foodName}</h3>
                      <p className="text-sm text-gray-600">From: {d.donorName}</p>
                    </div>
                  </div>

                  {/* Delivery agent info */}
                  {d.deliveryId ? (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{d.deliveryName}</span>
                        {d.deliveryPhone && (
                          <span className="text-gray-400 text-xs ml-2">{d.deliveryPhone}</span>
                        )}
                      </div>
                      {!['Delivered', 'Picked', 'OnTheWay'].includes(d.status) && (
                        <button
                          onClick={() => handleReassign(d)}
                          className="ml-auto text-xs text-blue-600 hover:underline font-medium">
                          Re-assign
                        </button>
                      )}
                    </div>
                  ) : d.status === 'Accepted' ? (
                    <button
                      onClick={() => handleReassign(d)}
                      className="mt-2 flex items-center gap-1.5 text-sm text-orange-600 font-medium hover:underline">
                      <Truck className="w-4 h-4" /> Assign delivery agent
                    </button>
                  ) : null}

                  {!freshness.isExpired && d.status !== 'Delivered' && (
                    <FreshnessBar createdAt={d.createdAt} consumableHours={d.consumableHours} />
                  )}

                  <div className="flex items-center gap-4 text-sm mt-3 border-t pt-3">
                    <a href="tel:9999999999" className="text-emerald-600 flex items-center font-medium hover:underline">
                      <PhoneCall className="w-4 h-4 mr-1" /> Call Donor
                    </a>
                    {['Assigned', 'Picked', 'OnTheWay'].includes(d.status) && (
                      <span className="text-blue-600 flex items-center font-medium">
                        <Truck className="w-4 h-4 mr-1" /> In Transit
                      </span>
                    )}
                    {d.status === 'Delivered' && !d.ratings && (
                      <button onClick={() => setRatingModal(d.id)}
                        className="text-yellow-600 flex items-center font-medium hover:underline">
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Assign Agent Modal */}
      {assignModal && (
        <AssignAgentModal
          donation={assignModal}
          agents={agents}
          onAssign={handleAssign}
          onClose={() => setAssignModal(null)}
        />
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Rate Delivery &amp; Food</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Quality (1-5)</label>
                <input type="range" min="1" max="5" value={ratingData.food}
                  onChange={e => setRatingData({ ...ratingData, food: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600" />
                <div className="text-center font-bold text-emerald-600">{ratingData.food} Stars</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Experience (1-5)</label>
                <input type="range" min="1" max="5" value={ratingData.delivery}
                  onChange={e => setRatingData({ ...ratingData, delivery: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600" />
                <div className="text-center font-bold text-emerald-600">{ratingData.delivery} Stars</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500"
                  value={ratingData.comment}
                  onChange={e => setRatingData({ ...ratingData, comment: e.target.value })} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setRatingModal(null)}
                  className="flex-1 py-2 border rounded-md hover:bg-gray-50 font-medium text-gray-700">Cancel</button>
                <button onClick={handleRate}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium shadow-sm">Submit Review</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
