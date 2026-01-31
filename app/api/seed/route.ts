import { NextResponse } from 'next/server';
import { getGameData } from '../../../lib/gameData';

export async function POST() {
  const data = await getGameData();
  return NextResponse.json({ status: 'seeded', data });
}
