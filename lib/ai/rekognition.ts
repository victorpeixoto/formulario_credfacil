import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

const client = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function pdfParaPng(buffer: Buffer): Promise<Uint8Array> {
  // Import dinâmico — evita quebrar o módulo no Vercel serverless
  // onde o pdf-to-img (binário nativo) pode não estar disponível
  const { pdf } = await import('pdf-to-img');
  const pages = await pdf(buffer, { scale: 2 });
  for await (const page of pages) {
    return new Uint8Array(page);
  }
  throw new Error('PDF não contém páginas');
}

async function downloadAsBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim();

  if (contentType === 'application/pdf') {
    return pdfParaPng(buffer);
  }

  const formatosAceitos = ['image/jpeg', 'image/png'];
  if (contentType && !formatosAceitos.includes(contentType)) {
    throw new Error(
      `Formato não suportado pelo Rekognition: ${contentType}. Aceitos: JPEG, PNG ou PDF.`
    );
  }

  return new Uint8Array(buffer);
}

export interface ResultadoComparacao {
  similarity: number;
  match: boolean;
  rostoNaoDetectado?: boolean;
  motivo?: string;
}

export async function compararRostos(
  sourceUrl: string,
  targetUrl: string
): Promise<ResultadoComparacao> {
  const [sourceBytes, targetBytes] = await Promise.all([
    downloadAsBytes(sourceUrl),
    downloadAsBytes(targetUrl),
  ]);

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceBytes },
    TargetImage: { Bytes: targetBytes },
    SimilarityThreshold: 80,
  });

  try {
    const response = await client.send(command);

    if (!response.FaceMatches || response.FaceMatches.length === 0) {
      const semRostoFonte = !response.SourceImageFace;
      return {
        similarity: 0,
        match: false,
        rostoNaoDetectado: semRostoFonte,
        motivo: semRostoFonte
          ? 'Não detectamos rosto na CNH. Refaça a foto com boa iluminação.'
          : undefined,
      };
    }

    const similarity = response.FaceMatches[0].Similarity ?? 0;
    return { similarity, match: similarity >= 90 };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === 'InvalidParameterException') {
      return {
        similarity: 0,
        match: false,
        rostoNaoDetectado: true,
        motivo: 'Não detectamos rosto na CNH ou na selfie. Refaça com boa iluminação e enquadramento centralizado.',
      };
    }
    throw err;
  }
}
