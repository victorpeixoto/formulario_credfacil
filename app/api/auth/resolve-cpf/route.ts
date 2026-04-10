import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const { formCode } = await req.json();

  if (!formCode) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const candidato = await db.collection('conversations').findOne({ formCode });

  if (!candidato) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ cpf: candidato.cpf });
}
