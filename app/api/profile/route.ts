import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authOptions';
import { getMongoClient } from '../../../lib/mongodb';

type ProfilePayload = {
  displayName?: string;
  tagline?: string;
  characterId?: string;
  skinId?: string;
  arenaId?: string;
};

const DB_NAME = 'tu_tien_fight';
const COLLECTION = 'profiles';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  const profiles = db.collection(COLLECTION);

  const profile = await profiles.findOne({ email: session.user.email });
  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  const { _id, ...data } = profile;
  return NextResponse.json({ profile: data });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as ProfilePayload;

  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  const profiles = db.collection(COLLECTION);

  await profiles.updateOne(
    { email: session.user.email },
    {
      $set: {
        displayName: payload.displayName ?? '',
        tagline: payload.tagline ?? '',
        characterId: payload.characterId ?? '',
        skinId: payload.skinId ?? '',
        arenaId: payload.arenaId ?? '',
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as ProfilePayload;

  const updates: Record<string, string> = {};
  if (payload.displayName !== undefined) {
    updates.displayName = payload.displayName;
  }
  if (payload.tagline !== undefined) {
    updates.tagline = payload.tagline;
  }
  if (payload.characterId !== undefined) {
    updates.characterId = payload.characterId;
  }
  if (payload.skinId !== undefined) {
    updates.skinId = payload.skinId;
  }
  if (payload.arenaId !== undefined) {
    updates.arenaId = payload.arenaId;
  }

  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  const profiles = db.collection(COLLECTION);

  await profiles.updateOne(
    { email: session.user.email },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
