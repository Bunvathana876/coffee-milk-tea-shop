export interface Category {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  is_active: boolean;
  product_count?: number | null;
  created_at?: string;
  products?: ProductSummary[];
}

export interface ProductSummary {
  id: number;
  name: string;
  description?: string | null;
  base_price_usd: number;
  image?: string | null;
  is_available: boolean;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  base_price_usd: number;
  is_available: boolean;
  category_name?: string | null;
  category?: Category | null;
  created_at?: string;
}

export type DrinkSize = 'Small' | 'Medium' | 'Large';
export type SugarLevel = '0%' | '25%' | '50%' | '75%' | '100%';
export type IceLevel = 'No Ice' | 'Less Ice' | 'Normal Ice' | 'Extra Ice';

export interface DrinkCustomization {
  size: DrinkSize;
  sugar_level: SugarLevel;
  ice_level: IceLevel;
  quantity: number;
  unit_price_usd: number;
  subtotal_usd: number;
}

export interface CartItem {
  id: string;
  productId: number;
  productName: string;
  image?: string | null;
  size: DrinkSize;
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  unitPriceUsd: number;
  quantity: number;
  subtotalUsd: number;
}

export interface CartState {
  items: CartItem[];
  totalQuantity: number;
  subtotalUsd: number;
  totalPriceUsd: number;
  totalPriceKhr: number;
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'id' | 'subtotalUsd'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'INCREASE_QUANTITY'; payload: { id: string } }
  | { type: 'DECREASE_QUANTITY'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'RESTORE_CART'; payload: { items: CartItem[] } }
  | { type: 'CLEAR_CART' };



export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price_usd: number;
  subtotal_usd: number;
  size: string;
  sugar_level: string;
  ice_level: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  subtotal_usd: number;
  total_usd: number;
  total_khr: number;
  payment_status: 'pending' | 'paid' | 'failed';
  order_status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  created_at: string;
  items?: OrderItem[];
}

export interface HealthCheckResponse {
  status: string;
  message: string;
  app: string;
  version: string;
  environment: string;
}
