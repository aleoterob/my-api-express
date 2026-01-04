import { db } from '../index';
import { refreshTokens } from '../schema/auth/refresh_tokens';
import { eq, and, isNull, lt } from 'drizzle-orm';
import {
  type RefreshToken,
  type NewRefreshToken,
} from '../schema/auth/refresh_tokens';
import crypto from 'crypto';

export async function createRefreshToken(
  data: Omit<NewRefreshToken, 'tokenHash'> & { token: string }
): Promise<RefreshToken> {
  const tokenHash = hashToken(data.token);

  const [newToken] = await db
    .insert(refreshTokens)
    .values({
      userId: data.userId,
      tokenHash,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
    })
    .returning();

  if (!newToken) {
    throw new Error('Failed to create refresh token');
  }

  return newToken;
}

export async function findRefreshTokenByHash(
  tokenHash: string
): Promise<RefreshToken | undefined> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt)
      )
    )
    .limit(1);

  return token;
}

export async function revokeRefreshToken(
  tokenId: string,
  replacedByTokenId?: string
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      replacedByToken: replacedByTokenId || null,
    })
    .where(eq(refreshTokens.id, tokenId));
}

export async function revokeAllUserRefreshTokens(
  userId: string
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt))
    );
}

export async function cleanupExpiredTokens(): Promise<void> {
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
