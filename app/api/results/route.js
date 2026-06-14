import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { roundId, teamId, outcome } = await request.json();

    if (!roundId || !teamId || !outcome) {
      return NextResponse.json({ error: 'roundId, teamId, and outcome are required' }, { status: 400 });
    }

    if (!['win', 'draw', 'loss'].includes(outcome)) {
      return NextResponse.json({ error: 'outcome must be win, draw, or loss' }, { status: 400 });
    }

    // Upsert result
    const result = await query(
      `INSERT INTO results (round_id, team_id, outcome)
       VALUES ($1, $2, $3)
       ON CONFLICT (round_id, team_id) DO UPDATE SET outcome = EXCLUDED.outcome
       RETURNING *`,
      [roundId, teamId, outcome]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');

    const whereClause = roundId ? 'WHERE r.round_id = $1' : '';
    const params = roundId ? [roundId] : [];

    const result = await query(
      `SELECT r.*, t.name as team_name, t.flag_emoji
       FROM results r
       JOIN teams t ON t.id = r.team_id
       ${whereClause}
       ORDER BY t.name ASC`,
      params
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
