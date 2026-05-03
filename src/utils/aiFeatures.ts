import { Donation, FoodCategory } from './types';

// ---------------------------------------------------------------------------
// Smart Food Allocation Suggestion
// ---------------------------------------------------------------------------

export interface AllocationSuggestion {
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
  urgencyColor: string;
  allocationAdvice: string;
  servingTip: string;
  priorityScore: number; // 0-100, higher = more urgent
}

export function getAIAllocationSuggestion(donation: Donation): AllocationSuggestion {
  const hours = donation.consumableHours;

  const categoryAdvice: Record<FoodCategory, string> = {
    'Cooked Food': 'Prioritise immediate distribution — cooked food degrades fastest. Assign to nearest beneficiaries.',
    'Raw Veggies': 'Store in a cool place; distribute within the consumption window. Great for cooking programmes.',
    'Packed Grains': 'Shelf-stable — can be held for distribution events or packed into dry-ration kits.',
    'Bakery': 'Best consumed fresh. Distribute to breakfast programmes or children\'s centres first.',
  };

  const servingTips: Record<FoodCategory, string> = {
    'Cooked Food': 'Serve hot if possible; reheat to 75°C before serving.',
    'Raw Veggies': 'Wash thoroughly before use. Ideal for community kitchens.',
    'Packed Grains': 'Check packaging seal before distribution.',
    'Bakery': 'Pair with spreads or tea for a complete snack.',
  };

  let urgencyLevel: AllocationSuggestion['urgencyLevel'];
  let urgencyColor: string;
  let priorityScore: number;

  if (hours <= 2) {
    urgencyLevel = 'CRITICAL';
    urgencyColor = 'text-red-600 bg-red-50 border-red-200';
    priorityScore = 100;
  } else if (hours <= 6) {
    urgencyLevel = 'HIGH';
    urgencyColor = 'text-orange-600 bg-orange-50 border-orange-200';
    priorityScore = 70;
  } else {
    urgencyLevel = 'NORMAL';
    urgencyColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    priorityScore = 40;
  }

  // Boost score for cooked food (perishable)
  if (donation.category === 'Cooked Food') priorityScore = Math.min(100, priorityScore + 20);

  return {
    urgencyLevel,
    urgencyColor,
    allocationAdvice: categoryAdvice[donation.category],
    servingTip: servingTips[donation.category],
    priorityScore,
  };
}

// ---------------------------------------------------------------------------
// Demand Prediction
// ---------------------------------------------------------------------------

export interface DemandPrediction {
  topCategory: FoodCategory | string;
  peakHour: string;
  weeklyForecast: { day: string; predicted: number }[];
  insight: string;
}

export function getDemandPrediction(donations: Donation[]): DemandPrediction {
  if (donations.length === 0) {
    return {
      topCategory: 'Cooked Food',
      peakHour: '12:00 – 14:00',
      weeklyForecast: generateDefaultForecast(),
      insight: 'Not enough data yet. Based on global food rescue patterns, lunch hours see peak donations.',
    };
  }

  // Category frequency
  const catCount: Record<string, number> = {};
  donations.forEach(d => {
    catCount[d.category] = (catCount[d.category] || 0) + 1;
  });
  const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Cooked Food';

  // Hour frequency from createdAt
  const hourCount: Record<number, number> = {};
  donations.forEach(d => {
    if (d.createdAt) {
      const hr = new Date(d.createdAt).getHours();
      hourCount[hr] = (hourCount[hr] || 0) + 1;
    }
  });
  const peakHourNum = Object.entries(hourCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
  const peakHour = peakHourNum ? `${peakHourNum}:00 – ${String(Number(peakHourNum) + 1).padStart(2, '0')}:00` : '12:00 – 13:00';

  // Day-of-week distribution
  const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  donations.forEach(d => {
    if (d.createdAt) {
      const dow = new Date(d.createdAt).getDay();
      dayCount[dow] = (dayCount[dow] || 0) + 1;
    }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxDay = Math.max(...Object.values(dayCount), 1);
  const weeklyForecast = days.map((day, i) => ({
    day,
    predicted: Math.round((dayCount[i] / maxDay) * 10),
  }));

  const delivered = donations.filter(d => d.status === 'Delivered').length;
  const rate = donations.length > 0 ? Math.round((delivered / donations.length) * 100) : 0;

  const insight = `${topCategory} is the most donated category (${catCount[topCategory] || 0} listings). ` +
    `Delivery success rate is ${rate}%. ` +
    `Peak donation activity is around ${peakHour}. ` +
    `Consider pre-positioning delivery partners during this window.`;

  return { topCategory, peakHour, weeklyForecast, insight };
}

function generateDefaultForecast() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pattern = [3, 6, 7, 8, 8, 9, 5]; // Weekdays busier
  return days.map((day, i) => ({ day, predicted: pattern[i] }));
}

// ---------------------------------------------------------------------------
// AI Chatbot Response Engine
// ---------------------------------------------------------------------------

export interface ChatContext {
  pendingDonations: number;
  totalDonations: number;
  deliveredCount: number;
  registeredUsers: number;
}

export function getAIChatResponse(message: string, context: ChatContext): string {
  const lower = message.toLowerCase().trim();
  const { pendingDonations, totalDonations, deliveredCount, registeredUsers } = context;

  // Greetings
  if (/^(hi|hello|hey|hii|namaste|good (morning|evening|afternoon))/.test(lower)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}! I'm ShareFood AI. There are currently ${pendingDonations} donation(s) waiting to be claimed. How can I assist you today?`;
  }

  // Status / stats queries
  if (lower.includes('how many') || lower.includes('status') || lower.includes('stats') || lower.includes('statistics')) {
    return `Here's a live snapshot: ${totalDonations} total donations listed, ${pendingDonations} pending, ${deliveredCount} successfully delivered to those in need, and ${registeredUsers} users on the platform.`;
  }

  // Donation-related
  if (lower.includes('donate') || lower.includes('post food') || lower.includes('list food') || lower.includes('how to donate')) {
    return `To donate, register or log in as a Donor. From your dashboard, fill in the food name, category, quantity, expiry window, and pickup address. Once posted, NGOs in the area can instantly claim your donation!`;
  }

  // NGO / Accept
  if (lower.includes('ngo') || lower.includes('accept') || lower.includes('claim')) {
    return `NGOs can browse all ${pendingDonations} pending donation(s) on their dashboard map and list. Click "Accept Donation" and a delivery partner will be automatically assigned. You can then track the delivery in real time.`;
  }

  // Delivery / tracking
  if (lower.includes('delivery') || lower.includes('track') || lower.includes('driver') || lower.includes('pickup')) {
    return `Delivery partners see all assigned tasks on their dashboard with a live route map. They can update status step-by-step: Assigned → Picked → On the Way → Delivered. Both donors and NGOs see these updates instantly.`;
  }

  // Expiry / urgency
  if (lower.includes('expir') || lower.includes('urgent') || lower.includes('fresh') || lower.includes('spoil')) {
    return `Every donation has a "Consumable Within" timer. Our AI marks donations with <2 hours as CRITICAL, <6 hours as HIGH priority, and the rest as Normal. NGOs are advised to prioritise CRITICAL items first.`;
  }

  // Password / login / registration help
  if (lower.includes('password') || lower.includes('login') || lower.includes('register') || lower.includes('sign')) {
    return `To register, choose your role (Donor, NGO, or Delivery), fill your name, email, 10-digit phone number, and a password of at least 6 characters. For login, use the same phone number and password. Admin login uses email + password.`;
  }

  // Food category advice
  if (lower.includes('cooked') || lower.includes('veggie') || lower.includes('grain') || lower.includes('bakery') || lower.includes('category')) {
    return `We support 4 food categories:\n• Cooked Food — highest urgency, serve ASAP\n• Raw Veggies — store cool, use within 24 hrs\n• Packed Grains — shelf-stable, for dry-ration kits\n• Bakery — best within 4-6 hrs, great for breakfast drives`;
  }

  // AI / smart features
  if (lower.includes('ai') || lower.includes('smart') || lower.includes('predict') || lower.includes('recommend')) {
    return `ShareFood AI provides: 🤖 Smart allocation advice for each donation (urgency level + serving tips), 📊 Demand prediction for admins (peak hours, top categories, weekly forecast), and 💬 This context-aware chatbot powered by live platform data.`;
  }

  // Food waste / impact
  if (lower.includes('waste') || lower.includes('impact') || lower.includes('hunger') || lower.includes('environment')) {
    return `So far, ${deliveredCount} donations have been successfully delivered — each one preventing food waste AND fighting hunger. Every kg of food rescued also saves CO₂ from landfill. Together we're making a real difference!`;
  }

  // Help / commands
  if (lower.includes('help') || lower.includes('what can you') || lower.includes('commands') || lower.includes('options')) {
    return `I can help with:\n• How to donate food\n• How NGOs accept donations\n• Delivery & tracking info\n• Login & registration\n• Food category guidance\n• Live platform stats\n• AI features explained\n\nJust ask naturally!`;
  }

  // Fallback with live data
  return `Thanks for your message! Right now there are ${pendingDonations} donation(s) waiting on the platform. Could you clarify what you need help with? You can ask about donating, accepting food, delivery tracking, or platform stats.`;
}
