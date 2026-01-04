import { AuthRepository } from './auth.repository';
import { generateToken } from '../../utils/jwt';
import { generateRefreshToken } from '../../db/queries/refresh-token.queries';
import { getRefreshTokenExpirationDate } from '../../utils/auth';
import { getUserById } from '../../db/queries/user.queries';
import { getProfileById } from '../../db/queries/profile.queries';
import { type User } from '../../db/schema/auth/users';
import { type Profile } from '../../db/schema/public/profiles';
import { AppError } from '../../errors/AppError';
import { ERROR_MESSAGES, ERROR_CODES } from '../../config/errors';

export class AuthService {
  private repository: AuthRepository;

  constructor(repository?: AuthRepository) {
    this.repository = repository || new AuthRepository();
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{
    user: User;
    profile: Profile;
    access_token: string;
    refresh_token: string;
  }> {
    const { user, profile } = await this.repository.login(email, password);

    const access_token = generateToken({
      sub: user.id,
      role: user.role || 'user',
    });

    const refresh_token = generateRefreshToken();
    const expiresAt = getRefreshTokenExpirationDate();

    await this.repository.createRefreshToken(
      refresh_token,
      user.id,
      expiresAt,
      userAgent,
      ipAddress
    );

    return {
      user,
      profile,
      access_token,
      refresh_token,
    };
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{
    user: User;
    profile: Profile;
    access_token: string;
    refresh_token: string;
  }> {
    const storedToken = await this.repository.findRefreshTokenByToken(
      refreshToken
    );

    if (!storedToken) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.REFRESH_TOKEN_NOT_FOUND,
        401,
        ERROR_CODES.AUTH_REFRESH_TOKEN_NOT_FOUND
      );
    }

    if (storedToken.revokedAt) {
      await this.repository.revokeAllUserTokens(storedToken.userId);
      throw new AppError(
        ERROR_MESSAGES.AUTH.REFRESH_TOKEN_REVOKED,
        401,
        ERROR_CODES.AUTH_REFRESH_TOKEN_REVOKED
      );
    }

    if (new Date() > storedToken.expiresAt) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.REFRESH_TOKEN_EXPIRED,
        401,
        ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED
      );
    }

    const user = await getUserById(storedToken.userId);
    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER.NOT_FOUND,
        404,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    const profile = await getProfileById(user.id);
    if (!profile) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.PROFILE_NOT_FOUND,
        404,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }

    const new_access_token = generateToken({
      sub: user.id,
      role: user.role || 'user',
    });

    const new_refresh_token = generateRefreshToken();
    const expiresAt = getRefreshTokenExpirationDate();

    const newTokenRecord = await this.repository.createRefreshToken(
      new_refresh_token,
      user.id,
      expiresAt,
      userAgent,
      ipAddress
    );

    await this.repository.revokeRefreshToken(storedToken.id, newTokenRecord.id);

    return {
      user,
      profile,
      access_token: new_access_token,
      refresh_token: new_refresh_token,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const storedToken = await this.repository.findRefreshTokenByToken(
      refreshToken
    );

    if (storedToken && !storedToken.revokedAt) {
      await this.repository.revokeRefreshToken(storedToken.id);
    }
  }
}
