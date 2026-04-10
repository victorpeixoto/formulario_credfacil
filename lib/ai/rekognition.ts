import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { pdf } from 'pdf-to-img';

const client = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function pdfParaPng(buffer: Buffer): Promise<Uint8Array> {
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

export async function compararRostos(
  sourceUrl: string,
  targetUrl: string
): Promise<{ similarity: number; match: boolean }> {
  const [sourceBytes, targetBytes] = await Promise.all([
    downloadAsBytes(sourceUrl),
    downloadAsBytes(targetUrl),
  ]);

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceBytes },
    TargetImage: { Bytes: targetBytes },
    SimilarityThreshold: 80,
  });

  const response = await client.send(command);

  if (!response.FaceMatches || response.FaceMatches.length === 0) {
    return { similarity: 0, match: false };
  }

  const similarity = response.FaceMatches[0].Similarity ?? 0;
  return { similarity, match: similarity >= 90 };
}
