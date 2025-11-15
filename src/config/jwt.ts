export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as string
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
