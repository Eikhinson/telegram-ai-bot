import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received:', JSON.stringify(body, null, 2));
    
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      const userId = body.message.from.id;
      
      // Проверяем, что это не сообщение от самого бота
      if (body.message.from.is_bot) {
        return NextResponse.json({ success: true });
      }
      
      let responseText = '';
      
      // Обработка команд
      if (text === '/start') {
        responseText = `🤖 Привет! Я NeuromaniaGPT бот!
        
🎨 Отправь мне текст - я отвечу через Claude
🖼️ Напиши "нарисуй [описание]" - создам изображение через FLUX
💻 Напиши "код [задача]" - помогу с программированием

Попробуй написать: "Привет, как дела?"`;
      }
      else if (text && text.toLowerCase().startsWith('нарисуй')) {
        const prompt = text.slice(7).trim();
        responseText = `🎨 Генерирую изображение: "${prompt}"
        
⏳ Подождите, это займет несколько секунд...`;
        
        // Здесь будет вызов FLUX API
      }
      else if (text && text.toLowerCase().startsWith('код')) {
        const task = text.slice(3).trim();
        responseText = `💻 Помогу с программированием: "${task}"
        
🤔 Анализирую задачу...`;
        
        // Здесь будет вызов к DeepSeek
      }
      else if (text) {
        // Обычный ответ через Claude
        responseText = `🧠 Claude отвечает:

Привет! Я получил ваше сообщение: "${text}"

Это тестовый ответ. Скоро здесь будет настоящий AI!`;
      }
      else {
        responseText = '🤖 Отправьте текстовое сообщение для общения!';
      }
      
      // Отправляем ответ в тот же чат
      const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML'
        })
      });
      
      const result = await telegramResponse.json();
      console.log('Telegram response:', result);
      
      if (!result.ok) {
        console.error('Telegram API error:', result);
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
