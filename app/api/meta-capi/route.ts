import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCAPIEvent } from '@/lib/meta-capi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, userData, customData, eventSourceUrl } = body;

    if (!eventName || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields: eventName and userData' },
        { status: 400 }
      );
    }

    const success = await sendMetaCAPIEvent({
      eventName,
      userData,
      customData,
      eventSourceUrl,
      actionSource: 'website',
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send event to Meta CAPI' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Meta CAPI Route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
