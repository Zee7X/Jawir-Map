import { createHash } from 'crypto';

export function hashString(value: string): string {
  const salt = process.env.HASH_SALT || 'jawir_default_secret_salt_2026';
  return createHash('sha256').update(value + salt).digest('hex');
}
