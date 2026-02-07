import NextAuth from 'next-auth';
import { getAuthOptions } from '../../../../lib/authOptions';

export async function GET(request: Request, context: any) {
  const handler = NextAuth(getAuthOptions());
  return handler(request, context);
}

export async function POST(request: Request, context: any) {
  const handler = NextAuth(getAuthOptions());
  return handler(request, context);
}
