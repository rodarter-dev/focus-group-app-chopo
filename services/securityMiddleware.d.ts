export type AuthMode = 'none' | 'iap' | 'login';
export type ChopoRole = 'admin' | 'marketing';

export interface SecurityConfig {
  authMode: AuthMode;
  adminEmails: Set<string>;
  rbacEnforced: boolean;
  userScopedRuns: boolean;
  iapAllowHeaderOnly: boolean;
  sessionSecret: string;
  genaiRateLimitMax: number;
  genaiRateLimitWindowMs: number;
  apiRateLimitMax: number;
  apiRateLimitWindowMs: number;
}

export interface ChopoUser {
  userId: string;
  email: string;
  role: ChopoRole;
  authMode: AuthMode;
  authenticated: boolean;
}

export interface SecurityHeadersOptions {
  contentSecurityPolicy?: string;
  forceHsts?: boolean;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  message?: string;
  maxKeys?: number;
}

export type ExpressLikeRequest = {
  method?: string;
  path?: string;
  url?: string;
  baseUrl?: string;
  originalUrl?: string;
  ip?: string;
  secure?: boolean;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  chopoUser?: ChopoUser;
};

export type ExpressLikeResponse = {
  setHeader: (name: string, value: string) => unknown;
  status: (code: number) => ExpressLikeResponse;
  json: (body: unknown) => unknown;
};

export type NextFunction = (err?: unknown) => void;

export type MiddlewareFunction = (
  req: ExpressLikeRequest,
  res: ExpressLikeResponse,
  next: NextFunction
) => unknown;

export interface RateLimiterMiddleware extends MiddlewareFunction {
  reset: () => void;
  destroy: () => void;
}

export declare const USER_SCOPED_FEATURES: Set<string>;

export declare function sanitizeUserId(rawUserId: unknown): string;

export declare function parseSecurityConfig(
  env?: Record<string, string | undefined>
): SecurityConfig;

export declare function createSecurityHeadersMiddleware(
  options?: SecurityHeadersOptions
): MiddlewareFunction;

export declare function createRateLimiter(
  options?: RateLimiterOptions
): RateLimiterMiddleware;

export declare function signSessionToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds?: number
): string;

export declare function verifySessionToken(
  token: string,
  secret: string
): Record<string, unknown> | null;

export declare function parseCookies(
  cookieHeader: string | undefined | null
): Record<string, string>;

export declare function createAuthMiddleware(
  config?: SecurityConfig
): MiddlewareFunction;

export declare function requireAdminRole(
  config?: SecurityConfig
): MiddlewareFunction;

export declare function resolveScopedRunDocId(
  featureId: string,
  chopoUser?: Partial<ChopoUser> | null,
  config?: Partial<SecurityConfig> | null
): string;
