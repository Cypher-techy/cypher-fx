import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { requireThat } from "./errors";
function key() {
  requireThat(
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32,
    503,
    "AUTH_SECRET must be configured with at least 32 random characters for privileged MFA",
  );
  return createHash("sha256").update(process.env.AUTH_SECRET).digest();
}
export function encryptSecret(plain: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
export function decryptSecret(value: string) {
  const [version, iv, tag, data] = value.split(".");
  requireThat(
    version === "v1" && iv && tag && data,
    503,
    "MFA secret configuration is invalid",
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
