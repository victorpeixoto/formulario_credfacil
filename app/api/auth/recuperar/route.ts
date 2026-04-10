import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { gerarResetToken } from '@/lib/auth';
import { enviarEmailRecuperacao } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { cpf } = await req.json();

  if (!cpf) {
    return NextResponse.json({ error: 'CPF obrigatório' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const candidato = await db.collection('conversations').findOne({ cpf });

  // Retornar sucesso mesmo se não encontrado (segurança — evita enumeração)
  if (!candidato || !candidato.email) {
    return NextResponse.json({ success: true });
  }

  const { token, expira } = gerarResetToken();

  await db.collection('conversations').updateOne(
    { cpf },
    {
      $set: {
        resetToken: token,
        resetTokenExpira: expira.toISOString(),
      },
    }
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;
  const nome = candidato.nomeCompleto?.split(' ')[0] || 'Candidato';

  await enviarEmailRecuperacao(candidato.email, nome, resetUrl);

  return NextResponse.json({ success: true });
}
