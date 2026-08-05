import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import type { Role } from "@cbos/shared";

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtAccessExpiry as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

/**
 * Refresh tokens are NOT stored as raw JWTs in the database — only a
 * SHA-256 hash of the opaque random token is stored. If the DB were
 * ever exfiltrated, the tokens in it would still be useless without
 * the original random value, which only ever lives in the client's
 * httpOnly cookie. This is standard practice for refresh-token
 * storage and is meaningfully more defensible than storing tokens in
 * plaintext.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.jwtRefreshExpiry));
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  return raw;
}

export async function rotateRefreshToken(oldRaw: string): Promise<{ userId: string; newRaw: string } | null> {
  const oldHash = hashToken(oldRaw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  const newRaw = await issueRefreshToken(existing.userId);
  return { userId: existing.userId, newRaw };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const hash = hashToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function parseExpiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}
