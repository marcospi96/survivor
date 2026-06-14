import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT p.id, p.round_id, p.team_id, p.created_at,
              r.name as round_name, r.status as round_status,
              t.name as team_name, t.flag_emoji,
              res.outcome
       FROM picks p
       JOIN rounds r ON r.id = p.round_id
       JOIN teams t ON t.id = p.team_id
       LEFT JOIN results res ON res.round_id = p.round_id AND res.team_id = p.team_id
       WHERE p.user_id = $1
       ORDER BY r.created_at ASC`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAlive) {
      return NextResponse.json({ error: 'You have been eliminated' }, { status: 403 });
    }

    const { roundId, teamId } = await request.json();
    if (!roundId || !teamId) {
      return NextResponse.json({ error: 'Round and team are required' }, { status: 400 });
    }

    // Check round is open
    const roundResult = await query('SELECT * FROM rounds WHERE id = $1', [roundId]);
    const round = roundResult.rows[0];
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    if (round.status !== 'open') {
      return NextResponse.json({ error: 'Round is not open for picks' }, { status: 400 });
    }
    if (new Date(round.deadline) < new Date()) {
      return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 });
    }

    // Check already picked this round
    const existingPick = await query(
      'SELECT id FROM picks WHERE round_id = $1 AND user_id = $2',
      [roundId, session.user.id]
    );
    if (existingPick.rows.length > 0) {
      return NextResponse.json({ error: 'You already picked for this round' }, { status: 400 });
    }

    // Check team not already used in previous rounds
    const previousPick = await query(
      `SELECT p.id FROM picks p
       JOIN rounds r ON r.id = p.round_id
       WHERE p.user_id = $1 AND p.team_id = $2 AND r.id != $3`,
      [session.user.id, teamId, roundId]
    );
    if (previousPick.rows.length > 0) {
      return NextResponse.json({ error: 'You already used this team in a previous round' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO picks (user_id, round_id, team_id) VALUES ($1, $2, $3) RETURNING *',
      [session.user.id, roundId, teamId]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
