import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'GYMFIT', timestamp: new Date().toISOString() });
}
