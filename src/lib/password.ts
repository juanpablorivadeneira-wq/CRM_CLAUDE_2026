// Usamos bcryptjs (puro JS, sin deps nativas) en lugar de argon2.
// Razón: argon2 requiere node:crypto que no funciona en el edge runtime
// que usa el middleware de Next.js. bcryptjs sí funciona en cualquier runtime.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
