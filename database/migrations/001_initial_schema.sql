DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'id'
          AND data_type = 'integer'
    ) AND to_regclass('public.legacy_users_pre_phase2') IS NULL THEN
        ALTER TABLE public.users RENAME TO legacy_users_pre_phase2;
    END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL
        CHECK (role IN ('customer', 'seller', 'administrator', 'delivery_staff')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'banned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_status ON users(role, status);

CREATE TABLE seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_profiles_status ON seller_profiles(status);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    province TEXT NOT NULL,
    district TEXT,
    postal_code TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_addresses_one_default_per_user
    ON addresses(user_id) WHERE is_default;
CREATE INDEX idx_addresses_user ON addresses(user_id);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price_lak BIGINT NOT NULL CHECK (price_lak >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (seller_profile_id, slug)
);

CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_seller_status ON products(seller_profile_id, status);
CREATE INDEX idx_products_name ON products USING GIN (to_tsvector('simple', name));

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_sort ON product_images(product_id, sort_order);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shipping_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled', 'refunded', 'disputed')),
    subtotal_lak BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_lak >= 0),
    customer_fee_lak BIGINT NOT NULL DEFAULT 0 CHECK (customer_fee_lak >= 0),
    total_lak BIGINT NOT NULL DEFAULT 0 CHECK (total_lak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

CREATE TABLE seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled', 'refunded', 'disputed')),
    subtotal_lak BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_lak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, seller_profile_id)
);

CREATE INDEX idx_seller_orders_seller_status ON seller_orders(seller_profile_id, status);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    unit_price_lak_snapshot BIGINT NOT NULL CHECK (unit_price_lak_snapshot >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total_lak BIGINT NOT NULL CHECK (line_total_lak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_seller_order ON order_items(seller_order_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    provider_reference TEXT,
    amount_lak BIGINT NOT NULL CHECK (amount_lak >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_payments_provider_reference
    ON payments(provider, provider_reference)
    WHERE provider_reference IS NOT NULL;
CREATE INDEX idx_payments_order_status ON payments(order_id, status);

CREATE TABLE commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'platform'
        CHECK (scope IN ('platform', 'category', 'seller')),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    seller_profile_id UUID REFERENCES seller_profiles(id) ON DELETE CASCADE,
    commission_bps INTEGER NOT NULL CHECK (commission_bps >= 0 AND commission_bps <= 10000),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (scope = 'platform' AND category_id IS NULL AND seller_profile_id IS NULL)
        OR (scope = 'category' AND category_id IS NOT NULL AND seller_profile_id IS NULL)
        OR (scope = 'seller' AND seller_profile_id IS NOT NULL AND category_id IS NULL)
    )
);

CREATE INDEX idx_commission_rules_active ON commission_rules(is_active, valid_from, valid_until);

CREATE TABLE commission_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE RESTRICT,
    commission_rule_id UUID REFERENCES commission_rules(id) ON DELETE RESTRICT,
    order_amount_lak BIGINT NOT NULL CHECK (order_amount_lak >= 0),
    applied_commission_bps INTEGER NOT NULL CHECK (applied_commission_bps >= 0 AND applied_commission_bps <= 10000),
    commission_amount_lak BIGINT NOT NULL CHECK (commission_amount_lak >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'available', 'credited', 'reversed')),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (seller_order_id)
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_profile_id UUID NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,
    available_balance_lak BIGINT NOT NULL DEFAULT 0 CHECK (available_balance_lak >= 0),
    pending_balance_lak BIGINT NOT NULL DEFAULT 0 CHECK (pending_balance_lak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    type TEXT NOT NULL
        CHECK (type IN ('commission_credit', 'bonus_credit', 'customer_fee_credit', 'debit', 'payout', 'refund', 'reversal')),
    amount_lak BIGINT NOT NULL CHECK (amount_lak <> 0),
    balance_after_lak BIGINT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reference_type, reference_id, type)
);

CREATE INDEX idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    wallet_transaction_id UUID UNIQUE REFERENCES wallet_transactions(id) ON DELETE RESTRICT,
    amount_lak BIGINT NOT NULL CHECK (amount_lak > 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
    bank_name TEXT,
    account_name TEXT,
    account_number TEXT,
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_seller_status ON payouts(seller_profile_id, status);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'published', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_product_status ON reviews(product_id, status);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
