import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, deadline, matchStartDate, matchEndDate } = body;

    if (!status && !deadline && matchStartDate === undefined && matchEndDate === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (status && !['open', 'closed', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build dynamic SET clause
    const sets = [];
    const vals = [];
    if (status)                          { vals.push(status);         sets.push(`status = $${vals.length}`); }
    if (deadline)                        { vals.push(deadline);        sets.push(`deadline = $${vals.length}`); }
    if (matchStartDate !== undefined)    { vals.push(matchStartDate || null); sets.push(`match_start_date = $${vals.length}`); }
    if (matchEndDate !== undefined)      { vals.push(matchEndDate || null);   sets.push(`match_end_date = $${vals.length}`); }
    vals.push(id);

    const result = await query(
      `UPDATE rounds SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
