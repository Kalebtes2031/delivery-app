// types/index.ts — Delivery App Types

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image?: string;
  memberships: UserMembership[];
}

export interface UserMembership {
  company_id: number;
  company_name: string;
  company_slug: string;
  role: string;
  is_active: boolean;
}

export interface DeliveryAssignment {
  id: number;
  tracking_id: string;
  vendor_order: number;
  delivery_person: number;
  status: DeliveryStatus;
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
  company_address: string | null;
}

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface LoginResponse {
  access: string;
  refresh: string;
}
