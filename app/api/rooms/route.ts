import { NextResponse } from 'next/server';
import { addRoom } from '../../../lib/gameData';
import type { RoomProfile } from '../../../types/game';

export async function POST(request: Request) {
  const payload = (await request.json()) as RoomProfile;
  const room = await addRoom(payload);
  return NextResponse.json(room);
}
