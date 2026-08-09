import "server-only";

import { z } from "zod";

const ExtractionSchema = z.object({
  amount: z.number().positive().nullable(),
  reference: z.string().trim().min(4).max(80).nullable(),
  date: z.string().date().nullable(),
});

export type ReceiptExtraction = z.infer<typeof ExtractionSchema>;

export async function extractReceiptData(signedUrl: string): Promise<ReceiptExtraction> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY para analizar comprobantes.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.PAYMENT_VISION_MODEL ?? "google/gemini-2.5-flash",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Extrae exclusivamente monto total en bolívares, referencia y fecha del pago móvil. Devuelve JSON: amount (number|null), reference (string|null), date (YYYY-MM-DD|null). No decidas si el pago es válido.",
          },
          { type: "image_url", image_url: { url: signedUrl } },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`El análisis del comprobante falló (${response.status}).`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("La IA no devolvió una extracción utilizable.");
  return ExtractionSchema.parse(JSON.parse(content));
}
