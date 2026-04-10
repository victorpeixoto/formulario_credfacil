import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashSenha } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { token, novaSenha } = await req.json();

  if (!token || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const candidato = await db.collection('conversations').findOne({ resetToken: token });

  if (!candidato) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }

  if (new Date(candidato.resetTokenExpira) < new Date()) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
  }

  const senhaHash = await hashSenha(novaSenha);

  await db.collection('conversations').updateOne(
    { resetToken: token },
    {
      $set: { senhaHash },
      $unset: { resetToken: '', resetTokenExpira: '' },
    }
  );

  return NextResponse.json({ success: true });
}
