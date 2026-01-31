import { createMiddleware } from 'hono/factory';
import type { AccessJWTPayload } from './auth';

export interface UserContext {
  userId: number;
  email: string;
  displayName: string | null;
}

// Dev user ID for local development
const DEV_USER_CF_ID = 'dev-user-local';
const DEV_USER_EMAIL = 'dev@localhost';

/**
 * Middleware to require and set up user context
 * - For local dev: creates/uses a dev user automatically
 * - For production: finds/creates user based on Cloudflare Access JWT
 * - Updates last_seen_at on each request
 */
export const requireUser = createMiddleware<{
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    accessPayload?: AccessJWTPayload;
    userEmail?: string;
    user: UserContext;
  };
}>(async (c, next) => {
  const host = c.req.header('host') || '';
  const origin = c.req.header('origin') || '';
  const isLocalDev =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  let cfUserId: string;
  let email: string;

  if (isLocalDev) {
    // For local development, use dev user
    cfUserId = DEV_USER_CF_ID;
    email = DEV_USER_EMAIL;
  } else {
    // For production, get from Cloudflare Access JWT (set by validateAccessJWT middleware)
    const accessPayload = c.get('accessPayload');
    if (!accessPayload) {
      return c.json({ error: 'Unauthorized: No access token' }, 401);
    }
    cfUserId = accessPayload.sub;
    email = accessPayload.email;
  }

  try {
    // Find or create user
    let user = await c.env.DB.prepare(
      'SELECT id, cf_user_id, email, display_name FROM users WHERE cf_user_id = ?'
    )
      .bind(cfUserId)
      .first<{ id: number; cf_user_id: string; email: string; display_name: string | null }>();

    if (!user) {
      // Create new user
      const result = await c.env.DB.prepare(
        `INSERT INTO users (cf_user_id, email, display_name, last_seen_at)
         VALUES (?, ?, ?, datetime('now'))`
      )
        .bind(cfUserId, email, null)
        .run();

      user = {
        id: result.meta.last_row_id as number,
        cf_user_id: cfUserId,
        email: email,
        display_name: null,
      };
    } else {
      // Update last_seen_at (fire and forget for performance)
      c.executionCtx.waitUntil(
        c.env.DB.prepare("UPDATE users SET last_seen_at = datetime('now'), email = ? WHERE id = ?")
          .bind(email, user.id)
          .run()
      );
    }

    // Set user context
    c.set('user', {
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
    });

    await next();
  } catch (error) {
    console.error('User middleware error:', error);
    return c.json(
      {
        error: 'Failed to authenticate user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
