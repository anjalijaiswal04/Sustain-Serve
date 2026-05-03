import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { Leaf, Users, Truck, Heart, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import heroImage from '../utils/hero.jpg';

export function LandingPage() {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'donor') return <Navigate to="/donor" replace />;
    if (user.role === 'ngo') return <Navigate to="/ngo" replace />;
    if (user.role === 'delivery') return <Navigate to="/delivery" replace />;
  }

  const partners = ['GreenEarth Hostels', 'Taj Hotels', 'BiteBite Caterers', 'City Harvest NGO', 'Hope Foundation'];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-emerald-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-emerald-950 tracking-tight leading-tight mb-6">
              Share Food, <span className="text-emerald-600">Save Lives,</span> Zero Waste.
            </h1>
            <p className="text-lg md:text-xl text-emerald-800 mb-8 max-w-lg">
              A Smart Food Donation & Distribution System connecting donors, NGOs, and delivery partners with real-time tracking and AI support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-center text-lg shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                Join the Movement <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" className="bg-emerald-100 text-emerald-800 px-8 py-4 rounded-full font-bold text-center text-lg hover:bg-emerald-200 transition-all">
                Learn More
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-300 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <img 
              src={heroImage}
              alt="People donating food"
              className="relative rounded-2xl shadow-2xl object-cover h-[500px] w-full"
            />
          </div>
        </div>
      </div>

      {/* Trust & Partners */}
      <section className="py-12 bg-white border-y border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-6">Trusted by Leading Organizations</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60">
            {partners.map(p => (
              <span key={p} className="text-xl font-bold text-gray-500">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">How ShareFood AI Works</h2>
            <p className="text-lg text-gray-600">Our real-time platform ensures surplus food reaches those in need swiftly and safely.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Donors Post Food</h3>
              <p className="text-gray-600">Restaurants, hostels, and individuals easily list surplus food with real-time expiry tracking.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. NGOs Accept</h3>
              <p className="text-gray-600">Registered NGOs get instant alerts about nearby available food and can claim it with one click.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Delivery & Tracking</h3>
              <p className="text-gray-600">Delivery partners are assigned to transport the food while everyone tracks the status live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold mb-4">Real Impact, Real Stories</h2>
            <p className="text-emerald-200">See what our community says about ShareFood AI.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-emerald-800 p-8 rounded-2xl">
              <div className="flex gap-1 text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
              </div>
              <p className="text-lg text-emerald-50 mb-6 font-medium italic">"As a busy restaurant, we used to throw away perfectly good surplus food. Now, we just list it on ShareFood AI and an NGO picks it up within an hour. Incredible platform!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">R</div>
                <div>
                  <h4 className="font-bold text-white">Rahul S.</h4>
                  <p className="text-emerald-300 text-sm">Owner, BiteBite Caterers</p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-800 p-8 rounded-2xl">
              <div className="flex gap-1 text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
              </div>
              <p className="text-lg text-emerald-50 mb-6 font-medium italic">"This platform has transformed our NGO's operations. The live tracking lets us know exactly when the food will arrive, ensuring we can serve people while the food is hot."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">A</div>
                <div>
                  <h4 className="font-bold text-white">Anita K.</h4>
                  <p className="text-emerald-300 text-sm">Director, Hope Foundation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
