export async function getBcvRate(): Promise<number> {
  try {
    const url = process.env.FINVE_MCP_API_URL;
    const key = process.env.FINVE_MCP_API_KEY;

    if (!url || !key) {
      console.warn("FINVE_MCP_API credentials missing, using default rate.");
      return 45.5; // Fallback rate
    }

    const response = await fetch(`${url}/bcv-rate`, {
      headers: {
        'Authorization': `Bearer ${key}`
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error("Failed to fetch BCV rate:", await response.text());
      return 45.5;
    }

    const data = await response.json();
    return data.rate || 45.5;
  } catch (error) {
    console.error("Error fetching BCV rate:", error);
    return 45.5;
  }
}
