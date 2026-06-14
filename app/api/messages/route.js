import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');

    let result;

    if (session.user.isAdmin) {
      // Admin sees all messages
      const whereClause = recipientId ? 'WHERE m.recipient_id = $1' : '';
      const params = recipientId ? [recipientId] : [];
      result = await query(
        `SELECT m.*, sender.username as sender_name, recipient.username as recipient_name
         FROM messages m
         JOIN users sender ON sender.id = m.sender_id
         JOIN users recipient ON recipient.id = m.recipient_id
         ${whereClause}
         ORDER BY m.created_at ASC`,
        params
      );
    } else if (!session.user.isAlive) {
      // Eliminated player sees all messages sent to them
      result = await query(
        `SELECT m.*, sender.username as sender_name
         FROM messages m
         JOIN users sender ON sender.id = m.sender_id
         WHERE m.recipient_id = $1
         ORDER BY m.created_at ASC`,
        [session.user.id]
      );
    } else {
      // Alive player sees only messages they sent to a specific recipient
      if (!recipientId) {
        return NextResponse.json({ error: 'recipientId required' }, { status: 400 });
      }
      result = await query(
        `SELECT m.*, sender.username as sender_name
         FROM messages m
         JOIN users sender ON sender.id = m.sender_id
         WHERE m.sender_id = $1 AND m.recipient_id = $2
         ORDER BY m.created_at ASC`,
        [session.user.id, recipientId]
      );
    }

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

    if (!session.user.isAlive && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Only alive players can send banter' }, { status: 403 });
    }

    const { recipientId, content } = await request.json();

    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ error: 'recipientId and content are required' }, { status: 400 });
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    // Verify recipient is eliminated
    const recipientResult = await query(
      'SELECT id, is_alive, is_admin FROM users WHERE id = $1',
      [recipientId]
    );
    const recipient = recipientResult.rows[0];
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    if (recipient.is_alive) {
      return NextResponse.json({ error: 'Can only send banter to eliminated players' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO messages (sender_id, recipient_id, content) VALUES ($1, $2, $3) RETURNING *',
      [session.user.id, recipientId, content.trim()]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
