import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { TipoDocumento } from '@/types/documentos';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

export async function gerarPresignedUpload(
  formCode: string,
  tipo: TipoDocumento,
  ext: string
): Promise<{ uploadUrl: string; fileKey: string; contentType: string }> {
  const timestamp = Date.now();
  const fileKey = `documentos/${formCode}/${tipo}_${timestamp}.${ext}`;
  const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: fileKey, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 600,
    unhoistableHeaders: new Set(['content-type']),
  });

  return { uploadUrl, fileKey, contentType };
}

export async function gerarPresignedRead(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileKey });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1h
}

export async function deletarArquivo(fileKey: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
}
