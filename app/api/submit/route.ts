import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import clientPromise from '@/lib/mongodb';
import { getAvailableWhatsAppNumber } from '@/lib/whatsapp-rotation';
import type { PayloadSubmit } from '@/types/formulario';

export async function POST(req: NextRequest) {
  try {
    const body: PayloadSubmit = await req.json();

    const { trabalho, referencias, nomeCompleto, cpf, email, enderecoCompleto, aceitouCondicoes } = body;

    // Validação server-side
    if (!trabalho?.apps?.length) return NextResponse.json({ erro: 'Apps obrigatório.' }, { status: 400 });
    if (!trabalho.tempoAtuacao) return NextResponse.json({ erro: 'Tempo de atuação obrigatório.' }, { status: 400 });
    if (!trabalho.ultimaCorridaData) return NextResponse.json({ erro: 'Última corrida obrigatória.' }, { status: 400 });
    if (!trabalho.faturamentoBruto) return NextResponse.json({ erro: 'Faturamento obrigatório.' }, { status: 400 });
    if (!referencias || referencias.length < 4) return NextResponse.json({ erro: 'Mínimo 4 referências.' }, { status: 400 });
    if (!nomeCompleto?.trim()) return NextResponse.json({ erro: 'Nome obrigatório.' }, { status: 400 });
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) return NextResponse.json({ erro: 'CPF inválido.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
    if (!enderecoCompleto?.trim()) return NextResponse.json({ erro: 'Endereço obrigatório.' }, { status: 400 });
    if (!aceitouCondicoes) return NextResponse.json({ erro: 'Aceite obrigatório.' }, { status: 400 });

    const formCode = uuidv4();
    const now = new Date().toISOString();
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Salva no MongoDB ANTES de verificar WhatsApp (garante registro mesmo se todos números estiverem indisponíveis)
    const client = await clientPromise;
    const db = client.db('credfacil');
    const col = db.collection('conversations');

    // Verifica se já existe registro para este CPF (ex: usuário que já conversou pelo WhatsApp)
    const existing = await col.findOne({ cpf: cpfLimpo });

    await col.updateOne(
      { cpf: cpfLimpo },
      {
        $set: {
          // Se já existe registro (ex: veio do WhatsApp direto), preserva o contactId do Chatwoot
          // Se é registro novo, usa o formCode como contactId temporário
          ...(existing ? {} : { contactId: formCode }),
          formCode,
          status: 'ETAPA_5',
          isCompleted: false,
          isAbandoned: false,
          updatedAt: now,
          nomeCompleto,
          cpf: cpfLimpo,
          email,
          enderecoCompleto,
          trabalho,
          aceitouCondicoes,
          referencias,
          documentosSolicitados: false,
          transferidoParaHumano: false,
          qualificacao_naoAtende: false,
          qualificacao_motivo: null,
          historico: [],
          dadosConfirmados: false,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    // Rodízio de números: verifica disponibilidade via Graph API
    const availableNumber = await getAvailableWhatsAppNumber(formCode);
    if (!availableNumber) {
      return NextResponse.json(
        { erro: 'Nenhum número disponível no momento. Nossa equipe já foi notificada. Tente novamente em breve.' },
        { status: 503 }
      );
    }
    const { whatsappLink } = availableNumber;

    return NextResponse.json({ contactId: formCode, whatsappLink });
  } catch (err) {
    console.error('[submit] erro:', err);
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}
