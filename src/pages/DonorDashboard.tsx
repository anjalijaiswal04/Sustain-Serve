import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '../utils/db';
import { useAuth } from '../utils/authContext';
import { useRealtime } from '../utils/useRealtime';
import { getAIAllocationSuggestion } from '../utils/aiFeatures';
import {
  getFreshnessTime, getPostedAgo, resizeImage,
  analyzeImageFreshness, getFreshnessVisual, ImageFreshnessResult,
} from '../utils/freshness';
import { Donation, FoodCategory, DietType } from '../utils/types';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Heart, Clock, CheckCircle, Star, PhoneCall,
  Sparkles, Upload, X, Timer, CalendarClock, Hourglass, ChevronDown,
} from 'lucide-react';

// ─── SmartSelect: custom dropdown that flips upward when near screen bottom ───
interface SmartSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}
function SmartSelect({ value, onChange, options }: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = options.length * 44 + 8;
      setOpenUp(spaceBelow < menuHeight && rect.top > menuHeight);
    }
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        className="w-full px-4 py-2 border rounded-md bg-white text-left flex items-center justify-between
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
          hover:border-emerald-400 transition text-sm text-gray-900"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl
            overflow-hidden ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition
                ${opt.value === value
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-gray-800 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PRESET_IMAGES: Record<string, string> = {
  'Healthy Meal (Cooked)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'Fresh Veggies (Raw)': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
  'Grains/Legumes (Packed)': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
  'Breads/Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
};

// ─── Dual timer card: "posted X ago" + "Xh Ym left" + freshness bar ──────────
function DualTimerCard({ createdAt, consumableHours }: { createdAt: string; consumableHours: number }) {
  const [freshness, setFreshness] = useState(() => getFreshnessTime(createdAt, consumableHours));
  const [postedAgo, setPostedAgo] = useState(() => getPostedAgo(createdAt));

  useEffect(() => {
    const id = setInterval(() => {
      setFreshness(getFreshnessTime(createdAt, consumableHours));
      setPostedAgo(getPostedAgo(createdAt));
    }, 30_000);
    return () => clearInterval(id);
  }, [createdAt, consumableHours]);

  return (
    <div className="mt-2 space-y-1.5">
      {/* Row 1: posted ago */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Posted {postedAgo}</span>
      </div>

      {/* Row 2: consume countdown */}
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${freshness.isExpired ? 'text-gray-400' : freshness.color.split(' ')[0]}`}>
        <Hourglass className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          {freshness.isExpired
            ? 'Consumption window expired'
            : `Consume within: ${freshness.hoursLeft > 0 ? `${freshness.hoursLeft}h ` : ''}${freshness.minutesLeft}m`}
        </span>
      </div>

      {/* Row 3: freshness progress bar */}
      {!freshness.isExpired && (
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${freshness.barColor}`}
            style={{ width: `${freshness.percentRemaining}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── AI Freshness Panel — score only, no text descriptions ───────────────────
function FreshnessPanel({
  imageDataUrl, score, category, foodName, consumableHours,
}: {
  imageDataUrl: string;
  score: number;
  category: FoodCategory;
  foodName: string;
  consumableHours: number;
}) {
  const visual = getFreshnessVisual(score, category, foodName);

  // Fake a "just posted" entry so we can show the freshness timer in the panel
  const fakeCreatedAt = useMemo(() => new Date().toISOString(), []);
  const [freshnessTime, setFreshnessTime] = useState(() =>
    getFreshnessTime(fakeCreatedAt, consumableHours)
  );
  useEffect(() => {
    setFreshnessTime(getFreshnessTime(fakeCreatedAt, consumableHours));
  }, [fakeCreatedAt, consumableHours]);

  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${visual.borderColor}`}>
      {/* Image with CSS filter matching freshness */}
      <div className="relative">
        <img
          src={imageDataUrl}
          alt="Food preview"
          className="w-full h-32 object-cover transition-all duration-500"
          style={{ filter: visual.imageFilter }}
        />
        {/* Band label chip on image */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold border ${visual.bgColor} ${visual.textColor} ${visual.borderColor}`}>
          {visual.label}
        </div>
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${visual.bgColor} ${visual.textColor} ${visual.borderColor}`}>
          {visual.badge}
        </div>
      </div>

      {/* Score row */}
      <div className={`px-3 pt-3 pb-2 ${visual.bgColor}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${visual.textColor}`}>
            <Sparkles className="w-3.5 h-3.5" /> AI Freshness Score
          </span>
          <span className={`text-2xl font-black tabular-nums ${visual.textColor}`}>
            {score}
            <span className="text-sm font-normal opacity-50">/100</span>
          </span>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-white/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ${visual.scoreBarColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Freshness timers preview */}
      <div className={`px-3 pb-3 pt-1 ${visual.bgColor} border-t ${visual.borderColor}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">
          Freshness Timer Preview
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Posted: Just now</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${freshnessTime.color.split(' ')[0]}`}>
          <Hourglass className="w-3.5 h-3.5" />
          <span>
            Consume within: {consumableHours}h 0m (from time of posting)
          </span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/30">
          <div className={`h-full rounded-full ${freshnessTime.barColor}`} style={{ width: '100%' }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Bar drains to zero over {consumableHours}h after posting</p>
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
          { icon: Heart,        bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Total Donations',  val: stats.total },
          { icon: Clock,        bg: 'bg-yellow-100',  color: 'text-yellow-600',  label: 'Active Listings',  val: stats.active },
          { icon: CheckCircle,  bg: 'bg-blue-100',    color: 'text-blue-600',    label: 'Delivered',        val: stats.delivered },
          { icon: Star,         bg: 'bg-purple-100',  color: 'text-purple-600',  label: 'Your Score',       val: `${stats.score}/5` },
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
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 mb-2 text-center cursor-pointer transition
                      ${formData.uploadedImage ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'}`}
                    onClick={() => !formData.uploadedImage && fileInputRef.current?.click()}>
                    {formData.uploadedImage ? (
                      <div className="relative">
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
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — AI will verify &amp; score freshness</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  {isAnalyzing && (
                    <div className="text-xs text-emerald-700 flex items-center gap-1.5 py-1">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      Detecting food &amp; scoring freshness…
                    </div>
                  )}

                  {aiFreshness && !aiFreshness.isFoodDetected && !isAnalyzing && (
                    <div className="p-2 rounded-lg border border-red-300 bg-red-50 text-xs text-red-800">
                      <div className="flex items-center gap-1 font-bold mb-0.5"><X className="w-3 h-3" /> No Food Detected</div>
                      <p>Please upload a clear photo of the food item only.</p>
                    </div>
                  )}

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

              {/* ── AI Freshness Panel (score only) ── */}
              {aiFreshness?.isFoodDetected && formData.uploadedImage && !isAnalyzing && (
                <FreshnessPanel
                  imageDataUrl={formData.uploadedImage}
                  score={aiFreshness.score}
                  category={formData.category}
                  foodName={formData.foodName || 'Food item'}
                  consumableHours={formData.consumableHours}
                />
              )}

              {/* Category & Diet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <SmartSelect
                    value={formData.category}
                    onChange={val => setFormData(p => ({ ...p, category: val as FoodCategory }))}
                    options={[
                      { value: 'Cooked Food',   label: 'Cooked Food' },
                      { value: 'Raw Veggies',   label: 'Raw Veggies' },
                      { value: 'Packed Grains', label: 'Grains/Legumes (Packed)' },
                      { value: 'Bakery',        label: 'Breads/Bakery' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                  <SmartSelect
                    value={formData.dietType}
                    onChange={val => setFormData(p => ({ ...p, dietType: val as DietType }))}
                    options={[
                      { value: 'Veg',     label: 'Veg' },
                      { value: 'Non-Veg', label: 'Non-Veg' },
                      { value: 'Vegan',   label: 'Vegan' },
                    ]}
                  />
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
                  {/* Live freshness window preview */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Timer className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      Freshness window: <span className="font-semibold text-gray-700">{formData.consumableHours}h</span> from posting time
                    </span>
                  </div>
                  {/* Sample bar showing full freshness at post time */}
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Posted now</span>
                    <span>Expires in {formData.consumableHours}h</span>
                  </div>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Listings</h2>
            {donations.length === 0
              ? <p className="text-gray-500 text-sm">No listings yet. Post some food above!</p>
              : (
                <div className="space-y-4">
                  {donations.slice().reverse().map(d => {
                    const freshness = getFreshnessTime(d.createdAt, d.consumableHours);
                    return (
                      <div key={d.id} className="border rounded-xl overflow-hidden shadow-sm">
                        {/* Image with live freshness CSS filter */}
                        <div className="relative h-28 bg-gray-100">
                          <img
                            src={d.image}
                            alt={d.foodName}
                            className="w-full h-full object-cover transition-all duration-700"
                            style={{
                              filter: freshness.isExpired
                                ? 'saturate(0.1) brightness(0.7) sepia(0.5)'
                                : freshness.percentRemaining > 75 ? 'saturate(1.2) brightness(1.05)'
                                : freshness.percentRemaining > 50 ? 'saturate(1.0)'
                                : freshness.percentRemaining > 25 ? 'saturate(0.55) brightness(0.92)'
                                : 'saturate(0.25) brightness(0.82) sepia(0.2)',
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                            <p className="text-white font-bold text-sm line-clamp-1">{d.foodName}</p>
                          </div>
                          <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-full
                            ${d.status === 'Pending' ? 'bg-yellow-400 text-yellow-900' :
                              d.status === 'Delivered' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {d.status}
                          </span>
                        </div>

                        {/* Details + timers */}
                        <div className="px-3 pt-2 pb-3">
                          <p className="text-xs text-gray-500 mb-1">{d.quantity} · {d.dietType} · {d.category}</p>

                          {/* Dual timer widget */}
                          <DualTimerCard createdAt={d.createdAt} consumableHours={d.consumableHours} />

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
