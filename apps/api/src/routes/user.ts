import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: UserContext;
};

const user = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Username validation: 3-30 chars, lowercase alphanumeric + underscores
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

// GET /api/user/me - Get current user info
user.get('/me', async (c) => {
  const currentUser = c.get('user');

  try {
    // Get full user details from database
    const userRecord = await c.env.DB.prepare(
      'SELECT id, email, display_name, username, created_at, last_seen_at FROM users WHERE id = ?'
    )
      .bind(currentUser.userId)
      .first<{
        id: number;
        email: string;
        display_name: string | null;
        username: string | null;
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
      username: userRecord.username,
      createdAt: userRecord.created_at,
      lastSeenAt: userRecord.last_seen_at,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to get user' }, 500);
  }
});

// PATCH /api/user/me - Update current user's display name and/or username
user.patch('/me', async (c) => {
  const currentUser = c.get('user');

  try {
    const body = await c.req.json<{ displayName?: string; username?: string }>();

    // At least one field must be provided
    if (body.displayName === undefined && body.username === undefined) {
      return c.json({ error: 'displayName or username is required' }, 400);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    // Handle display name update
    if (body.displayName !== undefined) {
      const displayName = body.displayName?.trim() || null;
      updates.push('display_name = ?');
      values.push(displayName);
    }

    // Handle username update
    if (body.username !== undefined) {
      const username = body.username?.trim().toLowerCase() || null;

      if (username !== null) {
        // Validate username format
        if (!isValidUsername(username)) {
          return c.json(
            {
              error:
                'Username must be 3-30 characters, lowercase letters, numbers, and underscores only',
            },
            400
          );
        }

        // Check if username is already taken by another user
        const existing = await c.env.DB.prepare(
          'SELECT id FROM users WHERE username = ? AND id != ?'
        )
          .bind(username, currentUser.userId)
          .first();

        if (existing) {
          return c.json({ error: 'Username is already taken' }, 409);
        }
      }

      updates.push('username = ?');
      values.push(username);
    }

    values.push(currentUser.userId.toString());

    await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Get updated user
    const userRecord = await c.env.DB.prepare(
      'SELECT id, email, display_name, username, created_at, last_seen_at FROM users WHERE id = ?'
    )
      .bind(currentUser.userId)
      .first<{
        id: number;
        email: string;
        display_name: string | null;
        username: string | null;
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
      username: userRecord.username,
      createdAt: userRecord.created_at,
      lastSeenAt: userRecord.last_seen_at,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to update user' }, 500);
  }
});

// GET /api/user/check-username/:username - Check if username is available
user.get('/check-username/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();

  try {
    // Validate format
    if (!isValidUsername(username)) {
      return c.json({
        available: false,
        reason: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only',
      });
    }

    // Check if taken
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();

    return c.json({
      available: !existing,
      reason: existing ? 'Username is already taken' : null,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to check username' },
      500
    );
  }
});

// GET /api/user/search - Search users by username
user.get('/search', async (c) => {
  const query = c.req.query('q')?.trim().toLowerCase();

  if (!query || query.length < 2) {
    return c.json({ users: [] });
  }

  try {
    const results = await c.env.DB.prepare(
      `SELECT id, username, display_name
       FROM users
       WHERE username IS NOT NULL AND username LIKE ?
       ORDER BY username
       LIMIT 20`
    )
      .bind(`%${query}%`)
      .all<{
        id: number;
        username: string;
        display_name: string | null;
      }>();

    return c.json({
      users: (results.results ?? []).map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
      })),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to search users' },
      500
    );
  }
});

export default user;
