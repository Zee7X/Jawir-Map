import { createHash } from 'crypto';

const DEFAULT_SALT = 'jawir_default_secret_salt_2026';
let warned = false;

export function hashString(value: string): string {
  const salt = process.env.HASH_SALT || DEFAULT_SALT;
  if (!process.env.HASH_SALT && process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    // The default salt is public, so IP hashes could be brute-forced back to addresses.
    console.warn('HASH_SALT is not set: device and IP hashes use the public default salt.');
  }
  return createHash('sha256').update(value + salt).digest('hex');
}
