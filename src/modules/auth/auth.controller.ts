import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { getCookieMaxAge, getRefreshTokenCookieMaxAge } from '../../utils/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../errors/AppError';
import { ERROR_MESSAGES, ERROR_CODES } from '../../config/errors';

const authService = new AuthService();

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.MISSING_EMAIL_PASSWORD,
        400,
        ERROR_CODES.AUTH_MISSING_CREDENTIALS
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.INVALID_EMAIL,
        400,
        ERROR_CODES.AUTH_INVALID_EMAIL
      );
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.ip || req.socket.remoteAddress) as
      | string
      | undefined;

    const result = await authService.login(
      email,
      password,
      userAgent,
      ipAddress
    );

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getCookieMaxAge(),
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getRefreshTokenCookieMaxAge(),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        profile: result.profile,
      },
    });
  }
);

export const refresh = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cookies = req.cookies as { refresh_token?: string } | undefined;
    const refreshToken = cookies?.refresh_token;

    if (!refreshToken) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.REFRESH_TOKEN_NOT_FOUND,
        401,
        ERROR_CODES.AUTH_REFRESH_TOKEN_NOT_FOUND
      );
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.ip || req.socket.remoteAddress) as
      | string
      | undefined;

    const result = await authService.refreshTokens(
      refreshToken,
      userAgent,
      ipAddress
    );

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getCookieMaxAge(),
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getRefreshTokenCookieMaxAge(),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        profile: result.profile,
      },
    });
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cookies = req.cookies as { refresh_token?: string } | undefined;
    const refreshToken = cookies?.refresh_token;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logout exitoso',
    });
  }
);
