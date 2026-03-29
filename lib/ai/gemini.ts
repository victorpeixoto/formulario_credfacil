import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = 'gemini-2.0-flash';
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 2;

async function downloadAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar arquivo: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  return { data, mimeType };
}

function extrairJSON(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/({[\s\S]*})/);
  if (!jsonMatch) throw new Error('Resposta do Gemini não contém JSON válido');
  return JSON.parse(jsonMatch[1]);
}

async function chamarComRetry(
  fn: () => Promise<Record<string, unknown>>,
  tentativa = 0
): Promise<Record<string, unknown>> {
  try {
    return await fn();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    if (is429 && tentativa < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return chamarComRetry(fn, tentativa + 1);
    }
    throw err;
  }
}

export async function analisarImagem(
  imageUrl: string,
  prompt: string
): Promise<Record<string, unknown>> {
  return chamarComRetry(async () => {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const { data, mimeType } = await downloadAsBase64(imageUrl);
    const result = await model.generateContent([
      prompt,
      { inlineData: { data, mimeType } },
    ]);
    const text = result.response.text();
    return extrairJSON(text);
  });
}

export async function analisarVideo(
  videoUrl: string,
  prompt: string
): Promise<Record<string, unknown>> {
  return chamarComRetry(async () => {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const { data, mimeType } = await downloadAsBase64(videoUrl);
    const result = await model.generateContent([
      prompt,
      { inlineData: { data, mimeType: mimeType || 'video/mp4' } },
    ]);
    const text = result.response.text();
    return extrairJSON(text);
  });
}
