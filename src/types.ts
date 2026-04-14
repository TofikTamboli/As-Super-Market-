export type UserRole = 'admin' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  createdAt: any;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export type PaymentMode = 'UPI' | 'COD';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  address: string;
  phone: string;
  items: OrderItem[];
  paymentMode: PaymentMode;
  total: number;
  isCompleted: boolean;
  createdAt: any;
}
