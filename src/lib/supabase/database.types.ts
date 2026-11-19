import type {
  BusinessProfile,
  Customer,
  Invoice,
  InvoiceItem,
  Product,
} from "@/types/database.types";
import type { Json } from "@/types/database.types";

type Table<Row, Insert, Update> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

type BusinessProfileRow = BusinessProfile & {
  owner_id: string;
  catalogue_seeded_at: string | null;
};
type CustomerRow = Customer & { owner_id: string };
type ProductRow = Product & { owner_id: string };
type InvoiceRow = Omit<Invoice, "items"> & {
  owner_id: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  customer_gstin: string | null;
  tax_amount: number;
};
type InvoiceItemRow = InvoiceItem & {
  owner_id: string;
  invoice_id: string;
  position: number;
  total_price: number;
};
type AssetRow = {
  id: string;
  owner_id: string;
  type: "logo" | "qr" | "signature" | "stamp";
  object_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      business_profiles: Table<
        BusinessProfileRow,
        Omit<BusinessProfileRow, "id" | "created_at" | "updated_at"> & Partial<Pick<BusinessProfileRow, "id" | "created_at" | "updated_at">>,
        Partial<BusinessProfileRow>
      >;
      customers: Table<
        CustomerRow,
        Omit<CustomerRow, "id" | "created_at" | "updated_at"> & Partial<Pick<CustomerRow, "id" | "created_at" | "updated_at">>,
        Partial<CustomerRow>
      >;
      products: Table<
        ProductRow,
        Omit<ProductRow, "id" | "created_at" | "updated_at"> & Partial<Pick<ProductRow, "id" | "created_at" | "updated_at">>,
        Partial<ProductRow>
      >;
      invoices: Table<
        InvoiceRow,
        Omit<InvoiceRow, "id" | "created_at" | "updated_at"> & Partial<Pick<InvoiceRow, "id" | "created_at" | "updated_at">>,
        Partial<InvoiceRow>
      >;
      invoice_items: Table<
        InvoiceItemRow,
        Omit<InvoiceItemRow, "id" | "created_at"> & Partial<Pick<InvoiceItemRow, "id" | "created_at">>,
        Partial<InvoiceItemRow>
      >;
      assets: Table<
        AssetRow,
        Omit<AssetRow, "id" | "created_at"> & Partial<Pick<AssetRow, "id" | "created_at">>,
        Partial<AssetRow>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      save_invoice: {
        Args: {
          p_invoice_id: string | null;
          p_invoice: Json;
          p_items: Json;
        } & Record<string, unknown>;
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
