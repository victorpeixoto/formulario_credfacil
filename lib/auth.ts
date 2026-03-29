import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { JWTPayload } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_HOURS = 1;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarJWT(cpf: string, formCode: string): string {
  return jwt.sign({ cpf, formCode }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verificarJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function gerarResetToken(): { token: string; expira: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);
  return { token, expira };
}
