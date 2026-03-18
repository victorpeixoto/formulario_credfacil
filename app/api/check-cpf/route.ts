import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAvailableWhatsAppNumber } from '@/lib/whatsapp-rotation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf } = body;

    if (!cpf) {
      return NextResponse.json(
        { erro: 'CPF é obrigatório.' },
        { status: 400 }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { erro: 'CPF inválido.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('credfacil');
    const col = db.collection('conversations');

    const existingUser = await col.findOne({ cpf: cpfLimpo });

    if (existingUser) {
      const whatsapp = await getAvailableWhatsAppNumber(existingUser.contactId);
      return NextResponse.json({
        exists: true,
        contactId: existingUser.contactId,
        whatsappLink: whatsapp?.whatsappLink || null,
      });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (err) {
    console.error('[check-cpf] erro:', err);
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}
