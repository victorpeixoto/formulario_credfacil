import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutos

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const formCode = req.nextUrl.searchParams.get('formCode') ?? payload.formCode;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const client = await clientPromise;
      const db = client.db();

      const inicio = Date.now();
      let estadoAnterior: Record<string, string> = {};

      while (Date.now() - inicio < MAX_WAIT_MS) {
        const candidato = await db.collection('conversations').findOne({ formCode });

        if (!candidato) {
          send('erro', { mensagem: 'Candidato não encontrado' });
          controller.close();
          return;
        }

        const docs = candidato.documentos ?? {};
        const statusDocumentos: string = candidato.statusDocumentos ?? 'PROCESSANDO';

        // Enviar eventos para documentos que mudaram de status
        for (const tipo of ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo']) {
          const doc = docs[tipo];
          if (doc && doc.status !== estadoAnterior[tipo]) {
            estadoAnterior[tipo] = doc.status;
            send('documento', {
              tipo,
              status: doc.status,
              resultado: doc.resultado ?? null,
            });
          }
        }

        // Status final — encerrar stream
        if (statusDocumentos !== 'PROCESSANDO') {
          send('concluido', {
            statusFinal: statusDocumentos,
            validacaoIA: candidato.validacaoIA ?? null,
          });
          controller.close();
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      send('erro', { mensagem: 'Timeout — recarregue a página' });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
