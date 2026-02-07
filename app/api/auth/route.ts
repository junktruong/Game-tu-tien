import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '../../../lib/authOptions';

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  return NextResponse.json({ session });
}
