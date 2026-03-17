import crypto from 'crypto';

const META_API_URL = 'https://graph.facebook.com/v21.0';

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  clientUserAgent?: string;
  clientIpAddress?: string;
  fbc?: string;
  fbp?: string;
}

interface CAPIEvent {
  eventName: string;
  eventTime?: number;
  userData: UserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  actionSource: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'sms' | 'physical_store' | 'system_generated' | 'other';
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function buildUserData(userData: UserData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Hashed fields (string or list<string>)
  if (userData.email) {
    result.em = [sha256(userData.email)];
  }
  if (userData.phone) {
    result.ph = [sha256(userData.phone.replace(/\D/g, ''))];
  }
  if (userData.firstName) {
    result.fn = [sha256(userData.firstName)];
  }
  if (userData.lastName) {
    result.ln = [sha256(userData.lastName)];
  }
  if (userData.city) {
    result.ct = [sha256(userData.city)];
  }
  if (userData.country) {
    result.country = [sha256(userData.country)];
  }

  // Non-hashed fields
  if (userData.clientUserAgent) {
    result.client_user_agent = userData.clientUserAgent;
  }
  if (userData.clientIpAddress) {
    result.client_ip_address = userData.clientIpAddress;
  }
  if (userData.fbc) {
    result.fbc = userData.fbc;
  }
  if (userData.fbp) {
    result.fbp = userData.fbp;
  }

  return result;
}

export async function sendMetaCAPIEvent(event: CAPIEvent): Promise<boolean> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;

  if (!accessToken || !pixelId) {
    console.error('[CAPI] Missing META_ACCESS_TOKEN or META_PIXEL_ID');
    return false;
  }

  const eventTime = event.eventTime || Math.floor(Date.now() / 1000);
  const eventId = `${event.eventName}_${eventTime}_${Math.random().toString(36).substring(7)}`;

  const eventData: Record<string, unknown> = {
    event_name: event.eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: event.actionSource || 'website',
    user_data: buildUserData(event.userData),
  };

  if (event.eventSourceUrl) {
    eventData.event_source_url = event.eventSourceUrl;
  }

  if (event.customData && Object.keys(event.customData).length > 0) {
    eventData.custom_data = event.customData;
  }

  const payload = { data: [eventData] };

  try {
    const response = await fetch(
      `${META_API_URL}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (result.error) {
      console.error('[CAPI] Error:', result.error.message);
      return false;
    }

    console.log('[CAPI] Event sent successfully:', event.eventName);
    return true;
  } catch (error) {
    console.error('[CAPI] Network error:', error);
    return false;
  }
}
