import { rows, sql } from "../src/db";
import { provision, audit } from "../src/lib/auth";
import { encryptSecret } from "../src/lib/secrets";
// Run only in an operator-controlled environment. No default password or MFA secret is ever supplied.
const email = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.INITIAL_SUPER_ADMIN_PASSWORD,
  totp = process.env.INITIAL_SUPER_ADMIN_TOTP_SECRET;
if (!email || !password || password.length < 16 || !totp || totp.length < 16)
  throw new Error(
    "Set INITIAL_SUPER_ADMIN_EMAIL, a 16+ character INITIAL_SUPER_ADMIN_PASSWORD, and a secure base32 INITIAL_SUPER_ADMIN_TOTP_SECRET already enrolled in your authenticator.",
  );
const encrypted = encryptSecret(totp);
const exists = await rows(sql`SELECT id FROM users WHERE email=${email}`);
if (exists.length)
  throw new Error(
    "Account already exists. Bootstrap will not modify or elevate an existing user.",
  );
const uid = await provision("Platform Administrator", email, password, {
  role: "SUPER_ADMIN",
  status: "active",
  verified: true,
});
await rows(sql`UPDATE users SET mfa_secret=${encrypted} WHERE id=${uid}`);
await audit(uid, "staff.super_admin.bootstrap", uid);
console.log(
  "Super Admin created. Remove one-time bootstrap credentials from the environment immediately.",
);
process.exit(0);
