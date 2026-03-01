import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Cloudflare Access configuration
const POLICY_AUD = '9fa4269f443d4b3f571876cc29a0f8d8d87fdcf83dbfb825f6e234d69b0d8899';
const TEAM_DOMAIN = 'https://madhuryam.cloudflareaccess.com';
const CERTS_URL = new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`);

// Create a cached JWKS
const JWKS = createRemoteJWKSet(CERTS_URL);

export interface AccessJWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  type: string;
  identity_nonce?: string;
  country?: string;
}

/**
 * Middleware to validate Cloudflare Access JWT tokens
 * Extracts the token from CF-Access-JWT-Assertion header or CF_Authorization cookie
 */
export const validateAccessJWT = createMiddleware<{
  Variables: {
    accessPayload: AccessJWTPayload;
    userEmail: string;
  };
}>(async (c, next) => {
  const token = c.req.header('CF-Access-JWT-Assertion') || getCookie(c, 'CF_Authorization');

  if (!token) {
    return c.json({ error: 'Missing authorization token' }, 403);
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: TEAM_DOMAIN,
      audience: POLICY_AUD,
    });

    // Store the payload in context for use in routes
    c.set('accessPayload', payload as unknown as AccessJWTPayload);
    c.set('userEmail', (payload as unknown as AccessJWTPayload).email);

    await next();
  } catch (error) {
    console.error('JWT validation failed:', error);
    return c.json(
      {
        error: 'Invalid token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      403
    );
  }
});
