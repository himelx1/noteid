/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes a secure SHA-256 hash of a string using native browser APIs.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes a secure SHA-256 hash of a 4-digit PIN for a specific note.
 */
export async function hashPin(pin: string, noteId: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`note_pin_${noteId}_${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Formats a timestamp into a clean, human-readable date.
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a time sticker based on standard brackets.
 */
export function getTimeSticker(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) {
    return "New";
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }
}

/**
 * Unique ID generator for notes, folders, and tags.
 */
export function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

/**
 * Strips HTML tags from a string to return pure text content.
 * Optimised with high-performance regex parsing to avoid slow DOM operations.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  let clean = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  
  // Re-strip any newly unescaped HTML tags (e.g., from &lt;mark&gt;) to avoid leaking raw tags
  clean = clean.replace(/<[^>]*>/g, " ");
  
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Derives a CryptoKey for AES-GCM encryption/decryption from a hex key string.
 */
async function getAESKey(hashStr: string): Promise<CryptoKey> {
  let cleanHash = hashStr || "";
  // Ensure we have exactly 64 characters (256 bits of hex key)
  if (cleanHash.length < 64) {
    cleanHash = cleanHash.padEnd(64, "f");
  } else if (cleanHash.length > 64) {
    cleanHash = cleanHash.substring(0, 64);
  }
  const rawKey = new Uint8Array(cleanHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts clear text with AES-GCM using native browser Crypto.
 */
export async function encryptText(text: string, keyStr: string): Promise<string> {
  if (!text) return "";
  if (!keyStr) return text;
  try {
    const key = await getAESKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedText
    );
    
    // Combine IV and Ciphertext as hex representation
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, "0")).join("");
    return `__ENC__${ivHex}:${encryptedHex}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
}

/**
 * Decrypts AES-GCM encrypted text. Supports transparent fallback for unencrypted data.
 */
export async function decryptText(encryptedStr: string, keyStr: string): Promise<string> {
  if (!encryptedStr) return "";
  if (!encryptedStr.startsWith("__ENC__")) return encryptedStr; // Transparent backward-compatibility
  if (!keyStr) return encryptedStr;
  
  try {
    const key = await getAESKey(keyStr);
    const parts = encryptedStr.substring(7).split(":");
    if (parts.length !== 2) return encryptedStr;
    const ivHex = parts[0];
    const encryptedHex = parts[1];
    
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Encrypted Content - Enter password to unlock]";
  }
}

/**
 * Returns the CSS class names for styling note cards based on their chosen background template.
 */
export function getCardBackgroundClass(background?: string, isSelected?: boolean): string {
  const baseSelected = isSelected
    ? "border-charcoal-300 bg-charcoal-800/35"
    : "border-charcoal-700/20";

  switch (background) {
    case "dotted":
      return `bg-note-dotted ${isSelected ? "border-charcoal-300" : "border-charcoal-700/20"}`;
    default:
      // default / charcoal black
      return `bg-charcoal-800/20 hover:bg-charcoal-800/40 ${baseSelected}`;
  }
}

