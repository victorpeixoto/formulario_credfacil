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

export async function gerarPresignedUpload(
  formCode: string,
  tipo: TipoDocumento,
  ext: string
): Promise<{ uploadUrl: string; fileKey: string }> {
  const timestamp = Date.now();
  const fileKey = `documentos/${formCode}/${tipo}_${timestamp}.${ext}`;

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: fileKey });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 }); // 10 min

  return { uploadUrl, fileKey };
}

export async function gerarPresignedRead(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileKey });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1h
}

export async function deletarArquivo(fileKey: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
}
