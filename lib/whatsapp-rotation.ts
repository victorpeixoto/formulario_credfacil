import { sendTelegramAlert } from './telegram-alert';

const IGNORED_INBOX_IDS = [1, 3, 9, 13, 22];

interface ChatwootInbox {
  id: number;
  name: string;
  phone_number: string;
  channel_type: string;
  provider_config?: {
    api_key?: string;
    phone_number_id?: string;
  };
}

interface AvailableNumber {
  whatsappNumber: string;
  whatsappLink: string;
}

async function fetchInboxesFromChatwoot(): Promise<ChatwootInbox[]> {
  const chatwootUrl = process.env.CHATWOOT_API_URL;
  const chatwootToken = process.env.CHATWOOT_API_TOKEN;

  if (!chatwootUrl || !chatwootToken) {
    throw new Error('Variáveis de ambiente ausentes: CHATWOOT_API_URL e/ou CHATWOOT_API_TOKEN');
  }

  const res = await fetch(chatwootUrl, {
    headers: {
      api_access_token: chatwootToken
    },
  });

  if (!res.ok) {
    throw new Error(`[whatsapp-rotation] Chatwoot retornou ${res.status} ao listar inboxes`);
  }

  const data = await res.json();
  const inboxes: ChatwootInbox[] = data.payload || data;

  return inboxes.filter(
    (inbox) =>
      !IGNORED_INBOX_IDS.includes(inbox.id) &&
      inbox.provider_config?.api_key &&
      inbox.provider_config?.phone_number_id
  );
}

async function isNumberAvailable(phoneNumberId: string, apiKey: string): Promise<{ available: boolean; status: string }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=quality_rating,status,display_phone_number&access_token=${apiKey}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'sem body');
      console.error(`[whatsapp-rotation] Graph API retornou ${res.status} para ${phoneNumberId} — ${errorBody}`);
      return { available: false, status: 'ERROR' };
    }

    const data = await res.json();

    if (data.status && data.status !== 'CONNECTED') {
      console.warn(`[whatsapp-rotation] Número ${phoneNumberId} com status: ${data.status}`);
      return { available: false, status: data.status };
    }

    return { available: true, status: data.status || 'CONNECTED' };
  } catch (err) {
    console.error(`[whatsapp-rotation] Erro ao verificar ${phoneNumberId}:`, err);
    return { available: false, status: 'ERROR' };
  }
}

function formatPhoneForWaMe(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Busca inboxes do Chatwoot, verifica status na Graph API com o token de cada inbox,
 * e retorna o primeiro número disponível (CONNECTED).
 */
export async function getAvailableWhatsAppNumber(contactId: string): Promise<AvailableNumber | null> {
  const inboxes = await fetchInboxesFromChatwoot();

  if (inboxes.length === 0) {
    console.error('[whatsapp-rotation] Nenhum inbox válido encontrado no Chatwoot');
    return null;
  }

  const checked: { name: string; phone: string; status: string }[] = [];

  for (const inbox of inboxes) {
    const phoneNumberId = inbox.provider_config!.phone_number_id!;
    const apiKey = inbox.provider_config!.api_key!;

    const { available, status } = await isNumberAvailable(phoneNumberId, apiKey);
    checked.push({ name: inbox.name, phone: inbox.phone_number, status });

    if (available) {
      const waNumber = formatPhoneForWaMe(inbox.phone_number);
      const mensagem = encodeURIComponent(`Olá! Meu código é: ${contactId}`);
      return {
        whatsappNumber: waNumber,
        whatsappLink: `https://wa.me/${waNumber}?text=${mensagem}`,
      };
    }
    console.warn(`[whatsapp-rotation] Inbox "${inbox.name}" (${inbox.phone_number}) indisponível (${status}), tentando próximo...`);
  }

  await sendTelegramAlert(
    `🚨 *ALERTA CREDFÁCIL*\n\nTodos os números WhatsApp estão indisponíveis!\nCliente com contactId: \`${contactId}\` não conseguiu prosseguir.\n\nNúmeros verificados:\n${checked.map((n) => `- ${n.name}: ${n.phone} → ${n.status}`).join('\n')}`
  );

  return null;
}
