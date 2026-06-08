import { GoogleGenerativeAI } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = 'gemini-2.5-flash';
// Tarefas de extração (não geração criativa): saída determinística reduz variância
// e a chance de o modelo fabricar dados que não estão na imagem/vídeo.
const GENERATION_CONFIG = { temperature: 0 } as const;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 2;

type InlineDataPart = { inlineData: { data: string; mimeType: string } };

export class GeminiQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiQuotaError';
  }
}

export function isQuotaError(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    normalized.includes('credits are depleted');
}

export function isGeminiQuotaError(err: unknown): boolean {
  if (err instanceof GeminiQuotaError) return true;
  if (err instanceof Error && err.name === 'GeminiQuotaError') return true;
  const msg = err instanceof Error ? err.message : String(err);
  return isQuotaError(msg);
}

async function downloadAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar arquivo: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  return { data, mimeType };
}

async function pdfParaInlineData(buffer: Buffer): Promise<InlineDataPart[]> {
  const { pdf } = await import('pdf-to-img');
  const pages = await pdf(buffer, { scale: 2 });
  const imagens: InlineDataPart[] = [];

  for await (const page of pages) {
    imagens.push({
      inlineData: {
        data: Buffer.from(page).toString('base64'),
        mimeType: 'image/png',
      },
    });
  }

  if (imagens.length === 0) throw new Error('PDF não contém páginas');
  return imagens;
}

async function downloadAsInlineData(url: string): Promise<InlineDataPart[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar arquivo: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';

  if (mimeType === 'application/pdf') {
    return pdfParaInlineData(buffer);
  }

  return [{
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  }];
}

function extrairJSON(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/({[\s\S]*})/);
  if (!jsonMatch) throw new Error('Resposta do Gemini não contém JSON válido');
  return JSON.parse(jsonMatch[1]);
}

export async function chamarComRetry(
  fn: () => Promise<Record<string, unknown>>,
  tentativa = 0,
  retryDelayMs = RETRY_DELAY_MS
): Promise<Record<string, unknown>> {
  try {
    return await fn();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isQuotaError(msg)) {
      if (tentativa < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        return chamarComRetry(fn, tentativa + 1, retryDelayMs);
      }
      throw new GeminiQuotaError(msg);
    }
    throw err;
  }
}

export async function analisarImagem(
  imageUrl: string,
  prompt: string
): Promise<Record<string, unknown>> {
  return chamarComRetry(async () => {
    const model = genAI.getGenerativeModel({ model: MODEL, generationConfig: GENERATION_CONFIG });
    const inlineData = await downloadAsInlineData(imageUrl);
    const result = await model.generateContent([
      prompt,
      ...inlineData,
    ]);
    const text = result.response.text();
    return extrairJSON(text);
  });
}

export async function analisarImagemComEspelho(
  imageUrl: string,
  prompt: string
): Promise<Record<string, unknown>> {
  return chamarComRetry(async () => {
    const model = genAI.getGenerativeModel({ model: MODEL, generationConfig: GENERATION_CONFIG });
    const { data, mimeType } = await downloadAsBase64(imageUrl);

    const originalBuffer = Buffer.from(data, 'base64');
    const sharp = (await import('sharp')).default;
    const espelhadaBuffer = await sharp(originalBuffer).flop().toBuffer();
    const espelhadaBase64 = espelhadaBuffer.toString('base64');

    const result = await model.generateContent([
      prompt,
      { inlineData: { data, mimeType } },
      { inlineData: { data: espelhadaBase64, mimeType } },
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
    const model = genAI.getGenerativeModel({ model: MODEL, generationConfig: GENERATION_CONFIG });
    const { data, mimeType } = await downloadAsBase64(videoUrl);
    const result = await model.generateContent([
      prompt,
      { inlineData: { data, mimeType: mimeType || 'video/mp4' } },
    ]);
    const text = result.response.text();
    return extrairJSON(text);
  });
}
