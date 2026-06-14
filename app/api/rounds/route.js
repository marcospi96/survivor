import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM rounds ORDER BY created_at DESC'
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
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, deadline, matchStartDate, matchEndDate } = await request.json();
    if (!name || !deadline) {
      return NextResponse.json({ error: 'Name and deadline are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO rounds (name, deadline, status, match_start_date, match_end_date)
       VALUES ($1, $2, 'open', $3, $4) RETURNING *`,
      [name.trim(), new Date(deadline), matchStartDate || null, matchEndDate || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
