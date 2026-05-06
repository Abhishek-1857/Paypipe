ALTER TABLE payouts ADD COLUMN IF NOT EXISTS emails_sent boolean DEFAULT false;
