-- Prevent appending entries to an already committed journal transaction.
ALTER TABLE ledger_transactions ADD COLUMN posted_xid bigint NOT NULL DEFAULT txid_current();
CREATE OR REPLACE FUNCTION require_current_journal() RETURNS trigger AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM ledger_transactions WHERE id=NEW.transaction_id AND posted_xid=txid_current()) THEN RAISE EXCEPTION 'cannot append to a committed journal'; END IF; RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_no_late_entries BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION require_current_journal();
ALTER TABLE ledger_accounts ADD CONSTRAINT ledger_currency_kes CHECK(currency='KES');
CREATE TRIGGER compliance_immutable BEFORE UPDATE OR DELETE ON compliance_records FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE OR REPLACE FUNCTION review_guard() RETURNS trigger AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM users u JOIN withdrawal_requests w ON w.id=NEW.withdrawal_id WHERE u.id=NEW.admin_id AND u.role='SUPER_ADMIN' AND u.status='active' AND w.user_id<>u.id AND w.status='PENDING_ADMIN_APPROVAL') THEN RAISE EXCEPTION 'authorized independent super admin review required'; END IF; RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER withdrawal_review_guard BEFORE INSERT ON withdrawal_reviews FOR EACH ROW EXECUTE FUNCTION review_guard();
