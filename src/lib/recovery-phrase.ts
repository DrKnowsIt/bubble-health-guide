/**
 * Recovery phrase = BIP39 24-word mnemonic (256 bits of entropy).
 *
 * Generated once at signup, shown to the user, and never stored on
 * the server in plaintext form. The phrase is used as the secret for
 * a second PBKDF2-derived wrapping of the data key, so a user who
 * forgets their password can still recover identifiers using the phrase.
 *
 * If both the password and the phrase are lost, encrypted identifiers
 * are unrecoverable. Clinical data (which is linked to an opaque
 * patient token) remains usable.
 */
import { generateMnemonic, validateMnemonic } from "bip39";

export function generateRecoveryPhrase(): string {
  // 256 bits = 24 words
  return generateMnemonic(256);
}

export function isValidRecoveryPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim().toLowerCase());
}

export function normalizeRecoveryPhrase(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).join(" ");
}
