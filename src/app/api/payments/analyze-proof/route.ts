import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Este endpoint fue retirado. Usa la acción segura submitPayment.",
      code: "ENDPOINT_RETIRED",
    },
    { status: 410 },
  );
}
