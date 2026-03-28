import { HeartHandshake } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-emerald-900 text-emerald-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center space-x-2 text-xl font-bold text-white mb-4">
            <HeartHandshake className="w-6 h-6" />
            <span>ShareFood AI</span>
          </div>
          <p className="text-sm text-emerald-300">
            A Smart Food Donation & Distribution System reducing food waste by connecting Donors with NGOs and Delivery Partners seamlessly.
          </p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Platform</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition">About Us</a></li>
            <li><a href="#" className="hover:text-white transition">How it Works</a></li>
            <li><a href="#" className="hover:text-white transition">Partner NGOs</a></li>
            <li><a href="#" className="hover:text-white transition">Donor Guidelines</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white transition">Trust & Safety</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li>Email: support@sharefood.ai</li>
            <li>Phone: +1 (800) 123-4567</li>
            <li>Address: 123 Green Way, Earth 45678</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-emerald-800 text-sm text-center text-emerald-400">
        &copy; {new Date().getFullYear()} ShareFood AI. All rights reserved. Built for a greener future.
      </div>
    </footer>
  );
}
