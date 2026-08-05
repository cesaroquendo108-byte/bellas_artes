export async function getBcvRate(): Promise<number> {
  try {
    // Try Finve API first
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

    // Fallback: Use dolarapi.com (free, public, reliable)
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (response.ok) {
      const data = await response.json();
      // dolarapi returns { promedio: 752.0943 } for the official BCV rate
      if (data?.promedio) return data.promedio;
    }

    return 752.09; // Hardcoded fallback based on latest known rate
  } catch (error) {
    console.error("Error fetching BCV rate:", error);
    return 752.09;
  }
}
