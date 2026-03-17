import crypto from 'crypto';

const META_API_URL = 'https://graph.facebook.com/v25.0';

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}

interface CAPIEvent {
  eventName: string;
  eventTime?: number;
  userData: UserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  actionSource: 'WEBSITE' | 'APP' | 'EMAIL' | 'PHONE_CALL' | 'CHAT' | 'SMS' | 'PHYSICAL_STORE' | 'SYSTEM' | 'OTHER';
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function hashUserData(userData: UserData): Record<string, string> {
  const hashed: Record<string, string> = {};

  if (userData.email) {
    hashed.em = sha256(userData.email);
  }
  if (userData.phone) {
    hashed.ph = sha256(userData.phone.replace(/\D/g, ''));
  }
  if (userData.firstName) {
    hashed.fn = sha256(userData.firstName);
  }
  if (userData.lastName) {
    hashed.ln = sha256(userData.lastName);
  }
  if (userData.city) {
    hashed.ct = sha256(userData.city);
  }
  if (userData.country) {
    hashed.co = sha256(userData.country);
  }

  return hashed;
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

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: event.actionSource || 'WEBSITE',
        event_source_url: event.eventSourceUrl,
        user_data: hashUserData(event.userData),
        custom_data: event.customData || {},
      },
    ],
  };

  try {
    const response = await fetch(
      `${META_API_URL}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
