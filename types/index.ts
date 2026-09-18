// types/index.ts — Delivery App Types

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image?: string;
  average_rating?: string;
  total_reviews?: number;
  memberships: UserMembership[];
}

export interface DeliveryReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  customer_name: string | null;
  customer_image: string | null;
  order_number: number | null;
}

export interface DeliveryReviewsResponse {
  average_rating: string;
  total_reviews: number;
  distribution: Record<string, number>;
  reviews: DeliveryReview[];
}

export interface UserMembership {
  company_id: number;
  company_name: string;
  company_slug: string;
  role: string;
  is_active: boolean;
}

export interface VendorOrderDetail {
  master_order_id: number;
  id?: number;
  amount?: string;
  subtotal?: string;
  tax_amount?: string;
  delivery_fee?: string;
  status?: string;
  delivery_status?: string;
  delivery_notes?: string;
  payment_method?: string;
  payment_status?: string;
  fulfillment_type?: string;
  table_number?: string | null;
  created_at?: string;
  company?: {
    id: number;
    name: string;
    name_am?: string;
    slug: string;
    logo?: string | null;
    business_type?: string;
    address?: string;
  };
  tax_invoice?: {
    currency?: string;
    invoice_number?: string;
  };
  items?: Array<{
    id: number;
    title: string;
    qty: number;
    unit_price: string;
  }>;
}

export interface DeliveryAssignment {
  id: number;
  tracking_id: string;
  vendor_order: number;
  vendor_order_detail: VendorOrderDetail;
  delivery_person: number;
  status: DeliveryStatus;
  driver_earning?: string;
  order_number?: string;
  payment_method?: string;
  payment_method_display?: string;
  payment_status?: string;
  company_logo?: string | null;
  company_slug?: string;
  last_lat: string | null;
  last_lon: string | null;
  assigned_at: string;
  completed_at: string | null;
  // Nested routing data from serializer
  customer_lat: string | null;
  customer_lon: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_image: string | null;
  company_name: string | null;
  company_name_am: string | null;
  company_address: string | null;
}

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface DriverEarningItem {
  id: number;
  tracking_id: string;
  master_order_id: number;
  vendor_order_id: number;
  order_number: string;
  driver_earning: string;
  delivery_fee: string;
  order_total: string;
  payment_method: 'bank_transfer' | 'cod' | 'chapa' | 'telebirr' | string;
  payment_method_display: string;
  payment_status: string;
  company_name: string;
  company_name_am?: string | null;
  company_slug: string;
  company_logo?: string | null;
  company_address?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  shipping_address?: string | null;
  status: DeliveryStatus;
  assigned_at: string;
  completed_at: string | null;
}

export interface DriverEarningsSummary {
  today_earnings: string;
  today_completed_trips?: number;
  today_average_per_order?: string;
  week_earnings: string;
  week_completed_trips?: number;
  week_average_per_order?: string;
  month_earnings: string;
  month_completed_trips?: number;
  month_average_per_order?: string;
  total_lifetime_earnings: string;
  total_completed_trips: number;
  average_per_order: string;
  payment_breakdown: {
    bank_transfer: string;
    cod: string;
    chapa: string;
    telebirr: string;
  };
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

