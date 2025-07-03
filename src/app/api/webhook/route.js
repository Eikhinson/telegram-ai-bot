import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || 'Привет!';
      
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Эхо: ${text}`
        })
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook working!' });
}
