import { NextResponse } from 'next/server';
import { getBcvRate } from '@/lib/bcvRate';

export async function GET() {
  try {
    const rate = await getBcvRate();
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json(
      { errorCode: "BCV_RATE_UNAVAILABLE", message: "La tasa de pago no está disponible temporalmente." },
      { status: 503 },
    );
  }
}
