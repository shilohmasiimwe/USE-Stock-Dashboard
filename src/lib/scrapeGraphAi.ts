type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

type ScrapeGraphExtractResponse = {
  id?: string;
  request_id?: string;
  status?: 'success' | 'queued' | 'processing' | 'completed' | 'failed' | string;
  json?: unknown;
  result?: unknown;
  data?: {
    json_data?: unknown;
  };
  error?: string | null;
};

type ScrapeGraphExtractInput<T> = {
  url: string;
  prompt: string;
  outputSchema?: JsonValue;
  fetchConfig?: JsonValue;
  validate?: (value: unknown) => value is T;
};

export type ScrapeGraphExtraction<T> = {
  ok: true;
  data: T;
  requestId?: string;
  sourceUrl: string;
} | {
  ok: false;
  error: string;
  requestId?: string;
  sourceUrl: string;
};

export async function extractWithScrapeGraph<T>({
  url,
  prompt,
  outputSchema,
  fetchConfig,
  validate,
}: ScrapeGraphExtractInput<T>): Promise<ScrapeGraphExtraction<T>> {
  const apiKey = process.env.SGAI_API_KEY;
  if (!apiKey) {
    return { ok: false, sourceUrl: url, error: 'SGAI_API_KEY is not configured' };
  }

  const baseUrl = process.env.SGAI_API_BASE_URL ?? 'https://v2-api.scrapegraphai.com/api';
  const timeoutMs = Number(process.env.SGAI_TIMEOUT_MS ?? 20_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SGAI-APIKEY': apiKey,
      },
      body: JSON.stringify({
        url,
        prompt,
        ...(outputSchema ? { schema: outputSchema } : {}),
        ...(fetchConfig ? { fetchConfig } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, sourceUrl: url, error: `ScrapeGraphAI request failed: ${response.status}` };
    }

    const payload = await response.json() as ScrapeGraphExtractResponse;
    const requestId = payload.id ?? payload.request_id;
    if (payload.status === 'failed') {
      return { ok: false, sourceUrl: url, requestId, error: payload.error ?? 'ScrapeGraphAI extraction failed' };
    }

    const extracted = payload.json ?? payload.data?.json_data ?? payload.result;
    if (extracted === undefined || extracted === null) {
      return { ok: false, sourceUrl: url, requestId, error: `ScrapeGraphAI returned status ${payload.status ?? 'unknown'} without a result` };
    }

    if (validate && !validate(extracted)) {
      return { ok: false, sourceUrl: url, requestId, error: 'ScrapeGraphAI result did not match the expected shape' };
    }

    return {
      ok: true,
      data: extracted as T,
      requestId,
      sourceUrl: url,
    };
  } catch (error) {
    return {
      ok: false,
      sourceUrl: url,
      error: error instanceof Error ? error.message : 'Unknown ScrapeGraphAI error',
    };
  } finally {
    clearTimeout(timeout);
  }
}
