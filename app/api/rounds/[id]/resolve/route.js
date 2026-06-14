import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Get round
    const roundResult = await query('SELECT * FROM rounds WHERE id = $1', [id]);
    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    const round = roundResult.rows[0];
    if (round.status === 'resolved') {
      return NextResponse.json({ error: 'Round already resolved' }, { status: 400 });
    }

    // Find all picks for this round that are NOT wins
    const losingPicksResult = await query(
      `SELECT p.user_id FROM picks p
       LEFT JOIN results r ON r.round_id = p.round_id AND r.team_id = p.team_id
       WHERE p.round_id = $1
       AND (r.outcome IS NULL OR r.outcome != 'win')`,
      [id]
    );

    const losingUserIds = losingPicksResult.rows.map(r => r.user_id);

    // Also eliminate players who didn't pick at all (among alive players)
    const alivePlayersResult = await query(
      `SELECT u.id FROM users u
       WHERE u.is_alive = true AND u.is_admin = false
       AND u.id NOT IN (SELECT user_id FROM picks WHERE round_id = $1)`,
      [id]
    );

    const nopickUserIds = alivePlayersResult.rows.map(r => r.id);
    const allEliminatedIds = [...new Set([...losingUserIds, ...nopickUserIds])];

    if (allEliminatedIds.length > 0) {
      await query(
        'UPDATE users SET is_alive = false WHERE id = ANY($1)',
        [allEliminatedIds]
      );
    }

    // Mark round as resolved
    await query("UPDATE rounds SET status = 'resolved' WHERE id = $1", [id]);

    return NextResponse.json({
      resolved: true,
      eliminated: allEliminatedIds.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
