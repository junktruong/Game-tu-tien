import { NextResponse } from 'next/server';
import { getGameData } from '../../../lib/gameData';

export async function GET() {
  const data = await getGameData();
  return NextResponse.json(data);
}
