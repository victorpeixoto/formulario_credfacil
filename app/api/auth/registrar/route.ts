import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashSenha, gerarJWT } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { cpf, senha } = await req.json();

  if (!cpf || !senha || senha.length < 6) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();
  const candidato = await db.collection('conversations').findOne({ cpf });

  if (!candidato) {
    return NextResponse.json({ error: 'CPF não encontrado' }, { status: 400 });
  }

  if (candidato.senhaHash) {
    return NextResponse.json({ error: 'Conta já cadastrada' }, { status: 409 });
  }

  const senhaHash = await hashSenha(senha);
  await db.collection('conversations').updateOne(
    { cpf },
    {
      $set: {
        senhaHash,
        statusDocumentos: 'AGUARDANDO_DOCUMENTOS',
      },
    }
  );

  const token = gerarJWT(cpf, candidato.formCode);

  const response = NextResponse.json({ success: true });
  response.cookies.set('cf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
