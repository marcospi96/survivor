import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Admin always sees all picks
    if (session.user.isAdmin) {
      const result = await query(
        `SELECT p.id, p.user_id, p.round_id, p.team_id, p.created_at,
                u.username, t.name as team_name, t.flag_emoji
         FROM picks p
         JOIN users u ON u.id = p.user_id
         JOIN teams t ON t.id = p.team_id
         WHERE p.round_id = $1
         ORDER BY p.created_at ASC`,
        [id]
      );
      return NextResponse.json(result.rows);
    }

    // Player: only see others' picks if they have their own pick or round is closed/resolved
    const myPickResult = await query(
      'SELECT id FROM picks WHERE round_id = $1 AND user_id = $2',
      [id, session.user.id]
    );
    const hasPicked = myPickResult.rows.length > 0;

    const roundResult = await query('SELECT status FROM rounds WHERE id = $1', [id]);
    const roundStatus = roundResult.rows[0]?.status;

    const canSeeAll = hasPicked || roundStatus === 'closed' || roundStatus === 'resolved';

    if (canSeeAll) {
      const result = await query(
        `SELECT p.id, p.user_id, p.round_id, p.team_id, p.created_at,
                u.username, t.name as team_name, t.flag_emoji
         FROM picks p
         JOIN users u ON u.id = p.user_id
         JOIN teams t ON t.id = p.team_id
         WHERE p.round_id = $1
         ORDER BY p.created_at ASC`,
        [id]
      );
      return NextResponse.json(result.rows);
    }

    // Only return own pick
    const result = await query(
      `SELECT p.id, p.user_id, p.round_id, p.team_id, p.created_at,
              u.username, t.name as team_name, t.flag_emoji
       FROM picks p
       JOIN users u ON u.id = p.user_id
       JOIN teams t ON t.id = p.team_id
       WHERE p.round_id = $1 AND p.user_id = $2`,
      [id, session.user.id]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
