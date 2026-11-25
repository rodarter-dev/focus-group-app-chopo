import crypto from 'node:crypto';

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export const USER_SCOPED_FEATURES = new Set([
  'audience_generator',
  'synthetic_users',
  'marketing_brief',
  'synthetic_focus_group',
  'qualitative_interview'
]);

const DEFAULT_RATE_LIMIT_MESSAGE =
  'Se superó el límite temporal de solicitudes. Intenta nuevamente en unos segundos.';

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getHeader(req, headerName) {
  const headers = req?.headers;
  if (!headers || typeof headers !== 'object') return '';
  const lower = headerName.toLowerCase();
  let raw = headers[lower];
  if (raw === undefined) {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) {
        raw = v;
        break;
      }
    }
  }
  if (Array.isArray(raw)) {
    return String(raw[0] || '').trim();
  }
  return raw !== undefined && raw !== null ? String(raw).trim() : '';
}

function stripIapPrefix(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const colonIdx = trimmed.indexOf(':');
  return colonIdx >= 0 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
}

export function sanitizeUserId(rawUserId) {
  const cleaned = String(rawUserId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/__+/g, '_');
  return cleaned.slice(0, 64) || 'user';
}

export function parseSecurityConfig(env = process.env) {
  const source = env || {};
  const rawMode = String(source.AUTH_MODE || 'none').trim().toLowerCase();
  let authMode = 'none';
  if (rawMode === 'iap') {
    authMode = 'iap';
  } else if (rawMode === 'login' || rawMode === 'jwt') {
    authMode = 'login';
  }

  const adminEmails = new Set(
    String(source.CHOPO_ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const rawRbac = String(source.RBAC_ENFORCE ?? '').trim().toLowerCase();
  const rbacEnforced =
    rawRbac === 'true' ? true : rawRbac === 'false' ? false : authMode !== 'none';

  const rawScoped = String(source.USER_SCOPED_RUNS ?? '').trim().toLowerCase();
  const userScopedRuns =
    rawScoped === 'true' ? true : rawScoped === 'false' ? false : authMode !== 'none';

  const iapAllowHeaderOnly =
    String(source.IAP_ALLOW_HEADER_ONLY ?? '').trim().toLowerCase() === 'true';

  const sessionSecret = String(source.CHOPO_SESSION_SECRET || '');

  return {
    authMode,
    adminEmails,
    rbacEnforced,
    userScopedRuns,
    iapAllowHeaderOnly,
    sessionSecret,
    genaiRateLimitMax: parsePositiveInt(source.GENAI_RATE_LIMIT_MAX, 60),
    genaiRateLimitWindowMs: parsePositiveInt(source.GENAI_RATE_LIMIT_WINDOW_MS, 60000),
    apiRateLimitMax: parsePositiveInt(source.API_RATE_LIMIT_MAX, 300),
    apiRateLimitWindowMs: parsePositiveInt(source.API_RATE_LIMIT_WINDOW_MS, 60000)
  };
}

export function createSecurityHeadersMiddleware(options = {}) {
  const cspValue =
    typeof options.contentSecurityPolicy === 'string' && options.contentSecurityPolicy.trim()
      ? options.contentSecurityPolicy.trim()
      : DEFAULT_CSP;
  const forceHsts = options.forceHsts === true;

  return function securityHeadersMiddleware(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Content-Security-Policy', cspValue);

    const forwardedProto = getHeader(req, 'x-forwarded-proto')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const shouldSetHsts = Boolean(
      req?.secure ||
        forwardedProto === 'https' ||
        Boolean(process.env.K_SERVICE) ||
        forceHsts
    );
    if (shouldSetHsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  };
}

export function createRateLimiter({
  windowMs = 60000,
  maxRequests = 300,
  keyPrefix = 'api',
  message = DEFAULT_RATE_LIMIT_MESSAGE,
  maxKeys = 10000
} = {}) {
  const effectiveWindowMs = parsePositiveInt(windowMs, 60000);
  const effectiveMaxRequests = parsePositiveInt(maxRequests, 300);
  const effectiveMaxKeys = parsePositiveInt(maxKeys, 10000);
  const safePrefix = String(keyPrefix || 'api').trim() || 'api';
  const errorMessage = String(message || DEFAULT_RATE_LIMIT_MESSAGE);

  const buckets = new Map();

  function evictExpired(now) {
    for (const [key, entry] of buckets.entries()) {
      if (now >= entry.resetAt) {
        buckets.delete(key);
      }
    }
  }

  const cleanupIntervalMs = Math.min(Math.max(effectiveWindowMs, 1000), 60000);
  const cleanupTimer = setInterval(() => {
    evictExpired(Date.now());
  }, cleanupIntervalMs);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  function resolveClientKey(req) {
    const chopoUserId = req?.chopoUser?.userId;
    if (chopoUserId && chopoUserId !== 'local-demo') {
      return `${safePrefix}:${chopoUserId}`;
    }
    const forwardedFor = getHeader(req, 'x-forwarded-for')
      .split(',')[0]
      .trim();
    const clientIp =
      forwardedFor || req?.ip || req?.socket?.remoteAddress || 'unknown';
    return `${safePrefix}:${clientIp}`;
  }

  function rateLimiterMiddleware(req, res, next) {
    const now = Date.now();
    const clientKey = resolveClientKey(req);
    let entry = buckets.get(clientKey);

    if (!entry || now >= entry.resetAt) {
      if (!entry && buckets.size >= effectiveMaxKeys) {
        evictExpired(now);
        while (buckets.size >= effectiveMaxKeys) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey === undefined) break;
          buckets.delete(oldestKey);
        }
      }
      entry = { count: 0, resetAt: now + effectiveWindowMs };
      buckets.set(clientKey, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, effectiveMaxRequests - entry.count);
    const resetEpochSeconds = Math.ceil(entry.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', String(effectiveMaxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

    if (entry.count > effectiveMaxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: errorMessage,
        retryAfterSeconds
      });
    }

    return next();
  }

  rateLimiterMiddleware.reset = () => {
    buckets.clear();
  };

  rateLimiterMiddleware.destroy = () => {
    clearInterval(cleanupTimer);
    buckets.clear();
  };

  return rateLimiterMiddleware;
}

export function signSessionToken(payload, secret, ttlSeconds = 28800) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Session signing secret is required.');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const parsedTtl = Number(ttlSeconds);
  const effectiveTtl = Number.isFinite(parsedTtl) ? Math.floor(parsedTtl) : 28800;

  const header = { alg: 'HS256', typ: 'JWT' };
  const claims = {
    ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    iat: nowSec,
    exp: nowSec + effectiveTtl
  };

  const headerB64 = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureB64 = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signatureB64}`;
}

export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret || typeof secret !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const expectedSigB64 = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
  const actualBuf = Buffer.from(signatureB64, 'utf8');
  if (
    actualBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (!header || typeof header !== 'object' || header.alg !== 'HS256') {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= nowSec) {
      return null;
    }

    if (
      payload.nbf !== undefined &&
      (typeof payload.nbf !== 'number' || !Number.isFinite(payload.nbf) || payload.nbf > nowSec)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return cookies;
  }

  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    if (!key) continue;
    const rawVal = part.slice(eqIdx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }

  return cookies;
}

export function createAuthMiddleware(config = parseSecurityConfig(process.env)) {
  const effectiveConfig = config || parseSecurityConfig(process.env);

  return function authMiddleware(req, res, next) {
    const rawUrl = req?.originalUrl || `${req?.baseUrl || ''}${req?.path || req?.url || ''}`;
    const fullPath = String(rawUrl || '/').split('?')[0] || '/';
    const method = String(req?.method || 'GET').toUpperCase();

    if (method === 'GET' && fullPath === '/health') {
      return next();
    }

    const isApiRoute = fullPath === '/api' || fullPath.startsWith('/api/');
    if (!isApiRoute) {
      return next();
    }

    if (effectiveConfig.authMode === 'none') {
      req.chopoUser = {
        userId: 'local-demo',
        email: 'marketing@chopo.local',
        role: 'admin',
        authMode: 'none',
        authenticated: true
      };
      return next();
    }

    if (effectiveConfig.authMode === 'iap') {
      const email = stripIapPrefix(getHeader(req, 'x-goog-authenticated-user-email')).toLowerCase();
      const iapUserId = stripIapPrefix(getHeader(req, 'x-goog-authenticated-user-id'));
      const iapAssertion = getHeader(req, 'x-goog-iap-jwt-assertion');

      if (!email || (!effectiveConfig.iapAllowHeaderOnly && !iapAssertion)) {
        return res.status(401).json({
          error: 'Autenticación corporativa requerida para acceder a la plataforma.'
        });
      }

      const role = effectiveConfig.adminEmails.has(email) ? 'admin' : 'marketing';
      const userId = sanitizeUserId(iapUserId || email);

      req.chopoUser = {
        userId,
        email,
        role,
        authMode: 'iap',
        authenticated: true
      };
      return next();
    }

    if (effectiveConfig.authMode === 'login') {
      const authHeader = getHeader(req, 'authorization');
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      const cookies = parseCookies(getHeader(req, 'cookie'));
      const token = bearerMatch ? bearerMatch[1].trim() : cookies.chopo_session || '';

      const claims =
        token && effectiveConfig.sessionSecret
          ? verifySessionToken(token, effectiveConfig.sessionSecret)
          : null;

      if (!claims) {
        return res.status(401).json({
          error: 'Sesión no válida o expirada. Inicia sesión para continuar.'
        });
      }

      const email = String(claims.email || '').trim().toLowerCase();
      const rawUserId = String(claims.userId || claims.sub || email || '').trim();
      if (!rawUserId) {
        return res.status(401).json({
          error: 'Sesión no válida o expirada. Inicia sesión para continuar.'
        });
      }

      const tokenRole = claims.role === 'admin' ? 'admin' : 'marketing';
      const role = email && effectiveConfig.adminEmails.has(email) ? 'admin' : tokenRole;

      req.chopoUser = {
        userId: sanitizeUserId(rawUserId),
        email,
        role,
        authMode: 'login',
        authenticated: true
      };
      return next();
    }

    return res.status(401).json({
      error: 'Autenticación corporativa requerida para acceder a la plataforma.'
    });
  };
}

export function requireAdminRole(config = parseSecurityConfig(process.env)) {
  const effectiveConfig = config || parseSecurityConfig(process.env);

  return function adminRoleMiddleware(req, res, next) {
    if (!effectiveConfig.rbacEnforced) {
      return next();
    }
    if (req?.chopoUser?.authenticated && req.chopoUser.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      error:
        'Permisos insuficientes. Esta acción requiere rol de Administrador de Marca o Regulatorio.'
    });
  };
}

export function resolveScopedRunDocId(featureId, chopoUser, config) {
  const safeFeatureId = String(featureId || '').trim();
  const isUserScopedFeature = USER_SCOPED_FEATURES.has(safeFeatureId);

  if (
    config?.userScopedRuns &&
    chopoUser?.userId &&
    chopoUser.userId !== 'local-demo' &&
    isUserScopedFeature
  ) {
    const safeUser = sanitizeUserId(chopoUser.userId);
    const maxUserLen = Math.max(8, 120 - 2 - safeFeatureId.length);
    return `${safeUser.slice(0, maxUserLen)}__${safeFeatureId}`.slice(0, 120);
  }

  return safeFeatureId;
}
