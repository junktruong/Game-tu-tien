import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authOptions';
import { getMongoClient } from '../../../lib/mongodb';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as {
    displayName: string;
    tagline: string;
  };

  const client = await getMongoClient();
  const db = client.db('tu_tien_fight');
  const accounts = db.collection('accounts');

  const result = await accounts.updateOne(
    { email: session.user.email },
    {
      $set: {
        displayName: payload.displayName,
        tagline: payload.tagline,
        updatedAt: new Date(),
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, result });
}
