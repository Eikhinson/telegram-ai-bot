import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('Webhook received');
  
  try {
    const body = await request.json();
    console.log('Body:', JSON.stringify(body));
    
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || 'Привет!';
      
      console.log('Sending message to chat:', chatId);
      
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Получено: ${text}`
        })
      });
      
      const result = await response.json();
      console.log('Telegram API response:', result);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint is working' });
}
