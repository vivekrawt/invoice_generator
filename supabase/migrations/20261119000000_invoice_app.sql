do $$
declare
  v_owner_count integer;
begin
  select count(*) into v_owner_count from auth.users;
  if v_owner_count <> 1 then
    raise exception 'Create exactly one Supabase Auth user before applying this migration; found % users.', v_owner_count;
  end if;
end;
$$;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
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
  default_terms text,
  catalogue_seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  product_name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  financial_year text not null,
  serial_number text not null,
  invoice_date date not null,
  po_number text,
  po_date date,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text not null,
  customer_city text not null,
  customer_state text not null,
  customer_pincode text not null,
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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invoice_number ~ '^ABR/[0-9]{4}-[0-9]{2}/.+$'),
  check (financial_year ~ '^[0-9]{4}-[0-9]{2}$')
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  category text,
  product_name text not null,
  description text,
  hsn_sac text,
  quantity numeric(14, 2) not null check (quantity > 0),
  unit text not null default 'Pcs',
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_amount numeric(16, 2) not null check (line_amount >= 0),
  total_price numeric(16, 2) not null check (total_price >= 0),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  check (line_amount = round(quantity * unit_price, 2))
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('logo', 'qr')),
  object_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  created_at timestamptz not null default now()
);

alter table public.business_profiles
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.business_profiles
  add column if not exists catalogue_seeded_at timestamptz;
alter table public.customers
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.products
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.invoices
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.invoice_items
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.invoice_items
  add column if not exists position integer;
alter table public.invoices
  add column if not exists customer_id uuid;
alter table public.invoice_items
  add column if not exists invoice_id uuid;
alter table public.invoice_items
  add column if not exists product_id uuid;

do $$
declare
  v_owner_id uuid;
begin
  select id into v_owner_id from auth.users limit 1;

  update public.business_profiles set owner_id = v_owner_id where owner_id is null;
  update public.customers set owner_id = v_owner_id where owner_id is null;
  update public.products set owner_id = v_owner_id where owner_id is null;
  update public.invoices set owner_id = v_owner_id where owner_id is null;
  update public.invoice_items set owner_id = v_owner_id where owner_id is null;

  with ordered_items as (
    select id, row_number() over (partition by invoice_id order by created_at, id) as item_position
    from public.invoice_items
  )
  update public.invoice_items as items
  set position = ordered_items.item_position
  from ordered_items
  where items.id = ordered_items.id;

  alter table public.business_profiles alter column owner_id set not null;
  alter table public.customers alter column owner_id set not null;
  alter table public.products alter column owner_id set not null;
  alter table public.invoices alter column owner_id set not null;
  alter table public.invoice_items alter column owner_id set not null;
  alter table public.invoice_items alter column position set not null;
end;
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select constraint_row.conname
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.invoices'::regclass
      and constraint_row.contype = 'f'
      and exists (
        select 1
        from unnest(constraint_row.conkey) as key_column(attnum)
        join pg_attribute as attribute
          on attribute.attrelid = constraint_row.conrelid
          and attribute.attnum = key_column.attnum
        where attribute.attname = 'customer_id'
      )
  loop
    execute format('alter table public.invoices drop constraint %I', v_constraint.conname);
  end loop;

  for v_constraint in
    select constraint_row.conname
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.invoice_items'::regclass
      and constraint_row.contype = 'f'
      and exists (
        select 1
        from unnest(constraint_row.conkey) as key_column(attnum)
        join pg_attribute as attribute
          on attribute.attrelid = constraint_row.conrelid
          and attribute.attnum = key_column.attnum
        where attribute.attname in ('invoice_id', 'product_id')
      )
  loop
    execute format('alter table public.invoice_items drop constraint %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.invoices
  add constraint invoices_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete set null;
alter table public.invoice_items
  add constraint invoice_items_invoice_id_fkey
  foreign key (invoice_id) references public.invoices(id) on delete cascade;
alter table public.invoice_items
  add constraint invoice_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

create index if not exists invoices_owner_created_idx on public.invoices(owner_id, created_at desc);
create index if not exists invoices_owner_fy_date_idx on public.invoices(owner_id, financial_year, invoice_date);
create index if not exists invoice_items_owner_invoice_idx on public.invoice_items(owner_id, invoice_id, position);
create index if not exists customers_owner_created_idx on public.customers(owner_id, created_at desc);
create index if not exists products_owner_category_idx on public.products(owner_id, category, product_name);
create unique index if not exists business_profiles_owner_unique on public.business_profiles(owner_id);
create unique index if not exists products_owner_name_unique on public.products(owner_id, product_name);
create unique index if not exists invoices_owner_number_unique on public.invoices(owner_id, invoice_number);
create unique index if not exists invoice_items_owner_invoice_position_unique
  on public.invoice_items(owner_id, invoice_id, position);

alter table public.business_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.assets enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array['business_profiles', 'customers', 'products', 'invoices', 'invoice_items', 'assets'])
  loop
    execute format('drop policy %I on %I.%I', v_policy.policyname, v_policy.schemaname, v_policy.tablename);
  end loop;
end;
$$;

create policy owner_access on public.business_profiles
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists owner_access on public.customers;
create policy owner_access on public.customers
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists owner_access on public.products;
create policy owner_access on public.products
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists owner_access on public.invoices;
create policy owner_access on public.invoices
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (customer_id is null or exists (
      select 1 from public.customers
      where customers.id = customer_id and customers.owner_id = (select auth.uid())
    ))
  );

drop policy if exists owner_access on public.invoice_items;
create policy owner_access on public.invoice_items
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.invoices
      where invoices.id = invoice_id and invoices.owner_id = (select auth.uid())
    )
    and (product_id is null or exists (
      select 1 from public.products
      where products.id = product_id and products.owner_id = (select auth.uid())
    ))
  );

drop policy if exists owner_access on public.assets;
create policy owner_access on public.assets
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create or replace function public.save_invoice(
  p_invoice_id uuid,
  p_invoice jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_owner_id uuid := auth.uid();
  v_invoice_id uuid := coalesce(p_invoice_id, gen_random_uuid());
  v_invoice_date date;
  v_fy_start integer;
  v_financial_year text;
  v_item_total numeric(16, 2);
  v_subtotal numeric(16, 2);
  v_adjustments numeric(16, 2);
  v_total numeric(16, 2);
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 500 then
    raise exception using errcode = '23514', message = 'An invoice must contain between 1 and 500 product rows.';
  end if;

  v_invoice_date := (p_invoice->>'invoice_date')::date;
  v_fy_start := extract(year from v_invoice_date)::integer;
  if extract(month from v_invoice_date) < 4 then
    v_fy_start := v_fy_start - 1;
  end if;
  v_financial_year := v_fy_start::text || '-' || lpad(((v_fy_start + 1) % 100)::text, 2, '0');

  if p_invoice->>'financial_year' <> v_financial_year
    or p_invoice->>'invoice_number' !~ ('^ABR/' || v_financial_year || '/.+$')
    or p_invoice->>'serial_number' is null
    or p_invoice->>'serial_number' = '' then
    raise exception using errcode = '23514', message = 'Invoice number and financial year must match the invoice date.';
  end if;
  if jsonb_typeof(p_invoice->'customer_snapshot') <> 'object'
    or jsonb_typeof(p_invoice->'business_snapshot') <> 'object' then
    raise exception using errcode = '23514', message = 'Customer and business snapshots are required.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as row_data(item)
    where (row_data.item->>'quantity')::numeric <= 0
      or (row_data.item->>'unit_price')::numeric < 0
      or (row_data.item->>'line_amount')::numeric < 0
      or round((row_data.item->>'quantity')::numeric, 2) <> (row_data.item->>'quantity')::numeric
      or round((row_data.item->>'unit_price')::numeric, 2) <> (row_data.item->>'unit_price')::numeric
      or round((row_data.item->>'line_amount')::numeric, 2) <> (row_data.item->>'line_amount')::numeric
      or round((row_data.item->>'quantity')::numeric * (row_data.item->>'unit_price')::numeric, 2)
        <> (row_data.item->>'line_amount')::numeric
  ) then
    raise exception using errcode = '23514', message = 'Invoice item quantity, rate, or amount is invalid.';
  end if;

  select round(coalesce(sum((row_data.item->>'line_amount')::numeric), 0), 2)
    into v_item_total
    from jsonb_array_elements(p_items) as row_data(item);
  v_subtotal := (p_invoice->>'subtotal')::numeric;
  v_adjustments := (p_invoice->>'adjustments')::numeric;
  v_total := (p_invoice->>'total_amount')::numeric;
  if v_subtotal < 0 or v_total < 0
    or round(v_item_total, 2) <> round(v_subtotal, 2)
    or round(v_subtotal + v_adjustments, 2) <> round(v_total, 2) then
    raise exception using errcode = '23514', message = 'Invoice totals do not match the submitted line items.';
  end if;

  if p_invoice_id is null then
    insert into public.invoices (
      id, owner_id, invoice_number, financial_year, serial_number, invoice_date,
      po_number, po_date, customer_id, customer_name, customer_phone, customer_email,
      customer_address, customer_city, customer_state, customer_pincode, customer_gstin,
      customer_snapshot, shipping_snapshot, business_snapshot, subtotal, adjustments,
      tax_amount, total_amount, amount_in_words, terms, additional_notes, created_by
    ) values (
      v_invoice_id, v_owner_id, p_invoice->>'invoice_number', v_financial_year,
      p_invoice->>'serial_number', v_invoice_date, nullif(p_invoice->>'po_number', ''),
      nullif(p_invoice->>'po_date', '')::date, nullif(p_invoice->>'customer_id', '')::uuid,
      p_invoice->>'customer_name', p_invoice->>'customer_phone',
      nullif(p_invoice->>'customer_email', ''), coalesce(p_invoice->>'customer_address', ''),
      coalesce(p_invoice->>'customer_city', ''), coalesce(p_invoice->>'customer_state', ''),
      coalesce(p_invoice->>'customer_pincode', ''), nullif(p_invoice->>'customer_gstin', ''),
      p_invoice->'customer_snapshot', nullif(p_invoice->'shipping_snapshot', 'null'::jsonb),
      p_invoice->'business_snapshot', v_subtotal, v_adjustments, v_adjustments, v_total,
      p_invoice->>'amount_in_words', nullif(p_invoice->>'terms', ''),
      nullif(p_invoice->>'additional_notes', ''), v_owner_id
    );
  else
    update public.invoices set
      invoice_number = p_invoice->>'invoice_number',
      financial_year = v_financial_year,
      serial_number = p_invoice->>'serial_number',
      invoice_date = v_invoice_date,
      po_number = nullif(p_invoice->>'po_number', ''),
      po_date = nullif(p_invoice->>'po_date', '')::date,
      customer_id = nullif(p_invoice->>'customer_id', '')::uuid,
      customer_name = p_invoice->>'customer_name',
      customer_phone = p_invoice->>'customer_phone',
      customer_email = nullif(p_invoice->>'customer_email', ''),
      customer_address = coalesce(p_invoice->>'customer_address', ''),
      customer_city = coalesce(p_invoice->>'customer_city', ''),
      customer_state = coalesce(p_invoice->>'customer_state', ''),
      customer_pincode = coalesce(p_invoice->>'customer_pincode', ''),
      customer_gstin = nullif(p_invoice->>'customer_gstin', ''),
      customer_snapshot = p_invoice->'customer_snapshot',
      shipping_snapshot = nullif(p_invoice->'shipping_snapshot', 'null'::jsonb),
      business_snapshot = p_invoice->'business_snapshot',
      subtotal = v_subtotal,
      adjustments = v_adjustments,
      tax_amount = v_adjustments,
      total_amount = v_total,
      amount_in_words = p_invoice->>'amount_in_words',
      terms = nullif(p_invoice->>'terms', ''),
      additional_notes = nullif(p_invoice->>'additional_notes', ''),
      updated_at = now()
    where id = v_invoice_id and owner_id = v_owner_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Invoice was not found.';
    end if;
    delete from public.invoice_items where invoice_id = v_invoice_id and owner_id = v_owner_id;
  end if;

  insert into public.invoice_items (
    owner_id, invoice_id, product_id, category, product_name, description,
    hsn_sac, quantity, unit, unit_price, line_amount, total_price, position
  )
  select
    v_owner_id, v_invoice_id, nullif(row_data.item->>'product_id', '')::uuid,
    nullif(row_data.item->>'category', ''), row_data.item->>'product_name',
    nullif(row_data.item->>'description', ''), nullif(row_data.item->>'hsn_sac', ''),
    (row_data.item->>'quantity')::numeric, coalesce(nullif(row_data.item->>'unit', ''), 'Pcs'),
    (row_data.item->>'unit_price')::numeric, (row_data.item->>'line_amount')::numeric,
    (row_data.item->>'line_amount')::numeric, row_data.ordinal::integer
  from jsonb_array_elements(p_items) with ordinality as row_data(item, ordinal);

  return v_invoice_id;
end;
$$;

revoke all on function public.save_invoice(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_invoice(uuid, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('abira-business-assets', 'abira-business-assets', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists abira_owner_read_business_assets on storage.objects;
create policy abira_owner_read_business_assets on storage.objects
  for select to authenticated
  using (bucket_id = 'abira-business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists abira_owner_insert_business_assets on storage.objects;
create policy abira_owner_insert_business_assets on storage.objects
  for insert to authenticated
  with check (bucket_id = 'abira-business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists abira_owner_delete_business_assets on storage.objects;
create policy abira_owner_delete_business_assets on storage.objects
  for delete to authenticated
  using (bucket_id = 'abira-business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
