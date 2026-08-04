import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBcvRate } from '@/lib/bcvRate';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const packages = {
  curioso: { priceUsd: 2, credits: 400 },
  creador: { priceUsd: 5, credits: 1200 },
  agencia: { priceUsd: 15, credits: 5000 },
};

export async function POST(req: Request) {
  try {
    const { filePath, packageId, userId } = await req.json();

    if (!filePath || !packageId || !userId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const pkg = packages[packageId as keyof typeof packages];
    if (!pkg) {
      return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Obtener la URL pública de la imagen
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    // Llamar a OpenRouter (Gemini Flash)
    const prompt = `Extrae los siguientes datos de este comprobante de pago móvil de Venezuela.
    Responde ÚNICAMENTE con un JSON válido que contenga estas propiedades exactas:
    - is_valid: booleano (true si parece un comprobante de pago móvil válido, false si no)
    - amount: número (monto en Bolívares sin formato de miles, ej 120.50)
    - reference_number: string (últimos 4 a 6 dígitos de la referencia, si los hay)
    - date: string (fecha del pago)`;

    let aiResult;
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3.5-flash',
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: publicUrl } }
              ]
            }
          ]
        })
      });

      const orData = await orRes.json();
      const content = orData.choices?.[0]?.message?.content;
      aiResult = JSON.parse(content || '{}');
    } catch (e) {
      console.error("Error with OpenRouter API:", e);
      // Fail-open: if AI fails, flag for manual review
      aiResult = { is_valid: false, fail_open: true };
    }

    const bcvRate = await getBcvRate();
    const expectedBs = pkg.priceUsd * bcvRate * 1.2;
    // Permitir un margen de error de 1 Bs por redondeo
    const amountMatches = aiResult.amount && Math.abs(aiResult.amount - expectedBs) <= 1.0;

    let status = 'pending'; // para revisión manual
    if (aiResult.is_valid && amountMatches) {
      status = 'approved';
    } else if (aiResult.fail_open) {
      status = 'manual_review';
    } else if (aiResult.is_valid && !amountMatches) {
      status = 'amount_mismatch';
    }

    // Usar Supabase RPC para manejar el bloqueo y agregar créditos si fue aprobado
    const { data: tx, error: txError } = await supabase.rpc('process_payment_and_add_credits', {
      p_user_id: userId,
      p_package_id: packageId,
      p_amount_bs: aiResult.amount || 0,
      p_reference: aiResult.reference_number || 'N/A',
      p_status: status,
      p_credits_to_add: status === 'approved' ? pkg.credits : 0,
      p_receipt_url: publicUrl
    });

    if (txError) {
      console.error("DB Error processing payment:", txError);
      return NextResponse.json({ error: 'Error procesando pago' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      details: aiResult,
      expectedBs
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
