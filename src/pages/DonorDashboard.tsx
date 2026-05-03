import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getAIAllocationSuggestion } from '../utils/aiFeatures';
import { getFreshnessTime, resizeImage, analyzeImageFreshness, ImageFreshnessResult } from '../utils/freshness';
import { Donation, FoodCategory, DietType } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, Clock, CheckCircle, Star, PhoneCall, Sparkles, Upload, X, Timer } from 'lucide-react';

const PRESET_IMAGES: Record<string, string> = {
  'Healthy Meal (Cooked)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Fresh Veggies (Raw)': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
  'Grains/Legumes (Packed)': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
  'Breads/Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
};

// Live freshness countdown badge
function FreshnessBadge({ createdAt, consumableHours }: { createdAt: string; consumableHours: number }) {
  const [info, setInfo] = useState(() => getFreshnessTime(createdAt, consumableHours));
  useEffect(() => {
    const id = setInterval(() => setInfo(getFreshnessTime(createdAt, consumableHours)), 30000);
    return () => clearInterval(id);
  }, [createdAt, consumableHours]);

  return (
    <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-full border inline-flex items-center gap-1 ${info.color}`}>
      <Timer className="w-3 h-3" />
      {info.label}
    </div>
  );
}

export function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    foodName: '',
    category: 'Cooked Food' as FoodCategory,
    dietType: 'Veg' as DietType,
    quantity: '',
    consumableHours: 4,
    pickupAddress: '',
    imageSelection: 'Healthy Meal (Cooked)',
    uploadedImage: '' as string,   // base64 or empty
    useUpload: false,
  });

  const [aiFreshness, setAiFreshness] = useState<ImageFreshnessResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const refreshData = useCallback(() => {
    if (user) setDonations(db.getDonations().filter(d => d.donorId === user.id));
  }, [user]);

  useEffect(() => { refreshData(); }, [refreshData]);
  useRealtime(refreshData);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAnalyzing(true);
      setAiFreshness(null);
      const resized = await resizeImage(file);

      // Show preview immediately while AI analyses
      setFormData(prev => ({ ...prev, uploadedImage: resized, useUpload: true }));

      // AI food detection + freshness analysis
      const result = await analyzeImageFreshness(resized);
      setAiFreshness(result);

      if (!result.isFoodDetected) {
        // Not a food image — clear the upload so it can't be submitted
        setFormData(prev => ({ ...prev, uploadedImage: '', useUpload: false }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.error('No food detected in this image. Please upload a food photo.');
      }
    } catch {
      toast.error('Failed to process image. Please try another.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearUpload = () => {
    setFormData(prev => ({ ...prev, uploadedImage: '', useUpload: false }));
    setAiFreshness(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const image = formData.useUpload && formData.uploadedImage
      ? formData.uploadedImage
      : PRESET_IMAGES[formData.imageSelection];

    const newDonation: Donation = {
      id: Math.random().toString(36).substr(2, 9),
      donorId: user.id,
      donorName: user.name,
      foodName: formData.foodName,
      category: formData.category,
      dietType: formData.dietType,
      quantity: formData.quantity,
      consumableHours: formData.consumableHours,
      pickupAddress: formData.pickupAddress,
      image,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    db.saveDonation(newDonation);
    setDonations(prev => [...prev, newDonation]);
    toast.success('Food donation listed successfully! All NGOs have been notified.');

    setFormData({
      foodName: '', category: 'Cooked Food', dietType: 'Veg',
      quantity: '', consumableHours: 4, pickupAddress: '',
      imageSelection: 'Healthy Meal (Cooked)', uploadedImage: '', useUpload: false,
    });
    setAiFreshness(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'donor') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  const stats = {
    total: donations.length,
    active: donations.filter(d => ['Pending', 'Accepted', 'Assigned', 'Picked'].includes(d.status)).length,
    delivered: donations.filter(d => d.status === 'Delivered').length,
    score: (user.rating || 5.0).toFixed(1),
  };

  const aiSuggestion = getAIAllocationSuggestion({
    id: '', donorId: user.id, donorName: user.name,
    foodName: formData.foodName || 'Food item',
    category: formData.category, dietType: formData.dietType,
    quantity: formData.quantity || '-',
    consumableHours: formData.consumableHours,
    pickupAddress: formData.pickupAddress, image: '',
    status: 'Pending', createdAt: new Date().toISOString(),
  });

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
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Post Food Donation Listing</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Product Name *</label>
                  <input required type="text" placeholder="e.g., Dal Fry and Naan"
                    value={formData.foodName}
                    onChange={e => setFormData({ ...formData, foodName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>

                {/* Image Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Image *</label>

                  {/* Upload option */}
                  <div className={`border-2 border-dashed rounded-lg p-3 mb-2 text-center cursor-pointer transition
                    ${formData.useUpload ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'}`}
                    onClick={() => !formData.uploadedImage && fileInputRef.current?.click()}>
                    {formData.uploadedImage ? (
                      <div className="relative">
                        <img src={formData.uploadedImage} alt="Upload preview"
                          className="w-full h-28 object-cover rounded-md" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-600 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-gray-500 text-sm">
                        <Upload className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                        <span>Upload your own photo</span>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  {/* AI Freshness from image */}
                  {isAnalyzing && (
                    <div className="text-xs text-emerald-600 flex items-center gap-1 mb-2">
                      <Sparkles className="w-3 h-3 animate-spin" /> Detecting food &amp; analysing freshness...
                    </div>
                  )}
                  {aiFreshness && !isAnalyzing && (
                    <div className={`p-2 rounded-lg border text-xs mb-2 ${aiFreshness.color}`}>
                      <div className="flex items-center gap-1 font-bold mb-0.5">
                        {aiFreshness.isFoodDetected
                          ? <><Sparkles className="w-3 h-3" /> AI: {aiFreshness.label} ({aiFreshness.score}/100)</>
                          : <><X className="w-3 h-3" /> {aiFreshness.label}</>
                        }
                      </div>
                      <p>{aiFreshness.advice}</p>
                      {!aiFreshness.isFoodDetected && (
                        <p className="mt-1 font-semibold">Please upload a clear photo of the food item only.</p>
                      )}
                    </div>
                  )}

                  {/* Preset picker (shown when no upload) */}
                  {!formData.uploadedImage && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Or choose a preset image:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PRESET_IMAGES).map(([name, url]) => (
                          <div key={name}
                            onClick={() => setFormData({ ...formData, imageSelection: name })}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 h-16 group
                              ${formData.imageSelection === name ? 'border-emerald-500' : 'border-transparent'}`}>
                            <img src={url} alt={name} className="w-full h-full object-cover group-hover:opacity-80" />
                            <div className="absolute inset-x-0 bottom-0 bg-white/90 text-center text-[9px] font-medium py-0.5">{name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as FoodCategory })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="Cooked Food">Cooked Food</option>
                    <option value="Raw Veggies">Raw Veggies</option>
                    <option value="Packed Grains">Grains/Legumes (Packed)</option>
                    <option value="Bakery">Breads/Bakery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                  <select value={formData.dietType}
                    onChange={e => setFormData({ ...formData, dietType: e.target.value as DietType })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Servings *</label>
                <input required type="text" placeholder="e.g., 40 plates or 20 kg"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumable Within (Hours) *</label>
                  <input required type="number" min="1" max="72"
                    value={formData.consumableHours}
                    onChange={e => setFormData({ ...formData, consumableHours: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address / Hub *</label>
                  <input required type="text" placeholder="Location"
                    value={formData.pickupAddress}
                    onChange={e => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>

              {/* AI Allocation Insight */}
              <div className={`p-4 rounded-lg border text-sm ${aiSuggestion.urgencyColor}`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="w-4 h-4" />
                  AI Allocation Insight — {aiSuggestion.urgencyLevel} Priority
                </div>
                <p className="mb-1">{aiSuggestion.allocationAdvice}</p>
                <p className="opacity-80">💡 {aiSuggestion.servingTip}</p>
              </div>

              <button type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-md shadow hover:bg-emerald-700 transition">
                Post Donation
              </button>
            </form>
          </div>
        </div>

        {/* Listings Sidebar */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full max-h-[900px] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Listings</h2>
            {donations.length === 0 ? (
              <p className="text-gray-500 text-sm">No listings found. Post some food above!</p>
            ) : (
              <div className="space-y-4">
                {donations.slice().reverse().map(d => {
                  const freshness = getFreshnessTime(d.createdAt, d.consumableHours);
                  return (
                    <div key={d.id} className="border p-4 rounded-lg relative overflow-hidden">
                      <div className="flex gap-4">
                        <img src={d.image} alt={d.foodName} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 line-clamp-1">{d.foodName}</h4>
                          <p className="text-xs text-gray-500 mt-1">{d.quantity} • {d.dietType}</p>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1
                            ${d.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              d.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'}`}>
                            {d.status}
                          </span>
                          {/* Live freshness countdown */}
                          {!freshness.isExpired ? (
                            <FreshnessBadge createdAt={d.createdAt} consumableHours={d.consumableHours} />
                          ) : (
                            <span className="block mt-1 text-xs text-gray-400 font-medium">Expired</span>
                          )}
                        </div>
                      </div>
                      {d.ngoId && (
                        <div className="mt-4 pt-3 border-t text-sm">
                          <p className="text-gray-600 mb-1">Assigned NGO/Delivery</p>
                          <a href="tel:9999999999" className="text-emerald-600 flex items-center font-medium">
                            <PhoneCall className="w-4 h-4 mr-1" /> Call Partner
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
