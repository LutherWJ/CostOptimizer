export interface OllamaExtractionResult {
  brand: string | null;
  line: string | null;
  sku: string | null;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string | null = null,
    model: string = process.env.OLLAMA_MODEL || "llama3"
  ) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (process.env.OLLAMA_URL) {
      this.baseUrl = process.env.OLLAMA_URL;
    } else if (process.env.OLLAMA_HOSTNAME) {
      const port = process.env.OLLAMA_PORT || "11434";
      this.baseUrl = `http://${process.env.OLLAMA_HOSTNAME}:${port}`;
    } else {
      this.baseUrl = "http://localhost:11434";
    }
    this.model = model;
  }

  async extractProductDetails(rawTitle: string): Promise<OllamaExtractionResult | null> {
    const prompt = `You are an expert at identifying computer hardware. Extract the Brand, Product Line, and exact Manufacturer Part Number (MPN/SKU) from the following raw e-commerce title. Output strictly in JSON format with the keys "brand", "line", and "sku". If a value cannot be found, use null.
    
Raw Title: "${rawTitle}"

JSON Output:`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          format: "json",
        }),
      });

      if (!response.ok) {
        console.error(`Ollama Error: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.response);
      
      return {
        brand: parsed.brand || null,
        line: parsed.line || null,
        sku: parsed.sku || null,
      };
    } catch (error) {
      console.error("Failed to communicate with Ollama:", error);
      return null;
    }
  }
}
