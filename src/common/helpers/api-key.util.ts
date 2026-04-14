import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

const SECRET = process.env.API_KEY_SECRET || "personal-api-secret";

export interface GeneratedApiKey {
  rawKey: string;
  encryptedKey: string;
  expiresAt: Date;
}

export function generateApiKey(
  userId: string,
  expiresInDays = 30,
): GeneratedApiKey {
  const rawKey = `${userId}.${crypto.randomBytes(24).toString("hex")}`;

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(SECRET.padEnd(32, "0")),
    Buffer.alloc(16, 0),
  );
  let encrypted = cipher.update(rawKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return { rawKey, encryptedKey: encrypted, expiresAt };
}

export function decryptApiKey(encryptedKey: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(SECRET.padEnd(32, "0")),
    Buffer.alloc(16, 0),
  );
  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function hashApiKey(encryptedKey: string): Promise<string> {
  return bcrypt.hash(encryptedKey, 10);
}

export async function verifyApiKey(
  receivedKey: string,
  storedHash: string,
  expiresAt: Date,
): Promise<boolean> {
  try {
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(SECRET.padEnd(32, "0")),
      Buffer.alloc(16, 0),
    );
    let encrypted = cipher.update(receivedKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const isMatch = await bcrypt.compare(encrypted, storedHash);

    const isNotExpired = new Date(expiresAt).getTime() > Date.now();

    return isMatch && isNotExpired;
  } catch (error) {
    console.error("[verifyApiKey] Error:", error.message);
    return false;
  }
}
