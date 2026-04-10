import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import { gerarPresignedUpload } from '@/lib/r2';
import type { TipoDocumento } from '@/types/documentos';

const TIPOS_VALIDOS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];
const EXTENSOES_VALIDAS = ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov'];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const tipo = searchParams.get('tipo') as TipoDocumento;
  const ext = searchParams.get('ext')?.toLowerCase() ?? '';

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  }

  if (!EXTENSOES_VALIDAS.includes(ext)) {
    return NextResponse.json({ error: 'Extensão de arquivo inválida' }, { status: 400 });
  }

  const { uploadUrl, fileKey, contentType } = await gerarPresignedUpload(payload.formCode, tipo, ext);

  return NextResponse.json({ uploadUrl, fileKey, contentType });
}
