import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(salt: Buffer): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  return scryptSync(key, salt, 32);
}

export function encrypt(text: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Format: Salt + IV + Tag + Encrypted data
  return salt.toString("hex") + iv.toString("hex") + tag.toString("hex") + encrypted;
}

export function decrypt(encryptedText: string): string {
  // Extract Salt, IV, Tag, and encrypted data
  const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), "hex");
  const iv = Buffer.from(encryptedText.slice(SALT_LENGTH * 2, (SALT_LENGTH + IV_LENGTH) * 2), "hex");
  const tag = Buffer.from(encryptedText.slice((SALT_LENGTH + IV_LENGTH) * 2, (SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 2), "hex");
  const encrypted = encryptedText.slice((SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 2);

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
