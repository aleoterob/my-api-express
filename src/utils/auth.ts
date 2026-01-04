import {
  TOKEN_EXPIRATION_MINUTES,
  REFRESH_TOKEN_EXPIRATION_MINUTES,
} from '../config/constants';

export function getTokenExpirationString(): string {
  return `${TOKEN_EXPIRATION_MINUTES}m`;
}

export function getCookieMaxAge(): number {
  return TOKEN_EXPIRATION_MINUTES * 60 * 1000;
}

export function getRefreshTokenExpirationDate(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + REFRESH_TOKEN_EXPIRATION_MINUTES);
  return now;
}

export function getRefreshTokenCookieMaxAge(): number {
  return REFRESH_TOKEN_EXPIRATION_MINUTES * 60 * 1000;
}
