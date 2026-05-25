import { NextResponse } from 'next/server';

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'GEMINI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'NEXT_PUBLIC_BASE_URL',
] as const;

export const dynamic = 'force-dynamic';

export function GET() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      service: 'formulario-credfacil',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      missingEnv: missing,
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
