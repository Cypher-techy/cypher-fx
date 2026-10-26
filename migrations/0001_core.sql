CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL,
 role text NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('CUSTOMER','SUPER_ADMIN','FINANCE','SUPPORT','COMPLIANCE','TRADING_OPS','AUDITOR','HR')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','restricted','suspended','closed')),
 email_verified boolean NOT NULL DEFAULT false, kyc_status text NOT NULL DEFAULT 'unverified', mfa_secret text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS roles (name text PRIMARY KEY, description text NOT NULL);
CREATE TABLE IF NOT EXISTS permissions (role text REFERENCES roles(name), permission text NOT NULL, PRIMARY KEY(role,permission));
CREATE TABLE IF NOT EXISTS user_sessions (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, fresh_until timestamptz, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user_idx ON user_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_tokens (id text PRIMARY KEY, user_id text REFERENCES users(id), token_hash text UNIQUE NOT NULL, purpose text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE IF NOT EXISTS customer_profiles (user_id text PRIMARY KEY REFERENCES users(id), phone text, timezone text NOT NULL DEFAULT 'Africa/Nairobi', country text DEFAULT 'KE');
CREATE TABLE IF NOT EXISTS kyc_records (id text PRIMARY KEY, user_id text REFERENCES users(id), status text NOT NULL, provider_ref text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS compliance_records (id text PRIMARY KEY, user_id text REFERENCES users(id), kind text NOT NULL, version text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS trading_accounts (id text PRIMARY KEY, user_id text REFERENCES users(id), provider_ref text UNIQUE, status text NOT NULL DEFAULT 'UNAVAILABLE', currency text DEFAULT 'USD');
CREATE TABLE IF NOT EXISTS demo_accounts (user_id text PRIMARY KEY REFERENCES users(id), balance numeric(20,2) NOT NULL DEFAULT 10000, initial_balance numeric(20,2) NOT NULL DEFAULT 10000, reset_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS wallets (user_id text PRIMARY KEY REFERENCES users(id), currency text NOT NULL DEFAULT 'KES' CHECK(currency='KES'), available bigint NOT NULL DEFAULT 0 CHECK(available>=0), reserved bigint NOT NULL DEFAULT 0 CHECK(reserved>=0));
CREATE TABLE IF NOT EXISTS ledger_accounts (id text PRIMARY KEY, user_id text REFERENCES users(id), kind text NOT NULL, currency text NOT NULL DEFAULT 'KES');
CREATE TABLE IF NOT EXISTS ledger_transactions (id text PRIMARY KEY, reference text UNIQUE NOT NULL, description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ledger_entries (id text PRIMARY KEY, transaction_id text NOT NULL REFERENCES ledger_transactions(id), account_id text NOT NULL REFERENCES ledger_accounts(id), amount bigint NOT NULL CHECK(amount<>0), created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS ledger_account_idx ON ledger_entries(account_id,created_at);
CREATE TABLE IF NOT EXISTS deposits (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), amount bigint NOT NULL CHECK(amount>0), phone text NOT NULL, status text NOT NULL DEFAULT 'PENDING', idempotency_key text UNIQUE NOT NULL, checkout_ref text UNIQUE, receipt text UNIQUE, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_events (id text PRIMARY KEY, deposit_id text REFERENCES deposits(id), reference text NOT NULL, payload jsonb NOT NULL, verified boolean NOT NULL DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS withdrawal_requests (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), amount bigint NOT NULL CHECK(amount>0), phone text NOT NULL, status text NOT NULL DEFAULT 'PENDING_ADMIN_APPROVAL' CHECK(status IN ('PENDING_ADMIN_APPROVAL','APPROVED_PENDING_PAYOUT','PROCESSING','PAID','REJECTED','FAILED','PAYOUT_UNDER_REVIEW')), idempotency_key text UNIQUE NOT NULL, approved_by text REFERENCES users(id), provider_ref text UNIQUE, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), CHECK(approved_by IS NULL OR approved_by<>user_id), CHECK(status NOT IN ('APPROVED_PENDING_PAYOUT','PROCESSING','PAID') OR approved_by IS NOT NULL));
CREATE INDEX IF NOT EXISTS withdrawal_queue_idx ON withdrawal_requests(status,created_at);
CREATE TABLE IF NOT EXISTS withdrawal_reviews (id text PRIMARY KEY, withdrawal_id text NOT NULL REFERENCES withdrawal_requests(id), admin_id text NOT NULL REFERENCES users(id), decision text NOT NULL CHECK(decision IN ('APPROVE','REJECT')), reason text NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(withdrawal_id));
CREATE TABLE IF NOT EXISTS payout_events (id text PRIMARY KEY, withdrawal_id text REFERENCES withdrawal_requests(id), reference text NOT NULL, payload jsonb NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS instruments (symbol text PRIMARY KEY, display_name text NOT NULL, base_currency text NOT NULL, quote_currency text NOT NULL, enabled boolean DEFAULT true);
CREATE TABLE IF NOT EXISTS market_quotes (symbol text PRIMARY KEY REFERENCES instruments(symbol), bid numeric(20,8), ask numeric(20,8), source text NOT NULL, observed_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS candles (symbol text REFERENCES instruments(symbol), timeframe text NOT NULL, time timestamptz NOT NULL, open numeric, high numeric, low numeric, close numeric, source text NOT NULL, PRIMARY KEY(symbol,timeframe,time));
CREATE TABLE IF NOT EXISTS orders (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), mode text NOT NULL CHECK(mode IN ('DEMO','REAL')), symbol text NOT NULL REFERENCES instruments(symbol), side text NOT NULL CHECK(side IN ('BUY','SELL')), type text NOT NULL CHECK(type IN ('MARKET','LIMIT','STOP')), lots numeric(10,2) NOT NULL CHECK(lots>0), entry_price numeric(20,8), stop_loss numeric(20,8), take_profit numeric(20,8), status text NOT NULL, idempotency_key text UNIQUE NOT NULL, provider_ref text UNIQUE, source text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS executions (id text PRIMARY KEY, order_id text REFERENCES orders(id), price numeric(20,8) NOT NULL, provider_ref text UNIQUE, source text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS positions (id text PRIMARY KEY, order_id text UNIQUE REFERENCES orders(id), user_id text REFERENCES users(id), mode text NOT NULL CHECK(mode IN ('DEMO','REAL')), symbol text NOT NULL REFERENCES instruments(symbol), side text NOT NULL, lots numeric(10,2) NOT NULL, entry_price numeric(20,8) NOT NULL, stop_loss numeric(20,8), take_profit numeric(20,8), status text NOT NULL DEFAULT 'OPEN', closed_price numeric(20,8), pnl numeric(20,2), source text NOT NULL, created_at timestamptz DEFAULT now(), closed_at timestamptz);
CREATE INDEX IF NOT EXISTS positions_user_idx ON positions(user_id,status);
CREATE TABLE IF NOT EXISTS trade_history (id text PRIMARY KEY, position_id text UNIQUE REFERENCES positions(id), user_id text REFERENCES users(id), pnl numeric(20,2) NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, user_id text REFERENCES users(id), title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS support_tickets (id text PRIMARY KEY, user_id text REFERENCES users(id), subject text NOT NULL, message text NOT NULL, status text DEFAULT 'OPEN', assigned_to text REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS internal_messages (id text PRIMARY KEY, actor_id text NOT NULL REFERENCES users(id), body text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS staff_profiles (user_id text PRIMARY KEY REFERENCES users(id), department text NOT NULL, access_review_at timestamptz);
CREATE TABLE IF NOT EXISTS audit_logs (id text PRIMARY KEY, actor_id text REFERENCES users(id), action text NOT NULL, reference text NOT NULL, outcome text NOT NULL DEFAULT 'SUCCESS', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS system_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'immutable record'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ledger_transactions_immutable BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER payment_events_immutable BEFORE UPDATE OR DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER payout_events_immutable BEFORE UPDATE OR DELETE ON payout_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER reviews_immutable BEFORE UPDATE OR DELETE ON withdrawal_reviews FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE OR REPLACE FUNCTION check_balanced() RETURNS trigger AS $$ BEGIN
 IF (SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE transaction_id=NEW.id)<>0 OR (SELECT COUNT(*) FROM ledger_entries WHERE transaction_id=NEW.id)<2 THEN RAISE EXCEPTION 'unbalanced ledger transaction'; END IF; RETURN NULL; END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER balanced_ledger AFTER INSERT ON ledger_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_balanced();
INSERT INTO ledger_accounts(id,kind) VALUES('clearing:mpesa','CLEARING') ON CONFLICT DO NOTHING;
INSERT INTO instruments(symbol,display_name,base_currency,quote_currency) VALUES ('EUR_USD','EUR/USD','EUR','USD'),('GBP_USD','GBP/USD','GBP','USD'),('USD_JPY','USD/JPY','USD','JPY'),('AUD_USD','AUD/USD','AUD','USD'),('USD_CHF','USD/CHF','USD','CHF'),('USD_CAD','USD/CAD','USD','CAD') ON CONFLICT DO NOTHING;
INSERT INTO roles(name,description) SELECT v,v FROM unnest(ARRAY['CUSTOMER','SUPER_ADMIN','FINANCE','SUPPORT','COMPLIANCE','TRADING_OPS','AUDITOR','HR']) AS v ON CONFLICT DO NOTHING;
