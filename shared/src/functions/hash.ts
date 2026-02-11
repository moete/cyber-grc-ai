import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SALT_LENGTH = 32
const KEY_LENGTH = 64
const SCRYPT_COST = { N: 16384, r: 8, p: 1 }

/**
 * Hash a password using Node.js native scrypt.
 * Output format: hex(salt):hex(derived-key)
 *
 * Uses scrypt params (cost 16384, block 8, parallel 1) compatible with
 * AdonisJS default hash config. Zero external dependencies.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_COST)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

/**
 * Verify a password against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':')
  if (parts.length !== 2) return false

  const [saltHex, hashHex] = parts
  if (!saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const storedBuffer = Buffer.from(hashHex, 'hex')

  if (storedBuffer.length !== KEY_LENGTH) return false

  const derived = scryptSync(password, salt, KEY_LENGTH, SCRYPT_COST)
  return timingSafeEqual(storedBuffer, derived)
}
