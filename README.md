# Talad Kai Ti Marketplace

## Local setup

Requirements:

- Windows 11
- Node.js 20+
- Yarn
- PostgreSQL 16 or Docker Desktop

Copy `.env.example` to `.env.local`, update `DATABASE_URL` and PostgreSQL credentials, then run:

```cmd
yarn install
yarn dev
```

Open `http://localhost:3000`.

## Database

Test the PostgreSQL connection:

```cmd
yarn db:test
```

Migration status and migration execution:

```cmd
yarn db:migrate:status
yarn db:migrate
```

Seed category defaults and, optionally, an initial administrator:

```cmd
yarn db:seed
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding to create or update the initial administrator. The password must contain at least 12 characters.

Verify the required Phase 2 tables:

```cmd
yarn db:verify
```

Place versioned SQL migrations in `database/migrations/`.

Health check: `http://localhost:3000/api/health`

## Authentication

Set `AUTH_SECRET` in `.env.local` before running authentication flows. Generate a development secret with:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Customer registration: `http://localhost:3000/register`

Login: `http://localhost:3000/login`

Protected dashboards:

- Seller: `http://localhost:3000/seller`
- Administrator: `http://localhost:3000/admin`

## Storefront

The public marketplace pages are:

- Product search and category filters: `http://localhost:3000`
- Product details: `http://localhost:3000/products/<slug>`
- Seller storefront: `http://localhost:3000/sellers/<slug>`

Only approved, in-stock products from approved sellers are public. Run `yarn db:seed` to load category defaults and the demo storefront listing.

## Orders and payments

Authenticated customers can:

- Add approved in-stock products to `/cart`
- Enter a shipping address at `/checkout`
- Create a multi-seller order
- View order history at `/orders`

Checkout creates an order, seller-order splits, immutable order-item snapshots, and stock updates in one transaction. The MVP uses zero customer fees and creates a pending generic payment record. External payment provider integration is not configured in this phase.

## Commission, wallets, and payouts

The admin dashboard configures platform commission rates in basis points:

- `100` basis points = `1%`
- Seller-specific and category rules are supported by the commission data model
- The migration seeds a zero-rate default platform rule

Completed seller orders create pending commission transactions. Administrators can mark commissions available, then credit net seller proceeds to the wallet. Cancelling or refunding an order reverses pending or already credited proceeds.

Sellers can view available and pending balances, immutable wallet history, and submit payout requests at `/seller/wallet`. Administrators approve or reject payout requests at `/admin`.

## Administration

The administrator control center is available at `/admin` and includes:

- User status management
- Seller verification and suspension
- Product approval, rejection, and archiving
- Order status management
- Category creation and activation
- Commission configuration and wallet-credit operations
- Payout approval and rejection
- Platform name, locale, and currency settings
- Marketplace totals and moderation reports

Administrative moderation and setting changes are recorded in `audit_logs`.

## Seller identity verification

Sellers submit identity documents from `/seller` using JPG, PNG, WebP, or PDF files up to 10 MB. Files are stored outside `public` in `UPLOAD_DIR` and remain private.

Administrators review documents in `/admin`:

- Approve: identity status becomes approved and product posting is unlocked.
- Reject: identity status becomes rejected and product posting remains locked until a valid document is uploaded and approved.

Docker Compose stores private documents in the `seller_documents` volume.

## Admin subdomain

Set `ADMIN_HOSTNAME` to the dedicated administrator hostname:

```text
ADMIN_HOSTNAME=admin.localhost
```

For local development, `http://admin.localhost:3000/login` is the admin login hostname. The main hostname does not serve `/admin`.

For production, set `ADMIN_HOSTNAME` to the actual subdomain, for example `admin.example.com`, and configure DNS and the reverse proxy to route that hostname to Next.js.

## Docker Compose

```cmd
copy .env.example .env
docker compose up --build
```

Stop the stack:

```cmd
docker compose down
```
