import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  USER_SCOPED_FEATURES,
  sanitizeUserId,
  parseSecurityConfig,
  createSecurityHeadersMiddleware,
  createRateLimiter,
  signSessionToken,
  verifySessionToken,
  parseCookies,
  createAuthMiddleware,
  requireAdminRole,
  resolveScopedRunDocId
} from '../services/securityMiddleware.js';
import type {
  ExpressLikeRequest,
  ExpressLikeResponse
} from '../services/securityMiddleware.js';

interface MockResponse extends ExpressLikeResponse {
  headers: Record<string, string>;
  statusCode: number;
  body: unknown;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name: string, value: string) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    }
  };
  return res;
}

function createMockReq(overrides: Partial<ExpressLikeRequest> = {}): ExpressLikeRequest {
  return {
    method: 'GET',
    path: '/api/personas',
    headers: {},
    ip: '127.0.0.1',
    secure: false,
    ...overrides
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('parseSecurityConfig', () => {
  test('returns backward-compatible defaults when env is empty', () => {
    const cfg = parseSecurityConfig({});
    expect(cfg.authMode).toBe('none');
    expect(cfg.adminEmails.size).toBe(0);
    expect(cfg.rbacEnforced).toBe(false);
    expect(cfg.userScopedRuns).toBe(false);
    expect(cfg.iapAllowHeaderOnly).toBe(false);
    expect(cfg.sessionSecret).toBe('');
    expect(cfg.genaiRateLimitMax).toBe(60);
    expect(cfg.genaiRateLimitWindowMs).toBe(60000);
    expect(cfg.apiRateLimitMax).toBe(300);
    expect(cfg.apiRateLimitWindowMs).toBe(60000);
  });

  test('normalizes AUTH_MODE values, jwt alias, adminEmails, and boolean defaults', () => {
    const iapCfg = parseSecurityConfig({
      AUTH_MODE: '  IAP ',
      CHOPO_ADMIN_EMAILS: ' Admin@Chopo.com.mx, regulatorio@chopo.com.mx , , ',
      IAP_ALLOW_HEADER_ONLY: 'true'
    });
    expect(iapCfg.authMode).toBe('iap');
    expect(iapCfg.rbacEnforced).toBe(true);
    expect(iapCfg.userScopedRuns).toBe(true);
    expect(iapCfg.iapAllowHeaderOnly).toBe(true);
    expect(iapCfg.adminEmails.has('admin@chopo.com.mx')).toBe(true);
    expect(iapCfg.adminEmails.has('regulatorio@chopo.com.mx')).toBe(true);
    expect(iapCfg.adminEmails.size).toBe(2);

    const jwtAliasCfg = parseSecurityConfig({
      AUTH_MODE: 'JWT',
      RBAC_ENFORCE: 'false',
      USER_SCOPED_RUNS: 'false',
      CHOPO_SESSION_SECRET: 'super-secret-value'
    });
    expect(jwtAliasCfg.authMode).toBe('login');
    expect(jwtAliasCfg.rbacEnforced).toBe(false);
    expect(jwtAliasCfg.userScopedRuns).toBe(false);
    expect(jwtAliasCfg.sessionSecret).toBe('super-secret-value');

    const explicitNoneOverrides = parseSecurityConfig({
      AUTH_MODE: 'none',
      RBAC_ENFORCE: 'true',
      USER_SCOPED_RUNS: 'true'
    });
    expect(explicitNoneOverrides.authMode).toBe('none');
    expect(explicitNoneOverrides.rbacEnforced).toBe(true);
    expect(explicitNoneOverrides.userScopedRuns).toBe(true);
  });

  test('parses positive integer rate limits and falls back on invalid values', () => {
    const valid = parseSecurityConfig({
      GENAI_RATE_LIMIT_MAX: '25',
      GENAI_RATE_LIMIT_WINDOW_MS: '30000',
      API_RATE_LIMIT_MAX: '500',
      API_RATE_LIMIT_WINDOW_MS: '120000'
    });
    expect(valid.genaiRateLimitMax).toBe(25);
    expect(valid.genaiRateLimitWindowMs).toBe(30000);
    expect(valid.apiRateLimitMax).toBe(500);
    expect(valid.apiRateLimitWindowMs).toBe(120000);

    const invalid = parseSecurityConfig({
      GENAI_RATE_LIMIT_MAX: '0',
      GENAI_RATE_LIMIT_WINDOW_MS: '-100',
      API_RATE_LIMIT_MAX: 'not-a-number',
      API_RATE_LIMIT_WINDOW_MS: ''
    });
    expect(invalid.genaiRateLimitMax).toBe(60);
    expect(invalid.genaiRateLimitWindowMs).toBe(60000);
    expect(invalid.apiRateLimitMax).toBe(300);
    expect(invalid.apiRateLimitWindowMs).toBe(60000);
  });
});

describe('createSecurityHeadersMiddleware', () => {
  test('sets standard security headers and CSP, omitting HSTS on plain HTTP localhost', () => {
    const prevKService = process.env.K_SERVICE;
    delete process.env.K_SERVICE;
    try {
      const mw = createSecurityHeadersMiddleware();
      const req = createMockReq({ secure: false, headers: { 'x-forwarded-proto': 'http' } });
      const res = createMockRes();
      const next = vi.fn();

      mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toBe(
        'camera=(), microphone=(), geolocation=(), payment=()'
      );
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
      expect(res.headers['content-security-policy']).toBe(
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      );
      expect(res.headers['strict-transport-security']).toBeUndefined();
    } finally {
      if (prevKService !== undefined) process.env.K_SERVICE = prevKService;
    }
  });

  test('sets HSTS when req.secure, x-forwarded-proto=https, K_SERVICE, or forceHsts is active', () => {
    const prevKService = process.env.K_SERVICE;
    delete process.env.K_SERVICE;
    try {
      const mw = createSecurityHeadersMiddleware();

      const secureRes = createMockRes();
      mw(createMockReq({ secure: true }), secureRes, vi.fn());
      expect(secureRes.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains'
      );

      const proxyRes = createMockRes();
      mw(
        createMockReq({ headers: { 'x-forwarded-proto': 'https, http' } }),
        proxyRes,
        vi.fn()
      );
      expect(proxyRes.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains'
      );

      const forcedMw = createSecurityHeadersMiddleware({ forceHsts: true });
      const forcedRes = createMockRes();
      forcedMw(createMockReq({ secure: false }), forcedRes, vi.fn());
      expect(forcedRes.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains'
      );

      process.env.K_SERVICE = 'chopo-intelligence-hub';
      const cloudRunRes = createMockRes();
      mw(createMockReq({ secure: false }), cloudRunRes, vi.fn());
      expect(cloudRunRes.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains'
      );
    } finally {
      if (prevKService !== undefined) {
        process.env.K_SERVICE = prevKService;
      } else {
        delete process.env.K_SERVICE;
      }
    }
  });
});

describe('createRateLimiter', () => {
  test('enforces maxRequests, sets rate limit headers, returns 429 in Spanish, and resets cleanly', () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      keyPrefix: 'genai'
    });

    try {
      const req = createMockReq({ headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' } });

      const res1 = createMockRes();
      const next1 = vi.fn();
      limiter(req, res1, next1);
      expect(next1).toHaveBeenCalledTimes(1);
      expect(res1.headers['x-ratelimit-limit']).toBe('2');
      expect(res1.headers['x-ratelimit-remaining']).toBe('1');
      expect(Number(res1.headers['x-ratelimit-reset'])).toBeGreaterThan(0);

      const res2 = createMockRes();
      const next2 = vi.fn();
      limiter(req, res2, next2);
      expect(next2).toHaveBeenCalledTimes(1);
      expect(res2.headers['x-ratelimit-remaining']).toBe('0');

      const res3 = createMockRes();
      const next3 = vi.fn();
      limiter(req, res3, next3);
      expect(next3).not.toHaveBeenCalled();
      expect(res3.statusCode).toBe(429);
      expect(Number(res3.headers['retry-after'])).toBeGreaterThanOrEqual(1);
      const body = res3.body as { error: string; retryAfterSeconds: number };
      expect(body.error).toContain('límite temporal');
      expect(body.error).not.toMatch(/[!¡]/);
      expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(1);

      limiter.reset();

      const res4 = createMockRes();
      const next4 = vi.fn();
      limiter(req, res4, next4);
      expect(next4).toHaveBeenCalledTimes(1);
      expect(res4.headers['x-ratelimit-remaining']).toBe('1');
    } finally {
      limiter.destroy();
    }
  });

  test('scopes buckets by authenticated userId instead of shared NAT IP, while local-demo uses IP', () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: 'api'
    });

    try {
      const userAReq = createMockReq({
        headers: { 'x-forwarded-for': '198.51.100.5' },
        chopoUser: {
          userId: 'ana_chopo',
          email: 'ana@chopo.com.mx',
          role: 'marketing',
          authMode: 'iap',
          authenticated: true
        }
      });
      const userBReq = createMockReq({
        headers: { 'x-forwarded-for': '198.51.100.5' },
        chopoUser: {
          userId: 'luis_chopo',
          email: 'luis@chopo.com.mx',
          role: 'marketing',
          authMode: 'iap',
          authenticated: true
        }
      });

      const nextA1 = vi.fn();
      limiter(userAReq, createMockRes(), nextA1);
      expect(nextA1).toHaveBeenCalledTimes(1);

      const resA2 = createMockRes();
      limiter(userAReq, resA2, vi.fn());
      expect(resA2.statusCode).toBe(429);

      // User B behind same corporate IP still has their own quota
      const nextB1 = vi.fn();
      limiter(userBReq, createMockRes(), nextB1);
      expect(nextB1).toHaveBeenCalledTimes(1);

      // local-demo falls back to client IP
      const demoReq1 = createMockReq({
        ip: '10.1.1.1',
        chopoUser: {
          userId: 'local-demo',
          email: 'marketing@chopo.local',
          role: 'admin',
          authMode: 'none',
          authenticated: true
        }
      });
      const demoReq2 = createMockReq({
        ip: '10.1.1.2',
        chopoUser: {
          userId: 'local-demo',
          email: 'marketing@chopo.local',
          role: 'admin',
          authMode: 'none',
          authenticated: true
        }
      });
      const nextD1 = vi.fn();
      const nextD2 = vi.fn();
      limiter(demoReq1, createMockRes(), nextD1);
      limiter(demoReq2, createMockRes(), nextD2);
      expect(nextD1).toHaveBeenCalledTimes(1);
      expect(nextD2).toHaveBeenCalledTimes(1);
    } finally {
      limiter.destroy();
    }
  });

  test('recovers quota after windowMs elapses and respects maxKeys bound', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({
      windowMs: 5000,
      maxRequests: 1,
      keyPrefix: 'bounded',
      maxKeys: 2
    });

    try {
      const req1 = createMockReq({ ip: '10.0.0.1' });
      const req2 = createMockReq({ ip: '10.0.0.2' });
      const req3 = createMockReq({ ip: '10.0.0.3' });

      limiter(req1, createMockRes(), vi.fn());
      limiter(req2, createMockRes(), vi.fn());
      // Inserting req3 evicts oldest key (req1) due to maxKeys=2
      limiter(req3, createMockRes(), vi.fn());

      // req3 is now at max=1
      const blockedRes = createMockRes();
      limiter(req3, blockedRes, vi.fn());
      expect(blockedRes.statusCode).toBe(429);

      // Advance past windowMs
      vi.advanceTimersByTime(5001);
      const nextAfterWindow = vi.fn();
      limiter(req3, createMockRes(), nextAfterWindow);
      expect(nextAfterWindow).toHaveBeenCalledTimes(1);
    } finally {
      limiter.destroy();
    }
  });
});

describe('signSessionToken, verifySessionToken, and parseCookies', () => {
  const SECRET = 'chopo-test-hmac-secret-2026';

  test('signs and verifies a valid HMAC-SHA256 JWT token', () => {
    const token = signSessionToken(
      { userId: 'u_123', email: 'ana@chopo.com.mx', role: 'marketing' },
      SECRET,
      3600
    );
    expect(token.split('.')).toHaveLength(3);

    const claims = verifySessionToken(token, SECRET);
    expect(claims).not.toBeNull();
    expect(claims?.userId).toBe('u_123');
    expect(claims?.email).toBe('ana@chopo.com.mx');
    expect(claims?.role).toBe('marketing');
    expect(typeof claims?.iat).toBe('number');
    expect(typeof claims?.exp).toBe('number');
    expect((claims?.exp as number) - (claims?.iat as number)).toBe(3600);
  });

  test('rejects wrong secret, tampered payload/signature, malformed tokens, and expired tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));

    const token = signSessionToken({ userId: 'u_1', role: 'marketing' }, SECRET, 60);
    const [headerB64, payloadB64, sigB64] = token.split('.');

    // Wrong secret
    expect(verifySessionToken(token, 'wrong-secret')).toBeNull();

    // Tampered payload (attempting privilege escalation)
    const escalatedPayload = Buffer.from(
      JSON.stringify({ userId: 'u_1', role: 'admin', iat: 1795521600, exp: 1795525200 }),
      'utf8'
    ).toString('base64url');
    expect(verifySessionToken(`${headerB64}.${escalatedPayload}.${sigB64}`, SECRET)).toBeNull();

    // Tampered signature
    const flippedSig = sigB64.slice(0, -1) + (sigB64.endsWith('a') ? 'b' : 'a');
    expect(verifySessionToken(`${headerB64}.${payloadB64}.${flippedSig}`, SECRET)).toBeNull();

    // Malformed / empty
    expect(verifySessionToken('not.a.valid.jwt.token', SECRET)).toBeNull();
    expect(verifySessionToken('', SECRET)).toBeNull();
    expect(verifySessionToken(token, '')).toBeNull();

    // Expiry via advancing clock
    vi.advanceTimersByTime(61 * 1000);
    expect(verifySessionToken(token, SECRET)).toBeNull();

    // Already expired via negative TTL
    const expiredToken = signSessionToken({ userId: 'u_2' }, SECRET, -10);
    expect(verifySessionToken(expiredToken, SECRET)).toBeNull();

    // Signing without secret throws
    expect(() => signSessionToken({ userId: 'u_1' }, '')).toThrow();
  });

  test('parseCookies decodes multiple cookies safely', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
    expect(parseCookies('chopo_session=abc.def.ghi; theme=dark; note=hola%20chopo; eq=a=b')).toEqual(
      {
        chopo_session: 'abc.def.ghi',
        theme: 'dark',
        note: 'hola chopo',
        eq: 'a=b'
      }
    );
  });
});

describe('createAuthMiddleware', () => {
  test('always allows GET /health and non-API static assets in all auth modes', () => {
    for (const mode of ['none', 'iap', 'login'] as const) {
      const cfg = parseSecurityConfig({ AUTH_MODE: mode, CHOPO_SESSION_SECRET: 'sec' });
      const auth = createAuthMiddleware(cfg);

      const nextHealth = vi.fn();
      auth(createMockReq({ method: 'GET', path: '/health' }), createMockRes(), nextHealth);
      expect(nextHealth).toHaveBeenCalledTimes(1);

      const nextAsset = vi.fn();
      auth(createMockReq({ method: 'GET', path: '/assets/app.js' }), createMockRes(), nextAsset);
      expect(nextAsset).toHaveBeenCalledTimes(1);
    }
  });

  test('AUTH_MODE=none attaches local-demo admin user on /api routes', () => {
    const cfg = parseSecurityConfig({ AUTH_MODE: 'none' });
    const auth = createAuthMiddleware(cfg);
    const req = createMockReq({ path: '/api/personas' });
    const res = createMockRes();
    const next = vi.fn();

    auth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.chopoUser).toEqual({
      userId: 'local-demo',
      email: 'marketing@chopo.local',
      role: 'admin',
      authMode: 'none',
      authenticated: true
    });
  });

  test('AUTH_MODE=iap enforces email + JWT assertion, strips prefixes, and assigns role', () => {
    const cfg = parseSecurityConfig({
      AUTH_MODE: 'iap',
      CHOPO_ADMIN_EMAILS: 'brand.admin@chopo.com.mx'
    });
    const auth = createAuthMiddleware(cfg);

    // Missing headers on /api/media/*
    const resMissing = createMockRes();
    const nextMissing = vi.fn();
    auth(createMockReq({ path: '/api/media/poster.png' }), resMissing, nextMissing);
    expect(nextMissing).not.toHaveBeenCalled();
    expect(resMissing.statusCode).toBe(401);
    expect((resMissing.body as { error: string }).error).not.toMatch(/[!¡]/);

    // Missing assertion rejected by default
    const resNoJwt = createMockRes();
    auth(
      createMockReq({
        path: '/api/personas',
        headers: {
          'x-goog-authenticated-user-email': 'accounts.google.com:brand.admin@chopo.com.mx'
        }
      }),
      resNoJwt,
      vi.fn()
    );
    expect(resNoJwt.statusCode).toBe(401);

    // Valid IAP admin user
    const adminReq = createMockReq({
      baseUrl: '/api',
      path: '/config/brand-manual',
      originalUrl: '/api/config/brand-manual',
      headers: {
        'x-goog-authenticated-user-email': 'accounts.google.com:Brand.Admin@Chopo.com.mx',
        'x-goog-authenticated-user-id': 'accounts.google.com:109876543210',
        'x-goog-iap-jwt-assertion': 'eyJhbGciOiJFUzI1NiJ9.payload.sig'
      }
    });
    const nextAdmin = vi.fn();
    auth(adminReq, createMockRes(), nextAdmin);
    expect(nextAdmin).toHaveBeenCalledTimes(1);
    expect(adminReq.chopoUser).toEqual({
      userId: '109876543210',
      email: 'brand.admin@chopo.com.mx',
      role: 'admin',
      authMode: 'iap',
      authenticated: true
    });

    // Valid IAP marketing user
    const mktReq = createMockReq({
      path: '/api/save-run',
      headers: {
        'x-goog-authenticated-user-email': 'accounts.google.com:mkt@chopo.com.mx',
        'x-goog-iap-jwt-assertion': 'eyJhbGciOiJFUzI1NiJ9.payload.sig'
      }
    });
    const nextMkt = vi.fn();
    auth(mktReq, createMockRes(), nextMkt);
    expect(nextMkt).toHaveBeenCalledTimes(1);
    expect(mktReq.chopoUser?.role).toBe('marketing');
    expect(mktReq.chopoUser?.email).toBe('mkt@chopo.com.mx');

    // Header-only mode when IAP_ALLOW_HEADER_ONLY=true
    const headerOnlyCfg = parseSecurityConfig({
      AUTH_MODE: 'iap',
      IAP_ALLOW_HEADER_ONLY: 'true'
    });
    const headerOnlyAuth = createAuthMiddleware(headerOnlyCfg);
    const localIapReq = createMockReq({
      path: '/api/auth/me',
      headers: { 'x-goog-authenticated-user-email': 'accounts.google.com:dev@chopo.com.mx' }
    });
    const nextHeaderOnly = vi.fn();
    headerOnlyAuth(localIapReq, createMockRes(), nextHeaderOnly);
    expect(nextHeaderOnly).toHaveBeenCalledTimes(1);
    expect(localIapReq.chopoUser?.email).toBe('dev@chopo.com.mx');
  });

  test('AUTH_MODE=login verifies Bearer tokens and chopo_session cookies and rejects invalid sessions', () => {
    const secret = 'test-login-secret-999';
    const cfg = parseSecurityConfig({
      AUTH_MODE: 'login',
      CHOPO_SESSION_SECRET: secret,
      CHOPO_ADMIN_EMAILS: 'promoted@chopo.com.mx'
    });
    const auth = createAuthMiddleware(cfg);

    // Missing credentials -> 401
    const resNoToken = createMockRes();
    auth(createMockReq({ path: '/api/personas' }), resNoToken, vi.fn());
    expect(resNoToken.statusCode).toBe(401);
    expect((resNoToken.body as { error: string }).error).not.toMatch(/[!¡]/);

    // Bearer token for marketing user promoted via adminEmails
    const promotedToken = signSessionToken(
      { userId: 'user_promoted', email: 'promoted@chopo.com.mx', role: 'marketing' },
      secret,
      600
    );
    const bearerReq = createMockReq({
      path: '/api/auth/me',
      headers: { authorization: `Bearer ${promotedToken}` }
    });
    const nextBearer = vi.fn();
    auth(bearerReq, createMockRes(), nextBearer);
    expect(nextBearer).toHaveBeenCalledTimes(1);
    expect(bearerReq.chopoUser).toEqual({
      userId: 'user_promoted',
      email: 'promoted@chopo.com.mx',
      role: 'admin',
      authMode: 'login',
      authenticated: true
    });

    // Cookie token for regular marketing user
    const cookieToken = signSessionToken(
      { sub: 'mkt_42', email: 'campaign@chopo.com.mx', role: 'marketing' },
      secret,
      600
    );
    const cookieReq = createMockReq({
      path: '/api/load-run/marketing_brief',
      headers: { cookie: `other=1; chopo_session=${encodeURIComponent(cookieToken)}` }
    });
    const nextCookie = vi.fn();
    auth(cookieReq, createMockRes(), nextCookie);
    expect(nextCookie).toHaveBeenCalledTimes(1);
    expect(cookieReq.chopoUser?.userId).toBe('mkt_42');
    expect(cookieReq.chopoUser?.role).toBe('marketing');

    // Expired token -> 401
    const expiredToken = signSessionToken(
      { userId: 'u_exp', email: 'exp@chopo.com.mx', role: 'admin' },
      secret,
      -5
    );
    const resExpired = createMockRes();
    auth(
      createMockReq({
        path: '/api/personas',
        headers: { authorization: `Bearer ${expiredToken}` }
      }),
      resExpired,
      vi.fn()
    );
    expect(resExpired.statusCode).toBe(401);

    // Missing secret in config -> 401 even with a signed token
    const noSecretAuth = createAuthMiddleware(parseSecurityConfig({ AUTH_MODE: 'login' }));
    const resNoSecret = createMockRes();
    noSecretAuth(
      createMockReq({
        path: '/api/personas',
        headers: { authorization: `Bearer ${promotedToken}` }
      }),
      resNoSecret,
      vi.fn()
    );
    expect(resNoSecret.statusCode).toBe(401);
  });
});

describe('requireAdminRole', () => {
  test('bypasses RBAC check when rbacEnforced is false', () => {
    const guard = requireAdminRole(parseSecurityConfig({ AUTH_MODE: 'none' }));
    const next = vi.fn();
    guard(
      createMockReq({
        chopoUser: {
          userId: 'mkt_1',
          email: 'mkt@chopo.com.mx',
          role: 'marketing',
          authMode: 'none',
          authenticated: true
        }
      }),
      createMockRes(),
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for marketing or unauthenticated users and allows admin when rbacEnforced is true', () => {
    const guard = requireAdminRole(parseSecurityConfig({ AUTH_MODE: 'iap' }));

    const resMarketing = createMockRes();
    const nextMarketing = vi.fn();
    guard(
      createMockReq({
        chopoUser: {
          userId: 'mkt_1',
          email: 'mkt@chopo.com.mx',
          role: 'marketing',
          authMode: 'iap',
          authenticated: true
        }
      }),
      resMarketing,
      nextMarketing
    );
    expect(nextMarketing).not.toHaveBeenCalled();
    expect(resMarketing.statusCode).toBe(403);
    expect((resMarketing.body as { error: string }).error).toContain('Permisos insuficientes');
    expect((resMarketing.body as { error: string }).error).not.toMatch(/[!¡]/);

    const resUnauth = createMockRes();
    guard(createMockReq(), resUnauth, vi.fn());
    expect(resUnauth.statusCode).toBe(403);

    const nextAdmin = vi.fn();
    guard(
      createMockReq({
        chopoUser: {
          userId: 'adm_1',
          email: 'admin@chopo.com.mx',
          role: 'admin',
          authMode: 'iap',
          authenticated: true
        }
      }),
      createMockRes(),
      nextAdmin
    );
    expect(nextAdmin).toHaveBeenCalledTimes(1);
  });
});

describe('resolveScopedRunDocId & sanitizeUserId', () => {
  test('scopes all 5 per-user features when userScopedRuns is enabled for a real user', () => {
    const cfg = parseSecurityConfig({ AUTH_MODE: 'iap' });
    const user = { userId: 'Ana.Perez@Chopo.com.mx' };

    for (const featureId of Array.from(USER_SCOPED_FEATURES)) {
      const scoped = resolveScopedRunDocId(featureId, user, cfg);
      expect(scoped).toBe(`ana.perez_chopo.com.mx__${featureId}`);
      expect(scoped.length).toBeLessThanOrEqual(120);
    }
  });

  test('keeps shared features, local-demo users, and unscoped mode 100% backward compatible', () => {
    const scopedCfg = parseSecurityConfig({ AUTH_MODE: 'iap' });
    const unscopedCfg = parseSecurityConfig({ AUTH_MODE: 'none' });

    expect(
      resolveScopedRunDocId('company_context', { userId: 'ana_123' }, scopedCfg)
    ).toBe('company_context');

    expect(
      resolveScopedRunDocId('marketing_brief', { userId: 'local-demo' }, scopedCfg)
    ).toBe('marketing_brief');

    expect(
      resolveScopedRunDocId('marketing_brief', { userId: 'ana_123' }, unscopedCfg)
    ).toBe('marketing_brief');
  });

  test('sanitizes unsafe Firestore ID characters and enforces 120-char max length', () => {
    expect(sanitizeUserId('../../admin//__root__')).toBe('admin_root');
    expect(sanitizeUserId('   ')).toBe('user');

    const veryLongUser = { userId: 'a'.repeat(200) };
    const scoped = resolveScopedRunDocId(
      'synthetic_focus_group',
      veryLongUser,
      { userScopedRuns: true }
    );
    expect(scoped.length).toBeLessThanOrEqual(120);
    expect(scoped.endsWith('__synthetic_focus_group')).toBe(true);
    expect(scoped).not.toContain('/');
  });
});
