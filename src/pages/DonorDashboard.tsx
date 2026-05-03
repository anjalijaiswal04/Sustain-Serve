import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getAIAllocationSuggestion } from '../utils/aiFeatures';
import {
  getFreshnessTime, resizeImage, analyzeImageFreshness,
  getFreshnessVisual, ImageFreshnessResult,
} from '../utils/freshness';
import { Donation, FoodCategory, DietType } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Heart, Clock, CheckCircle, Star, PhoneCall,
  Sparkles, Upload, X, Timer, Eye,
} from 'lucide-react';

const PRESET_IMAGES: Record<string, string> = {
  'Healthy Meal (Cooked)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Fresh Veggies (Raw)': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
  'Grains/Legumes (Packed)': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
  'Breads/Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
};

// Live countdown badge for listing cards
function FreshnessBadge({ createdAt, consumableHours }: { createdAt: string; consumableHours: number }) {
  const [info, setInfo] = useState(() => getFreshnessTime(createdAt, consumableHours));
  useEffect(() => {
    const id = setInterval(() => setInfo(getFreshnessTime(createdAt, consumableHours)), 30000);
    return () => clearInterval(id);
  }, [createdAt, consumableHours]);
  return (
    <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-full border inline-flex items-center gap-1 ${info.color}`}>
      <Timer className="w-3 h-3" />{info.label}
    </div>
  );
}

// ─── AI Freshness Visual Panel ───────────────────────────────────────────────
// Shows the uploaded image with a CSS filter matching freshness, a score bar,
// category-specific appearance text, and action advice.
function FreshnessPanel({
  imageDataUrl, score, category, foodName,
}: {
  imageDataUrl: string;
  score: number;
  category: FoodCategory;
  foodName: string;
}) {
  const visual = getFreshnessVisual(score, category, foodName);

  return (
    <div className={`mt-3 rounded-xl border-2 overflow-hidden shadow-sm ${visual.borderColor}`}>
      {/* Image with live CSS filter */}
      <div className="relative">
        <img
          src={imageDataUrl}
          alt="Food preview"
          className={`w-full h-36 object-cover transition-all duration-500 ${visual.glowClass}`}
          style={{ filter: visual.imageFilter }}
        />
        {/* Freshness band overlay label at bottom of image */}
        <div className={`absolute bottom-0 inset-x-0 px-3 py-1.5 flex items-center justify-between
          ${visual.bgColor} ${visual.textColor} border-t ${visual.borderColor}`}>
          <span className="flex items-center gap-1.5 font-bold text-sm">
            <Eye className="w-4 h-4" /> {visual.label}
          </span>
          <span className="text-xs font-semibold opacity-80">{visual.badge}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className={`px-3 pt-3 pb-1 ${visual.bgColor}`}>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-semibold ${visual.textColor}`}>AI Freshness Score</span>
          <span className={`font-bold text-sm ${visual.textColor}`}>{score}<span className="font-normal opacity-60">/100</span></span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ${visual.scoreBarColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Category-specific appearance description */}
      <div className={`px-3 pt-2 pb-1 ${visual.bgColor}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
          How your {category} looks right now
        </p>
        <p className={`text-xs leading-snug ${visual.textColor}`}>{visual.appearance}</p>
      </div>

      {/* Action advice */}
      <div className={`px-3 py-2 ${visual.bgColor} border-t ${visual.borderColor}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-0.5">Recommendation</p>
        <p className={`text-xs font-medium ${visual.textColor}`}>{visual.advice}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
    uploadedImage: '',
    useUpload: false,
  });

  const [aiFreshness, setAiFreshness] = useState<ImageFreshnessResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Re-compute visuals reactively when category or food name changes — no re-upload needed
  const freshnessVisual = useMemo(() => {
    if (!aiFreshness?.isFoodDetected || aiFreshness.score === 0) return null;
    return getFreshnessVisual(aiFreshness.score, formData.category, formData.foodName);
  }, [aiFreshness, formData.category, formData.foodName]);

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
      setFormData(prev => ({ ...prev, uploadedImage: resized, useUpload: true }));

      const result = await analyzeImageFreshness(resized);
      setAiFreshness(result);

      if (!result.isFoodDetected) {
        setFormData(prev => ({ ...prev, uploadedImage: '', useUpload: false }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.error('No food detected. Please upload a clear food photo.');
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
    toast.success('Donation listed! All NGOs have been notified in real time.');

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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Heart, bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Total Donations', val: stats.total },
          { icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600', label: 'Active Listings', val: stats.active },
          { icon: CheckCircle, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Delivered', val: stats.delivered },
          { icon: Star, bg: 'bg-purple-100', color: 'text-purple-600', label: 'Your Score', val: `${stats.score}/5` },
        ].map(({ icon: Icon, bg, color, label, val }) => (
          <div key={label} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center shadow-sm">
            <div className={`${bg} p-3 rounded-xl ${color} mr-4`}><Icon className="w-6 h-6" /></div>
            <div><p className="text-gray-500 text-sm">{label}</p><p className="text-2xl font-bold">{val}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Donation Form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Post Food Donation Listing</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Food name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Product Name *</label>
                  <input required type="text" placeholder="e.g., Dal Fry and Naan"
                    value={formData.foodName}
                    onChange={e => setFormData(p => ({ ...p, foodName: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Image *</label>

                  {/* Drop zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 mb-2 text-center cursor-pointer transition
                      ${formData.uploadedImage ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'}`}
                    onClick={() => !formData.uploadedImage && fileInputRef.current?.click()}>
                    {formData.uploadedImage ? (
                      <div className="relative">
                        {/* Apply the CSS filter to this preview thumbnail */}
                        <img
                          src={formData.uploadedImage}
                          alt="Upload preview"
                          className="w-full h-24 object-cover rounded-md"
                          style={{ filter: freshnessVisual?.imageFilter ?? 'none' }}
                        />
                        <button type="button"
                          onClick={e => { e.stopPropagation(); clearUpload(); }}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-600 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-gray-500 text-sm">
                        <Upload className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                        <span>Upload your own food photo</span>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — AI will verify it's food</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  {/* Analysing spinner */}
                  {isAnalyzing && (
                    <div className="text-xs text-emerald-700 flex items-center gap-1.5 py-1">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      Detecting food &amp; scoring freshness…
                    </div>
                  )}

                  {/* Non-food rejection message */}
                  {aiFreshness && !aiFreshness.isFoodDetected && !isAnalyzing && (
                    <div className="p-2 rounded-lg border border-red-300 bg-red-50 text-xs text-red-800">
                      <div className="flex items-center gap-1 font-bold mb-0.5">
                        <X className="w-3 h-3" /> No Food Detected
                      </div>
                      <p>The image does not appear to contain food. Please upload a clear photo of the food item only.</p>
                    </div>
                  )}

                  {/* Preset grid (shown only when no upload) */}
                  {!formData.uploadedImage && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Or choose a preset image:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PRESET_IMAGES).map(([name, url]) => (
                          <div key={name}
                            onClick={() => setFormData(p => ({ ...p, imageSelection: name }))}
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

              {/* ── AI Freshness Visual Panel (shown when food is confirmed) ── */}
              {aiFreshness?.isFoodDetected && formData.uploadedImage && !isAnalyzing && (
                <FreshnessPanel
                  imageDataUrl={formData.uploadedImage}
                  score={aiFreshness.score}
                  category={formData.category}
                  foodName={formData.foodName || 'Food item'}
                />
              )}

              {/* Category & Diet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value as FoodCategory }))}
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
                    onChange={e => setFormData(p => ({ ...p, dietType: e.target.value as DietType }))}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Servings *</label>
                <input required type="text" placeholder="e.g., 40 plates or 20 kg"
                  value={formData.quantity}
                  onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
              </div>

              {/* Consumable hours & address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumable Within (Hours) *</label>
                  <input required type="number" min="1" max="72"
                    value={formData.consumableHours}
                    onChange={e => setFormData(p => ({ ...p, consumableHours: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address / Hub *</label>
                  <input required type="text" placeholder="Location"
                    value={formData.pickupAddress}
                    onChange={e => setFormData(p => ({ ...p, pickupAddress: e.target.value }))}
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

        {/* ── Your Listings ── */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full max-h-[900px] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Listings</h2>
            {donations.length === 0
              ? <p className="text-gray-500 text-sm">No listings yet. Post some food above!</p>
              : (
                <div className="space-y-4">
                  {donations.slice().reverse().map(d => {
                    const freshness = getFreshnessTime(d.createdAt, d.consumableHours);
                    return (
                      <div key={d.id} className="border rounded-lg overflow-hidden">
                        {/* Image strip with freshness filter applied */}
                        <div className="relative h-24 bg-gray-100">
                          <img
                            src={d.image}
                            alt={d.foodName}
                            className="w-full h-full object-cover"
                            style={{
                              filter: freshness.isExpired
                                ? 'saturate(0.1) brightness(0.7) sepia(0.5)'
                                : freshness.percentRemaining > 75 ? 'saturate(1.2) brightness(1.05)'
                                : freshness.percentRemaining > 50 ? 'saturate(1.0)'
                                : freshness.percentRemaining > 25 ? 'saturate(0.55) brightness(0.92)'
                                : 'saturate(0.25) brightness(0.82) sepia(0.2)',
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                            <p className="text-white font-bold text-sm line-clamp-1">{d.foodName}</p>
                          </div>
                          <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-full
                            ${d.status === 'Pending' ? 'bg-yellow-400 text-yellow-900' :
                              d.status === 'Delivered' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {d.status}
                          </span>
                        </div>

                        <div className="p-3">
                          <p className="text-xs text-gray-500">{d.quantity} • {d.dietType} • {d.category}</p>
                          {!freshness.isExpired
                            ? <FreshnessBadge createdAt={d.createdAt} consumableHours={d.consumableHours} />
                            : <span className="block mt-1 text-xs text-gray-400 font-medium">Expired</span>
                          }
                          {d.ngoId && (
                            <div className="mt-2 pt-2 border-t">
                              <a href="tel:9999999999" className="text-emerald-600 flex items-center text-xs font-medium">
                                <PhoneCall className="w-3 h-3 mr-1" /> Call Partner
                              </a>
                            </div>
                          )}
                        </div>
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
