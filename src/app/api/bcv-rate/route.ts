import { NextResponse } from 'next/server';
import { getBcvRate } from '@/lib/bcvRate';

export async function GET() {
  const rate = await getBcvRate();
  return NextResponse.json({ rate });
}
