import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: UserContext;
};

const user = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/user/me - Get current user info
user.get('/me', async (c) => {
  const currentUser = c.get('user');

  try {
    // Get full user details from database
    const userRecord = await c.env.DB.prepare(
      'SELECT id, email, display_name, created_at, last_seen_at FROM users WHERE id = ?'
    )
      .bind(currentUser.userId)
      .first<{
        id: number;
        email: string;
        display_name: string | null;
        created_at: string;
        last_seen_at: string | null;
      }>();

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      createdAt: userRecord.created_at,
      lastSeenAt: userRecord.last_seen_at,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to get user' }, 500);
  }
});

// PATCH /api/user/me - Update current user's display name
user.patch('/me', async (c) => {
  const currentUser = c.get('user');

  try {
    const body = await c.req.json<{ displayName?: string }>();

    if (body.displayName === undefined) {
      return c.json({ error: 'displayName is required' }, 400);
    }

    // Allow null/empty to clear display name, otherwise trim it
    const displayName = body.displayName?.trim() || null;

    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?')
      .bind(displayName, currentUser.userId)
      .run();

    // Get updated user
    const userRecord = await c.env.DB.prepare(
      'SELECT id, email, display_name, created_at, last_seen_at FROM users WHERE id = ?'
    )
      .bind(currentUser.userId)
      .first<{
        id: number;
        email: string;
        display_name: string | null;
        created_at: string;
        last_seen_at: string | null;
      }>();

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      createdAt: userRecord.created_at,
      lastSeenAt: userRecord.last_seen_at,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to update user' }, 500);
  }
});

export default user;
