// Rate limiting is currently disabled across the backend.
// This file is kept as a stub for potential future use.
// If you want to re-enable rate limiting, import express-rate-limit
// here and wire the middleware in server.ts and relevant routes.

export const rateLimiter = ((_req: any, _res: any, next: any) => next()) as any;
export const authRateLimiter = rateLimiter;
