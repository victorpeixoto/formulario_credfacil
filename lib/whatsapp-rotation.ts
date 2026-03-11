import { sendTelegramAlert } from './telegram-alert';

interface WhatsAppNumber {
  phoneNumberId: string;   // ID do número na API do Facebook (ex: 944185295454611)
  whatsappNumber: string;  // Número real para wa.me (ex: 5511982702103)
}

interface AvailableNumber {
  whatsappNumber: string;
  whatsappLink: string;
}

function getNumbers(): WhatsAppNumber[] {
  const raw = process.env.WHATSAPP_NUMBERS;
  if (!raw) throw new Error('Variável de ambiente ausente: "WHATSAPP_NUMBERS"');

  // Formato: "phoneNumberId1:numero1,phoneNumberId2:numero2"
  return raw.split(',').map((entry) => {
    const [phoneNumberId, whatsappNumber] = entry.trim().split(':');
    if (!phoneNumberId || !whatsappNumber) {
      throw new Error(`Formato inválido em WHATSAPP_NUMBERS: "${entry}". Use "phoneNumberId:numero".`);
    }
    return { phoneNumberId, whatsappNumber };
  });
}

async function isNumberAvailable(phoneNumberId: string): Promise<boolean> {
  const token = process.env.FACEBOOK_GRAPH_TOKEN;
  if (!token) {
    console.warn('[whatsapp-rotation] FACEBOOK_GRAPH_TOKEN não configurado, assumindo número disponível.');
    return true;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=verified_name,quality_rating,status&access_token=${token}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      console.error(`[whatsapp-rotation] Graph API retornou ${res.status} para ${phoneNumberId}`);
      return false;
    }

    const data = await res.json();

    // Se o status não for CONNECTED ou a quality_rating for LOW, considerar indisponível
    if (data.status && data.status !== 'CONNECTED') {
      console.warn(`[whatsapp-rotation] Número ${phoneNumberId} com status: ${data.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[whatsapp-rotation] Erro ao verificar ${phoneNumberId}:`, err);
    return false;
  }
}

/**
 * Retorna o primeiro número disponível (não banido) usando rodízio.
 * Se todos estiverem banidos, envia alerta no Telegram e retorna null.
 */
export async function getAvailableWhatsAppNumber(contactId: string): Promise<AvailableNumber | null> {
  const numbers = getNumbers();

  for (const num of numbers) {
    const available = await isNumberAvailable(num.phoneNumberId);
    if (available) {
      const mensagem = encodeURIComponent(`Olá! Meu código é: ${contactId}`);
      return {
        whatsappNumber: num.whatsappNumber,
        whatsappLink: `https://wa.me/${num.whatsappNumber}?text=${mensagem}`,
      };
    }
    console.warn(`[whatsapp-rotation] Número ${num.whatsappNumber} (${num.phoneNumberId}) indisponível, tentando próximo...`);
  }

  // Todos os números estão banidos — alerta no Telegram
  await sendTelegramAlert(
    `🚨 *ALERTA CREDFÁCIL*\n\nTodos os números WhatsApp estão banidos!\nCliente com contactId: \`${contactId}\` não conseguiu prosseguir.\n\nNúmeros verificados:\n${numbers.map((n) => `- ${n.whatsappNumber} (ID: ${n.phoneNumberId})`).join('\n')}`
  );

  return null;
}
