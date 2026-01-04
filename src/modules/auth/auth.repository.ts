import { login as loginQuery } from '../../db/queries/auth.queries';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  hashToken,
} from '../../db/queries/refresh-token.queries';
import { type User } from '../../db/schema/auth/users';
import { type Profile } from '../../db/schema/public/profiles';
import { type RefreshToken } from '../../db/schema/auth/refresh_tokens';

export class AuthRepository {
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; profile: Profile }> {
    return await loginQuery(email, password);
  }

  async createRefreshToken(
    token: string,
    userId: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<RefreshToken> {
    return await createRefreshToken({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });
  }

  async findRefreshTokenByToken(
    token: string
  ): Promise<RefreshToken | undefined> {
    const tokenHash = hashToken(token);
    return await findRefreshTokenByHash(tokenHash);
  }

  async revokeRefreshToken(
    tokenId: string,
    replacedByTokenId?: string
  ): Promise<void> {
    await revokeRefreshToken(tokenId, replacedByTokenId);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await revokeAllUserRefreshTokens(userId);
  }
}
