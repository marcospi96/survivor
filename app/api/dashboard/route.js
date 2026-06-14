import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current open round (or most recent)
    const roundResult = await query(
      `SELECT * FROM rounds
       WHERE status = 'open'
       ORDER BY created_at DESC
       LIMIT 1`
    );
    const currentRound = roundResult.rows[0] || null;

    let myPick = null;
    let roundPicks = [];
    let canSeeAll = false;

    if (currentRound) {
      const myPickResult = await query(
        `SELECT p.*, t.name as team_name, t.flag_emoji
         FROM picks p
         JOIN teams t ON t.id = p.team_id
         WHERE p.round_id = $1 AND p.user_id = $2`,
        [currentRound.id, session.user.id]
      );
      myPick = myPickResult.rows[0] || null;

      const hasPicked = !!myPick;
      const roundClosed = currentRound.status !== 'open' || new Date(currentRound.deadline) < new Date();
      canSeeAll = session.user.isAdmin || hasPicked || roundClosed;

      if (canSeeAll) {
        const picksResult = await query(
          `SELECT p.user_id, p.team_id, u.username, t.name as team_name, t.flag_emoji
           FROM picks p
           JOIN users u ON u.id = p.user_id
           JOIN teams t ON t.id = p.team_id
           WHERE p.round_id = $1`,
          [currentRound.id]
        );
        roundPicks = picksResult.rows;
      }
    }

    // Get all players with their status and elimination round info
    const playersResult = await query(
      `SELECT
         u.id, u.username, u.is_alive,
         -- Last pick of eliminated player
         elim_pick.round_name as eliminated_round,
         elim_pick.team_name as eliminated_team,
         elim_pick.flag_emoji as eliminated_flag
       FROM users u
       LEFT JOIN LATERAL (
         SELECT r.name as round_name, t.name as team_name, t.flag_emoji
         FROM picks p
         JOIN rounds r ON r.id = p.round_id
         JOIN teams t ON t.id = p.team_id
         WHERE p.user_id = u.id AND r.status = 'resolved'
         ORDER BY r.created_at DESC
         LIMIT 1
       ) elim_pick ON NOT u.is_alive
       WHERE u.is_admin = false
       ORDER BY u.is_alive DESC, u.username ASC`
    );

    // My pick history
    const historyResult = await query(
      `SELECT p.round_id, r.name as round_name, r.status as round_status,
              t.name as team_name, t.flag_emoji, res.outcome
       FROM picks p
       JOIN rounds r ON r.id = p.round_id
       JOIN teams t ON t.id = p.team_id
       LEFT JOIN results res ON res.round_id = p.round_id AND res.team_id = p.team_id
       WHERE p.user_id = $1
       ORDER BY r.created_at ASC`,
      [session.user.id]
    );

    return NextResponse.json({
      currentRound,
      myPick,
      roundPicks,
      canSeeAll,
      players: playersResult.rows,
      pickHistory: historyResult.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
