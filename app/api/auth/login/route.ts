import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verificarSenha, gerarJWT } from '@/lib/auth';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(req: NextRequest) {
  const { cpf, senha } = await req.json();

  if (!cpf || !senha) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const candidato = await db.collection('conversations').findOne({ cpf });

  if (!candidato || !candidato.senhaHash) {
    return NextResponse.json({ error: 'CPF ou senha incorretos' }, { status: 401 });
  }

  // Verificar bloqueio por tentativas
  if (candidato.loginBloqueadoAte) {
    const bloqueadoAte = new Date(candidato.loginBloqueadoAte);
    if (bloqueadoAte > new Date()) {
      const minutos = Math.ceil((bloqueadoAte.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Conta bloqueada. Tente novamente em ${minutos} minuto(s).` },
        { status: 429 }
      );
    }
    // Desbloquear se prazo passou
    await db.collection('conversations').updateOne(
      { cpf },
      { $unset: { loginBloqueadoAte: '', loginTentativas: '' } }
    );
  }

  const senhaCorreta = await verificarSenha(senha, candidato.senhaHash);

  if (!senhaCorreta) {
    const tentativas = (candidato.loginTentativas ?? 0) + 1;

    if (tentativas >= MAX_TENTATIVAS) {
      await db.collection('conversations').updateOne(
        { cpf },
        {
          $set: {
            loginTentativas: tentativas,
            loginBloqueadoAte: new Date(Date.now() + BLOQUEIO_MS).toISOString(),
          },
        }
      );
      return NextResponse.json(
        { error: 'Muitas tentativas incorretas. Conta bloqueada por 15 minutos.' },
        { status: 429 }
      );
    }

    await db.collection('conversations').updateOne({ cpf }, { $set: { loginTentativas: tentativas } });
    return NextResponse.json({ error: 'CPF ou senha incorretos' }, { status: 401 });
  }

  // Login bem-sucedido — resetar tentativas
  await db
    .collection('conversations')
    .updateOne({ cpf }, { $unset: { loginBloqueadoAte: '', loginTentativas: '' } });

  const token = gerarJWT(cpf, candidato.formCode ?? candidato.contactId);

  const response = NextResponse.json({ success: true, formCode: candidato.formCode });
  response.cookies.set('cf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
