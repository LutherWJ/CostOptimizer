export interface OllamaExtractionResult {
  brand: string | null;
  line: string | null;
  sku: string | null;
}

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private embedModel: string;
  private temperature: number;
  private numPredict: number | null;
  private timeoutMs: number;

  constructor(
    baseUrl: string | null = null,
    model: string = process.env.OLLAMA_MODEL || "llama3"
  ) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (process.env.OLLAMA_URL) {
      this.baseUrl = process.env.OLLAMA_URL;
    } else if (process.env.OLLAMA_HOSTNAME) {
      let host = process.env.OLLAMA_HOSTNAME.trim();
      const port = (process.env.OLLAMA_PORT || "11434").toString().trim();
      
      // If host already has protocol, don't add it
      const protocol = host.includes("://") ? "" : "http://";
      
      // If host already has a port (contains a colon after the initial protocol), don't append another one
      const hostPart = host.split("://").pop() || host;
      const hasPort = hostPart.includes(":");
      
      this.baseUrl = hasPort ? `${protocol}${host}` : `${protocol}${host}:${port}`;
    } else {
      this.baseUrl = "http://localhost:11434";
    }
    this.model = model;
    this.embedModel = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text:latest";

    const t = Number(process.env.OLLAMA_TEMPERATURE ?? "0");
    this.temperature = Number.isFinite(t) ? t : 0;

    const npRaw = process.env.OLLAMA_NUM_PREDICT ?? process.env.OLLAMA_MAX_TOKENS ?? "";
    const np = Number(npRaw);
    this.numPredict = Number.isFinite(np) && np > 0 ? np : null;

    const tm = Number(process.env.OLLAMA_TIMEOUT_MS ?? process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? "60000");
    this.timeoutMs = Number.isFinite(tm) && tm > 0 ? tm : 60000;
  }

  private async postJson(path: string, payload: any): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(`Ollama Error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      const msg = String((error as any)?.message || error);
      if (/aborted|abort|timeout/i.test(msg)) {
        console.error(`Failed to communicate with Ollama (timeout after ${this.timeoutMs}ms)`);
        return null;
      }
      console.error("Failed to communicate with Ollama:", error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async generate(prompt: string, json: boolean = false): Promise<string | null> {
    try {
      const data = await this.postJson("/api/generate", {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: json ? "json" : undefined,
      });
      return data?.response ?? null;
    } catch (error) {
      console.error("Failed to communicate with Ollama:", error);
      return null;
    }
  }

  async chat(messages: OllamaChatMessage[], model: string = this.model): Promise<string | null> {
    try {
      const options: Record<string, any> = { temperature: this.temperature };
      if (this.numPredict != null) options.num_predict = this.numPredict;

      const data = await this.postJson("/api/chat", {
        model,
        messages,
        stream: false,
        options,
      });
      return data?.message?.content ?? null;
    } catch (error) {
      console.error("Failed to communicate with Ollama:", error);
      return null;
    }
  }

  async embed(input: string | string[], model: string = this.embedModel): Promise<number[] | number[][] | null> {
    const inputs = Array.isArray(input) ? input : [input];

    try {
      const data = await this.postJson("/api/embed", {
        model,
        input: inputs,
      });

      const embeddings: number[][] | undefined = data?.embeddings;
      if (!embeddings || !Array.isArray(embeddings)) return null;

      return Array.isArray(input) ? embeddings : embeddings[0] ?? null;
    } catch (error) {
      console.error("Failed to communicate with Ollama:", error);
      return null;
    }
  }

  async extractProductDetails(rawTitle: string): Promise<OllamaExtractionResult | null> {
    const prompt = `You are an expert at identifying computer hardware. Extract the Brand, Product Line, and exact Manufacturer Part Number (MPN/SKU) from the following raw e-commerce title. Output strictly in JSON format with the keys "brand", "line", and "sku". If a value cannot be found, use null.
    
Raw Title: "${rawTitle}"

JSON Output:`;

    const response = await this.generate(prompt, true);
    if (!response) return null;

    try {
      const parsed = JSON.parse(response);
      return {
        brand: parsed.brand || null,
        line: parsed.line || null,
        sku: parsed.sku || null,
      };
    } catch (e) {
      console.error("Failed to parse Ollama JSON response:", e);
      return null;
    }
  }
}
