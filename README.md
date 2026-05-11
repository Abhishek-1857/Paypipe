# Remlo

**Pay global contractors via card. Settle instantly in USDC on Solana.**

Remlo replaces $28 SWIFT wires that take 5 days with $0.001 Solana transfers that take 1 second. Built for founders who pay global contractors.

## How It Works

```
Card Payment (Fiat In)     Remlo Backend          Solana (USDC Out)
┌─────────────────┐      ┌──────────────────┐    ┌──────────────────┐
│  Dodo Payments   │─────>│  Webhook handler  │───>│ USDC transfer to │
│  Checkout (USD)  │      │  Process payment  │    │ contractor wallet│
└─────────────────┘      └──────────────────┘    └──────────────────┘
```

1. **Founder** adds contractors with their Solana wallet addresses
2. **Founder** initiates a payout → redirected to Dodo Payments checkout (card payment)
3. **Dodo webhook** fires on successful payment
4. **Remlo backend** automatically sends USDC to the contractor's Solana wallet
5. **Contractor** receives USDC in ~1 second

## Features

- **Single Payouts** — Pay any contractor via card, settled as USDC on Solana in seconds
- **Bulk Payouts** — Pay multiple contractors at once from a single checkout
- **Scheduled Payouts** — Set monthly recurring schedules per contractor (day 1-28), get notified when due, manually approve each cycle
- **Contractor Management** — Add contractors with name, email, and Solana wallet; invite via email
- **Treasury** — View hot wallet balance, health tier, request USDC refill on devnet
- **Notification System** — Bell icon aggregates payout completions, failures, scheduled due/overdue, new contractors, and low treasury alerts with mark-all-read
- **Live Solana Status** — Sidebar shows real-time block height and RPC latency from Solana devnet
- **Email Notifications** — Contractor receives payment confirmation, founder gets receipt
- **Dark Mode UI** — Full dark design system with light mode toggle

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres database + magic link auth + RLS
- **Dodo Payments** — fiat payment processing (test mode)
- **Solana** — USDC transfers via `@solana/web3.js` + `@solana/spl-token`
- **Tailwind CSS** — responsive dark-mode UI
- **Resend** — transactional emails

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Abhishek-1857/Remlo.git
cd Remlo
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql` and all files in `supabase/migrations/`
3. Go to **Settings > API** and copy your project URL, anon key, and service role key
4. In **Authentication > URL Configuration**, add `http://localhost:3000/auth/callback` as a redirect URL

### 3. Dodo Payments

1. Sign up at [dodopayments.com](https://dodopayments.com)
2. Create a **one-time payment product** (pay-what-you-want enabled) in test mode
3. Copy your test API key, the product ID, and the webhook secret
4. Set up a webhook endpoint pointing to `https://your-domain.com/api/webhooks/dodo` for `payment.succeeded` events
5. For local development, use a tunnel like [ngrok](https://ngrok.com): `ngrok http 3000`

### 4. Solana Hot Wallet

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Create a new keypair
solana-keygen new --outfile ~/.config/solana/remlo.json

# Get the base58 private key for .env.local
node -e "const bs58 = require('bs58'); const key = require('fs').readFileSync(require('os').homedir() + '/.config/solana/remlo.json'); console.log(bs58.encode(Buffer.from(JSON.parse(key))))"

# Fund with devnet SOL (needed for tx fees)
solana airdrop 2 --url devnet
```

### 5. Environment Variables

Create `.env.local` and fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DODO_PAYMENTS_API_KEY=your_test_api_key
DODO_WEBHOOK_KEY=your_webhook_secret
DODO_PAYOUT_PRODUCT_ID=pdt_xxxxx
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_HOT_WALLET_KEY=your_bs58_private_key
NEXT_PUBLIC_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxx
TREASURY_OWNER_EMAIL=your@email.com
TREASURY_LOW_THRESHOLD_USD=500
TREASURY_CRITICAL_THRESHOLD_USD=100
```

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a magic link, add a contractor, and make a payout.

## End-to-End Test

1. Add a contractor with a valid Solana devnet wallet address
2. Click **Pay** and enter an amount ($1-$10 in test mode)
3. Click **Pay via Card** — you'll be redirected to Dodo Payments checkout
4. Use test card: `4242 4242 4242 4242` with any future expiry and any CVC
5. After payment, you'll be redirected back to the dashboard
6. The webhook fires, Remlo sends USDC on Solana devnet
7. Check the transaction on [Solscan (devnet)](https://solscan.io/?cluster=devnet)

### Scheduled Payouts

1. Go to **Scheduled Payouts** and create a schedule (pick contractor, amount, day of month)
2. When the schedule is due, a notification appears in the bell icon and on the dashboard
3. Click **Pay Now** to go through the Dodo checkout flow
4. After payment, the schedule automatically advances to the next month

## Project Structure

```
src/
├── app/
│   ├── (app)/                     # Authenticated layout (sidebar + header)
│   │   ├── dashboard/             # Stats, recent payouts, quick actions
│   │   ├── contractors/           # Add/list contractors
│   │   ├── pay/[contractorId]     # Pay a specific contractor
│   │   ├── payouts/               # Payout history with filters
│   │   ├── bulk-payout/           # Multi-contractor payout
│   │   ├── scheduled-payouts/     # Recurring payment schedules
│   │   └── treasury/              # Wallet balance and health
│   ├── api/
│   │   ├── checkout/              # Create Dodo checkout session
│   │   ├── webhooks/dodo/         # Handle Dodo payment webhooks
│   │   ├── payouts/               # Query payouts + export
│   │   ├── contractors/           # CRUD contractors
│   │   ├── scheduled-payouts/     # CRUD scheduled payouts
│   │   └── treasury/              # Balance info + refill
│   ├── auth/callback/             # Supabase magic link callback
│   └── login/                     # Magic link login page
├── components/                    # Sidebar, toast, status badges, theme toggle
└── lib/
    ├── dodo.ts                    # Dodo Payments client + checkout helper
    ├── solana.ts                  # USDC transfer on Solana
    ├── utils.ts                   # Formatters (USD, dates, tx signatures)
    └── supabase/                  # Supabase client (browser + server)
```

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add all environment variables (update `NEXT_PUBLIC_URL` to your Vercel domain)
4. Update your Dodo webhook URL to `https://your-app.vercel.app/api/webhooks/dodo`
5. Update Supabase redirect URL to `https://your-app.vercel.app/auth/callback`

---

Built for the **Dodo Payments x Superteam India** hackathon.
