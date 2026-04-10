import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { getAvailableWhatsAppNumber } from '@/lib/whatsapp-rotation';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const candidato = await db.collection('conversations').findOne({ formCode: payload.formCode });

  if (!candidato) {
    return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
  }

  if (candidato.whatsappLink) {
    return NextResponse.json({ whatsappLink: candidato.whatsappLink });
  }

  const availableNumber = await getAvailableWhatsAppNumber(candidato.contactId || payload.formCode);
  if (!availableNumber) {
    return NextResponse.json(
      { error: 'Nenhum número disponível no momento. Tente novamente em breve.' },
      { status: 503 }
    );
  }

  await db.collection('conversations').updateOne(
    { formCode: payload.formCode },
    { $set: { whatsappLink: availableNumber.whatsappLink, updatedAt: new Date().toISOString() } }
  );

  return NextResponse.json({ whatsappLink: availableNumber.whatsappLink });
}
