export type Role = 'donor' | 'ngo' | 'delivery' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string; // Stored in mock DB
  role: Role;
  address?: string;
  rating?: number;
  joinedDate?: string;
}

export type FoodCategory = 'Cooked Food' | 'Raw Veggies' | 'Packed Grains' | 'Bakery';
export type DietType = 'Veg' | 'Non-Veg' | 'Vegan';

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  foodName: string;
  category: FoodCategory;
  dietType: DietType;
  quantity: string;
  consumableHours: number;
  pickupAddress: string;
  image: string; // URL
  status: 'Pending' | 'Accepted' | 'Assigned' | 'Picked' | 'OnTheWay' | 'Delivered' | 'Expired';
  ngoId?: string;
  deliveryId?: string;
  createdAt: string;
  ratings?: {
    food?: number;
    delivery?: number;
    comment?: string;
  };
}

export interface DeliveryTask {
  id: string;
  donationId: string;
  deliveryId: string;
  status: 'Assigned' | 'Picked' | 'OnTheWay' | 'Delivered';
  location: { lat: number; lng: number }; // Mock live location
  updatedAt: string;
}
