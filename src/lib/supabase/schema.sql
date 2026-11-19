-- ==============================================================================
-- ABIRA ENTERPRISES INVOICE GENERATOR - DATABASE SCHEMA & SEED SCRIPT
-- ==============================================================================
-- Run this entire script in your Supabase Project:
-- 1. Go to https://supabase.com -> Select your project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run" (or Ctrl+Enter)
-- ==============================================================================

-- 0. CLEAN RESET (Drops any old/partial tables to prevent column mismatch errors)
drop table if exists public.invoice_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.customers cascade;
drop table if exists public.products cascade;
drop table if exists public.business_profiles cascade;
drop table if exists public.assets cascade;

-- 1. BUSINESS PROFILES TABLE
create table public.business_profiles (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  business_name text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  phone text not null,
  email text,
  pan text,
  bank_account_name text,
  bank_name text,
  account_number text,
  ifsc text,
  upi_id text,
  logo_url text,
  payment_qr_url text,
  signature_url text,
  stamp_url text,
  default_terms text,
  catalogue_seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. CUSTOMERS TABLE
create table public.customers (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  customer_name text not null,
  contact_person text,
  phone text not null,
  email text,
  billing_address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. PRODUCTS TABLE
create table public.products (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  category text not null,
  product_name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. INVOICES TABLE
create table public.invoices (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  invoice_number text not null unique,
  financial_year text not null,
  serial_number text not null,
  invoice_date date not null,
  po_number text,
  po_date date,
  customer_id text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text,
  customer_city text,
  customer_state text,
  customer_pincode text,
  customer_gstin text,
  customer_snapshot jsonb not null,
  shipping_snapshot jsonb,
  business_snapshot jsonb not null,
  subtotal numeric(16, 2) not null check (subtotal >= 0),
  adjustments numeric(16, 2) not null default 0,
  tax_amount numeric(16, 2) not null default 0,
  total_amount numeric(16, 2) not null check (total_amount >= 0),
  amount_in_words text not null,
  terms text,
  additional_notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. INVOICE ITEMS TABLE
create table public.invoice_items (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  invoice_id text not null references public.invoices(id) on delete cascade,
  product_id text,
  category text,
  product_name text not null,
  description text,
  hsn_sac text,
  quantity numeric(14, 2) not null check (quantity > 0),
  unit text not null default 'Pcs',
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_amount numeric(16, 2) not null check (line_amount >= 0),
  total_price numeric(16, 2) not null default 0,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

-- 6. ASSETS TABLE (LOGOS & PAYMENT QR CODES)
create table public.assets (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null default 'abira-staff-admin',
  type text not null check (type in ('logo', 'qr', 'signature', 'stamp')),
  object_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 7. ENABLE ROW LEVEL SECURITY & OPEN ACCESS POLICIES
-- ==============================================================================
alter table public.business_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.assets enable row level security;

drop policy if exists "Allow all on business_profiles" on public.business_profiles;
drop policy if exists "Allow all on customers" on public.customers;
drop policy if exists "Allow all on products" on public.products;
drop policy if exists "Allow all on invoices" on public.invoices;
drop policy if exists "Allow all on invoice_items" on public.invoice_items;
drop policy if exists "Allow all on assets" on public.assets;

create policy "Allow all on business_profiles" on public.business_profiles for all using (true) with check (true);
create policy "Allow all on customers" on public.customers for all using (true) with check (true);
create policy "Allow all on products" on public.products for all using (true) with check (true);
create policy "Allow all on invoices" on public.invoices for all using (true) with check (true);
create policy "Allow all on invoice_items" on public.invoice_items for all using (true) with check (true);
create policy "Allow all on assets" on public.assets for all using (true) with check (true);

-- ==============================================================================
-- 8. STORAGE BUCKET FOR INVOICE ASSETS (QR CODES & LOGOS)
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('abira-business-assets', 'abira-business-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "Allow public read business assets" on storage.objects;
create policy "Allow public read business assets" on storage.objects for select using (bucket_id = 'abira-business-assets');

drop policy if exists "Allow all upload business assets" on storage.objects;
create policy "Allow all upload business assets" on storage.objects for insert with check (bucket_id = 'abira-business-assets');

drop policy if exists "Allow all delete business assets" on storage.objects;
create policy "Allow all delete business assets" on storage.objects for delete using (bucket_id = 'abira-business-assets');

-- ==============================================================================
-- 9. PRE-SEED ABIRA ENTERPRISES BUSINESS PROFILE
-- ==============================================================================
insert into public.business_profiles (
  id,
  owner_id,
  business_name,
  address,
  city,
  state,
  pincode,
  phone,
  bank_account_name,
  bank_name,
  account_number,
  ifsc,
  default_terms
) values (
  '00000000-0000-0000-0000-000000000001',
  'abira-staff-admin',
  'ABIRA Enterprises',
  'ABIRA Enterprises, Millenia 2, Sector 37D, Gurugram, Haryana – 122001',
  'Gurugram',
  'Haryana',
  '122001',
  '8882511472',
  'DHEERENDRA SINGH',
  'UTTAR PARDESH GRAMIN BANK',
  '52320100015866',
  'BARBOBUPGBX',
  'Payment Terms:
Payment should be initiated within 15 days of delivery.

Delivery Policy:
Products are generally delivered within 3 days of ordering.

Return and Exchange Policy:
No returns or exchanges are accepted after delivery, except in cases involving defective or damaged products.'
) on conflict (id) do update set
  business_name = excluded.business_name,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  pincode = excluded.pincode,
  phone = excluded.phone,
  bank_account_name = excluded.bank_account_name,
  bank_name = excluded.bank_name,
  account_number = excluded.account_number,
  ifsc = excluded.ifsc;

-- ==============================================================================
-- 10. PRE-SEED 70+ BROCHURE PRODUCTS (6 CATEGORIES)
-- ==============================================================================
insert into public.products (category, product_name, description) values
-- A. COMPREHENSIVE PACKAGING SOLUTIONS
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Corrugated Boxes', 'Standard protective corrugated box for packaging and transport.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', '3-Ply Corrugated Boxes', 'Lightweight 3-ply corrugated box for everyday shipping and handling.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', '5-Ply Corrugated Boxes', 'Heavy-duty 5-ply carton for enhanced stacking and transit protection.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', '7-Ply Corrugated Boxes', 'Extra heavy-duty 7-ply box engineered for maximum crush resistance and export.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Heavy-Duty Corrugated Boxes', 'Reinforced corrugated box for high-weight products and machinery components.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Die-Cut Corrugated Boxes', 'Precision die-cut boxes tailored for custom dimensions and snug fit.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Regular Slotted Cartons (RSC)', 'Industry standard RSC boxes with equal length flaps meeting at the center.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Shipping & Transit Boxes', 'Rugged packaging boxes designed for long-distance transit and logistics.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Custom Printed Boxes', 'Fully customisable corrugated boxes with personalized artwork and messaging.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Logo-Printed Boxes', 'Branded packaging featuring company insignia and identity prints.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Offset Printed Boxes', 'High-definition offset printed corrugated boxes for retail and display.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Digital Printed Boxes', 'Short-run flexible digital printed boxes with vivid graphics.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Flexo Printed Boxes', 'High-volume cost-effective flexographic printed shipping cartons.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Product Packaging Boxes', 'Custom secondary and primary packaging boxes for retail merchandise.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Promotional Packaging Boxes', 'Eye-catching promotional presentation boxes for launch campaigns.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Coloured Corrugated Boxes', 'Vibrant dyed/coated corrugated boxes for distinct brand aesthetics.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Rigid Gift Boxes', 'Sturdy rigid cardboard gift boxes with premium finish for luxury gifting.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Magnetic Closure Boxes', 'Premium gift boxes featuring concealed magnetic flap closures.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Luxury Packaging Boxes', 'High-end presentation packaging for luxury corporate and retail items.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Premium Product Boxes', 'High-grade structured boxes for high-value goods.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Folding Carton Boxes', 'Space-efficient folding paperboard cartons for consumer goods.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Custom-Shaped Boxes', 'Custom die-cut packaging crafted into specialized geometric forms.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'E-commerce Shipping Boxes', 'Optimized lightweight corrugated boxes for direct-to-consumer delivery.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Die-Cut Mailer Boxes', 'Fold-and-tuck corrugated mailer boxes for secure parcels.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Self-Locking Mailer Boxes', 'Tape-free self-locking mailers with clean presentation.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Subscription Boxes', 'Custom branded recurring subscription shipment boxes.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Courier Boxes', 'Tamper-resistant postal and courier transit boxes.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Custom-Branded Mailer Boxes', 'Personalized exterior/interior printed mailers.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Heavy-Duty Industrial Boxes', 'High-capacity industrial shipping containers.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Bulk Packaging Cartons', 'Large-volume master cartons for consolidation and pallet shipments.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Export Packaging Boxes', 'Weather-resistant export grade multi-wall corrugated boxes.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Multi-Layer Corrugated Boxes', 'High-strength multi-wall cartons for superior burst resistance.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Storage & Warehouse Boxes', 'Stackable storage cartons for inventory and archival needs.'),
('COMPREHENSIVE PACKAGING SOLUTIONS', 'Custom Industrial Cartons', 'Bespoke industrial outer cartons built to exact machinery specs.'),

-- B. PACKAGING TAPES
('PACKAGING TAPES', 'BOPP Packaging Tapes', 'High tensile strength biaxially-oriented polypropylene sealing tape.'),
('PACKAGING TAPES', 'Printed Logo Tapes', 'Custom branded security sealing tape with enterprise logo and text.'),
('PACKAGING TAPES', 'Transparent Tapes', 'Crystal clear adhesive sealing tape for discreet packaging.'),
('PACKAGING TAPES', 'Brown Packaging Tapes', 'Classic tan/brown carton sealing tape with aggressive adhesion.'),
('PACKAGING TAPES', 'Masking Tapes', 'Clean-removal crepe paper masking tape for industrial and painting use.'),
('PACKAGING TAPES', 'Double-Sided Tapes', 'High-adhesion double-coated tape for mounting and carton fabrication.'),
('PACKAGING TAPES', 'Paper Kraft Tapes', 'Eco-friendly water-activated or self-adhesive kraft paper tape.'),

-- C. LABELS & STICKERS
('LABELS & STICKERS', 'Thermal Labels', 'Direct thermal / thermal transfer label roll for high-speed printing.'),
('LABELS & STICKERS', 'Direct Thermal Labels', 'Heat-sensitive labels for barcode and dispatch printers (no ribbon required).'),
('LABELS & STICKERS', 'Thermal Transfer Labels', 'Long-lasting scratch and chemical-resistant labels with ribbon printing.'),
('LABELS & STICKERS', 'Barcode Labels', 'High-density barcode stickers for SKU tracking and logistics.'),
('LABELS & STICKERS', 'Shipping Labels', 'Pre-sized compliant shipping labels for transport documentation.'),
('LABELS & STICKERS', 'Product Identification Labels', 'Durable product identification and specification labels.'),
('LABELS & STICKERS', 'QR Code Labels', 'High-precision scannable 2D QR code adhesive labels.'),
('LABELS & STICKERS', 'Logo & Branding Stickers', 'Custom die-cut gloss/matte promotional branding stickers.'),

-- D. CORPORATE STATIONERY & GIFTING
('CORPORATE STATIONERY & GIFTING', 'Letterheads', 'Executive business stationery paper printed on fine bond paper.'),
('CORPORATE STATIONERY & GIFTING', 'Envelopes', 'Branded corporate mailing and document envelopes (all standard sizes).'),
('CORPORATE STATIONERY & GIFTING', 'Notepads & Writing Pads', 'Custom printed spiral or glued executive writing pads.'),
('CORPORATE STATIONERY & GIFTING', 'Sticky Notes & Registers', 'Repositionable adhesive notes and hardbound office registers.'),
('CORPORATE STATIONERY & GIFTING', 'Diaries & Planners', 'Custom debossed executive yearly planners and corporate diaries.'),
('CORPORATE STATIONERY & GIFTING', 'Files & Document Folders', 'Durable polypropylene and hardboard filing folders for office organization.'),
('CORPORATE STATIONERY & GIFTING', 'Notebooks', 'Hardbound and softbound corporate branded notebooks.'),
('CORPORATE STATIONERY & GIFTING', 'Staplers & Staple Pins', 'Heavy-duty desktop staplers and standard replacement staple pins.'),
('CORPORATE STATIONERY & GIFTING', 'Punching Machines & Cutters', 'Precision document 2-hole punches and utility snap-off cutters.'),
('CORPORATE STATIONERY & GIFTING', 'Scissors & Paper Trimmers', 'Ergonomic stainless steel scissors and rotary paper trimmers.'),
('CORPORATE STATIONERY & GIFTING', 'Business / Visiting Cards', 'Premium cardstock business cards with matte, gloss, or velvet lamination.'),
('CORPORATE STATIONERY & GIFTING', 'Company ID Cards', 'RFID / PVC identity smart cards with high-definition digital print.'),
('CORPORATE STATIONERY & GIFTING', 'ID Holders & Lanyards', 'Custom woven or satin lanyards with badge holders.'),
('CORPORATE STATIONERY & GIFTING', 'Branded Notebooks', 'Custom embossed corporate notebooks for conferences and employees.'),
('CORPORATE STATIONERY & GIFTING', 'Customized Pens', 'Laser-engraved metal pens and branded executive rollerballs.'),
('CORPORATE STATIONERY & GIFTING', 'Branded Desk Calendars', 'Tent and wiro-bound desktop corporate calendars.'),
('CORPORATE STATIONERY & GIFTING', 'Mouse Pads', 'Anti-skid neoprene mouse pads with full-color brand graphics.'),
('CORPORATE STATIONERY & GIFTING', 'Desk Organizers', 'Multi-compartment desktop tidy units for pens, clips, and essentials.'),
('CORPORATE STATIONERY & GIFTING', 'Brochures & Leaflets', 'Bi-fold and tri-fold marketing brochures on high-gsm art paper.'),
('CORPORATE STATIONERY & GIFTING', 'Company Profiles', 'Saddle-stitched or perfect-bound corporate capability booklets.'),
('CORPORATE STATIONERY & GIFTING', 'Presentation Folders', 'Die-cut pocket presentation folders with business card slots.'),
('CORPORATE STATIONERY & GIFTING', 'Product Catalogues', 'Comprehensive full-color product showcase catalogues.'),
('CORPORATE STATIONERY & GIFTING', 'Branded Paper Bags', 'Reinforced kraft and art paper shopping and corporate gifting bags.'),
('CORPORATE STATIONERY & GIFTING', 'Certificates', 'Gold-foiled executive recognition and training certificates.'),
('CORPORATE STATIONERY & GIFTING', 'Invitation & Thank You Cards', 'Textured board invitation and corporate gratitude cards with envelopes.'),
('CORPORATE STATIONERY & GIFTING', 'A4, A3, A5, A6 Paper Sheets', 'Premium 75/80/100 GSM multi-purpose copier and printing sheets.'),
('CORPORATE STATIONERY & GIFTING', 'Legal Size Paper', 'Standard legal-dimension copier reams for contracts and agreements.'),
('CORPORATE STATIONERY & GIFTING', 'Pen Stands', 'Executive wooden and acrylic desk pen holders.'),
('CORPORATE STATIONERY & GIFTING', 'Memo Pads', 'Desktop tear-off memo blocks with custom logo watermarking.'),
('CORPORATE STATIONERY & GIFTING', 'Desk Calendars', 'Annual multi-sheet desk calendars with month-at-a-glance grids.'),
('CORPORATE STATIONERY & GIFTING', 'Table Planners', 'Oversized tear-off weekly desk planners and blotters.'),
('CORPORATE STATIONERY & GIFTING', 'Document Organizers', 'Expanding file pockets and desktop document trays.'),
('CORPORATE STATIONERY & GIFTING', 'Paper Clips & Staplers', 'Assorted vinyl-coated paper clips, binder clips, and desk accessories.'),
('CORPORATE STATIONERY & GIFTING', 'Whiteboards & Markers', 'Magnetic dry-erase boards and refillable non-toxic whiteboard markers.'),

-- E. SAFETY WRAPS
('SAFETY WRAPS', 'Bubble Wrap Rolls', 'High-cushioning protective air bubble cushioning wrap in continuous rolls.'),
('SAFETY WRAPS', 'Air Bubble Sheets', 'Pre-cut perforated bubble cushioning sheets for quick wrapping.'),
('SAFETY WRAPS', 'Kraft Paper Wrap', 'Heavyweight biodegradable brown kraft protective wrapping paper.'),
('SAFETY WRAPS', 'Honeycomb Paper Bubble Wrap', 'Eco-friendly expandable honeycomb protective packaging wrap.'),

-- F. CONFETTI
('CONFETTI', 'Confetti Cannons', 'High-powered manual/twist celebratory confetti launchers.'),
('CONFETTI', 'Confetti Poppers', 'Handheld celebratory party poppers for milestone events.'),
('CONFETTI', 'Logo-Printed Confetti', 'Custom die-cut metallic or tissue confetti bearing brand emblems.'),
('CONFETTI', 'Office Party Confetti', 'Festive multi-color biodegradable tissue confetti for celebrations.'),
('CONFETTI', 'Employee Celebration Confetti', 'Specialty event confetti mixes for staff achievements and awards.'),
('CONFETTI', 'Product Launch Confetti', 'Dramatic metallic flutter confetti for live unveilings and inaugurations.'),
('CONFETTI', 'Brand-Coloured Confetti', 'Pantone-matched bespoke confetti tailored to corporate color schemes.'),
('CONFETTI', 'Company-Themed Confetti', 'Custom-shaped celebratory confetti featuring company motif elements.')
on conflict (product_name) do nothing;
