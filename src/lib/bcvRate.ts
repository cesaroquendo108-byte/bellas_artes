export async function getBcvRate(): Promise<number> {
  try {
    const finveUrl = process.env.FINVE_MCP_API_URL;
    const finveKey = process.env.FINVE_MCP_API_KEY;

    if (finveUrl && finveKey) {
      try {
        const finveRes = await fetch(`${finveUrl}/bcv-rate`, {
          headers: { 'Authorization': `Bearer ${finveKey}` },
          next: { revalidate: 3600 }
        });
        if (finveRes.ok) {
          const finveData = await finveRes.json();
          if (finveData?.rate) return finveData.rate;
        }
      } catch {
        // Fall through to alternative
      }
    }

    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 }
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.promedio) return data.promedio;
    }
  } catch (error) {
    console.error("Error fetching BCV rate:", error);
  }

  throw new Error("No fue posible obtener una tasa BCV verificable.");
}

export async function getPaymentRate(): Promise<number> {
  const bcvRate = await getBcvRate();
  return Number((bcvRate * 1.2).toFixed(2));
}
