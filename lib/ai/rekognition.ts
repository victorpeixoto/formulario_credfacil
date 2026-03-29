import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

const client = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function downloadAsBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.status}`);
  const buffer = await res.arrayBuffer();
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
