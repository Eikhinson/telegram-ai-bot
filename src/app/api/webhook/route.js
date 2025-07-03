import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      const fromId = body.message.from.id;
      
      console.log(`Message from user ${fromId} in chat ${chatId}: ${text}`);
      
      // Проверяем, что это не сообщение от самого бота
      if (body.message.from.is_bot) {
        console.log('Ignoring message from bot');
        return NextResponse.json({ success: true });
      }
      
      let responseText = '';
      
      // Обработка команд
      if (text === '/start') {
        responseText = `🤖 Привет! Я NeuromaniaGPT бот!

🎨 Отправь "нарисуй кота" - создам изображение
💬 Просто напиши что-нибудь - отвечу через AI
💻 Напиши "код python hello" - помогу с программированием`;
      }
      else if (text && text.toLowerCase().includes('нарисуй')) {
        responseText = `🎨 Генерирую изображение...
        
⏳ Функция FLUX скоро будет подключена!`;
      }
      else if (text && text.toLowerCase().includes('код')) {
        responseText = `💻 Анализирую код...
        
🤔 DeepSeek скоро будет подключен!`;
      }
      else if (text) {
        responseText = `🧠 Получил ваше сообщение: "${text}"

Отвечаю из чата ID: ${chatId}
От пользователя ID: ${fromId}

Claude AI скоро будет подключен! 🚀`;
      }
      else {
        responseText = '🤖 Отправьте текстовое сообщение!';
      }
      
      console.log(`Sending response to chat ${chatId}: ${responseText}`);
      
      // Отправляем ответ точно в тот же чат
      const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const payload = {
        chat_id: chatId,
        text: responseText,
        reply_to_message_id: body.message.message_id
      };
      
      console.log('Sending to Telegram:', JSON.stringify(payload, null, 2));
      
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await telegramResponse.json();
      console.log('Telegram API response:', JSON.stringify(result, null, 2));
      
      if (!result.ok) {
        console.error('Telegram API error:', result);
        return NextResponse.json({ error: 'Telegram API error', details: result }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook is working!',
    bot: '@NeuromaniaGPT_bot',
    timestamp: new Date().toISOString()
  });
}
