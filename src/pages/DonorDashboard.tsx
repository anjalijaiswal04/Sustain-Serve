import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { Donation, FoodCategory, DietType } from '../utils/types';
import { toast } from 'react-hot-toast';
import { Heart, Clock, CheckCircle, Star, PhoneCall } from 'lucide-react';

const IMAGES = {
  'Healthy Meal (Cooked)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Fresh Veggies (Raw)': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
  'Grains/Legumes (Packed)': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
  'Breads/Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop'
};

export function DonorDashboard() {
  const user = db.getCurrentUser();
  const [donations, setDonations] = useState<Donation[]>([]);
  
  const [formData, setFormData] = useState({
    foodName: '',
    category: 'Cooked Food' as FoodCategory,
    dietType: 'Veg' as DietType,
    quantity: '',
    consumableHours: 4,
    pickupAddress: '',
    imageSelection: 'Healthy Meal (Cooked)'
  });

  useEffect(() => {
    if (user) {
      setDonations(db.getDonations().filter(d => d.donorId === user.id));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newDonation: Donation = {
      id: Math.random().toString(36).substr(2, 9),
      donorId: user.id,
      donorName: user.name,
      ...formData,
      image: IMAGES[formData.imageSelection as keyof typeof IMAGES],
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    db.saveDonation(newDonation);
    setDonations([...donations, newDonation]);
    toast.success("Food donation listed successfully!");
    
    // Reset Form
    setFormData({
      foodName: '',
      category: 'Cooked Food',
      dietType: 'Veg',
      quantity: '',
      consumableHours: 4,
      pickupAddress: '',
      imageSelection: 'Healthy Meal (Cooked)'
    });
  };

  if (!user || user.role !== 'donor') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  const stats = {
    total: donations.length,
    active: donations.filter(d => ['Pending', 'Accepted', 'Assigned', 'Picked'].includes(d.status)).length,
    delivered: donations.filter(d => d.status === 'Delivered').length,
    score: (user.rating || 5.0).toFixed(1)
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 mr-4"><Heart className="w-6 h-6" /></div>
          <div><p className="text-gray-500 text-sm">Total Donations</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-yellow-100 p-3 rounded-xl text-yellow-600 mr-4"><Clock className="w-6 h-6" /></div>
          <div><p className="text-gray-500 text-sm">Active Listings</p><p className="text-2xl font-bold">{stats.active}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mr-4"><CheckCircle className="w-6 h-6" /></div>
          <div><p className="text-gray-500 text-sm">Delivered Successfully</p><p className="text-2xl font-bold">{stats.delivered}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600 mr-4"><Star className="w-6 h-6" /></div>
          <div><p className="text-gray-500 text-sm">Your Score</p><p className="text-2xl font-bold">{stats.score} / 5</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Post Food Donation Listing</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Product Name *</label>
                  <input required type="text" placeholder="e.g., Dal Fry and Naan" value={formData.foodName} onChange={e => setFormData({...formData, foodName: e.target.value})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Typical Representation Food Image *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(IMAGES).map(([name, url]) => (
                      <div 
                        key={name} 
                        onClick={() => setFormData({...formData, imageSelection: name})}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 h-20 group ${formData.imageSelection === name ? 'border-emerald-500' : 'border-transparent'}`}
                      >
                        <img src={url} alt={name} className="w-full h-full object-cover group-hover:opacity-80" />
                        <div className="absolute inset-x-0 bottom-0 bg-white/90 text-center text-[10px] font-medium py-1">{name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as FoodCategory})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="Cooked Food">Cooked Food</option>
                    <option value="Raw Veggies">Raw Veggies</option>
                    <option value="Packed Grains">Grains/Legumes (Packed)</option>
                    <option value="Bakery">Breads/Bakery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                  <select value={formData.dietType} onChange={e => setFormData({...formData, dietType: e.target.value as DietType})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Servings *</label>
                <input required type="text" placeholder="e.g., 40 plates or 20 kg" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumable Within (Hours) *</label>
                  <input required type="number" min="1" max="72" value={formData.consumableHours} onChange={e => setFormData({...formData, consumableHours: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address / Hub *</label>
                  <input required type="text" placeholder="Location" value={formData.pickupAddress} onChange={e => setFormData({...formData, pickupAddress: e.target.value})} className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>
              
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-md shadow hover:bg-emerald-700 transition">
                Post Donation
              </button>
            </form>
          </div>
        </div>

        {/* My Active Listings Sidebar */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full max-h-[800px] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Listings</h2>
            {donations.length === 0 ? (
              <p className="text-gray-500 text-sm">No listings found. Post some food above!</p>
            ) : (
              <div className="space-y-4">
                {donations.slice().reverse().map(d => (
                  <div key={d.id} className="border p-4 rounded-lg relative overflow-hidden">
                    <div className="flex gap-4">
                      <img src={d.image} alt={d.foodName} className="w-16 h-16 rounded object-cover" />
                      <div>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{d.foodName}</h4>
                        <p className="text-xs text-gray-500 mt-1">{d.quantity} • {d.dietType}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2
                          ${d.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                            d.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                    {/* NGO Info (If Accepted) */}
                    {d.ngoId && (
                      <div className="mt-4 pt-3 border-t text-sm">
                        <p className="text-gray-600 mb-1">Assigned NGO/Delivery</p>
                        <a href="tel:9999999999" className="text-emerald-600 flex items-center font-medium">
                          <PhoneCall className="w-4 h-4 mr-1" /> Call Partner
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
