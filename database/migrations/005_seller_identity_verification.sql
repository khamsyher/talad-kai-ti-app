ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (identity_status IN ('pending', 'approved', 'rejected', 'suspended')),
    ADD COLUMN IF NOT EXISTS identity_rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS seller_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    document_type TEXT NOT NULL
        CHECK (document_type IN ('national_id', 'passport', 'business_license', 'bank_statement', 'other')),
    original_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_verification_documents_seller
    ON seller_verification_documents(seller_profile_id, status);

UPDATE seller_profiles
SET identity_status = 'approved',
    identity_verified_at = COALESCE(identity_verified_at, NOW())
WHERE slug = 'demo-poultry-shop';
