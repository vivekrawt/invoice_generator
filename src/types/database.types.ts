export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface BusinessProfile {
  id: string;
  business_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string | null;
  pan: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  upi_id: string | null;
  logo_url: string | null;
  payment_qr_url: string | null;
  default_terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  contact_person: string | null;
  phone: string;
  email: string | null;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  recipient_name: string;
  delivery_address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Product {
  id: string;
  category: string;
  product_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  product_id?: string | null;
  category?: string | null;
  product_name: string;
  description?: string | null;
  hsn_sac?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  line_amount: number;
  created_at?: string;
}

export interface CustomerSnapshot {
  customer_id?: string | null;
  customer_name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string | null;
}

export interface BusinessSnapshot {
  business_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string | null;
  pan?: string | null;
  bank_account_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  upi_id?: string | null;
  logo_url?: string | null;
  payment_qr_url?: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  financial_year: string;
  serial_number: string;
  invoice_date: string;
  po_number: string | null;
  po_date: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_snapshot: CustomerSnapshot;
  shipping_snapshot: ShippingAddress | null;
  business_snapshot: BusinessSnapshot;
  subtotal: number;
  adjustments: number;
  total_amount: number;
  amount_in_words: string;
  terms: string | null;
  additional_notes: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Items relation when queried with join
  items?: InvoiceItem[];
}
