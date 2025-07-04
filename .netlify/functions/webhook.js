import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (body.message) {
      const message = body.message;
      const chatId = message.chat.id;
      const text = message.text;
      const fromUser = message.from;
      
      // Игнорируем сообщения от ботов
      if (fromUser.is_bot) {
        return NextResponse.json({ success: true });
      }
      
      let responseText = '';
      
      if (text === '/start') {
        responseText = `🤖 Привет! Я NeuromaniaGPT бот с реальным AI!

🧠 Просто пиши мне - отвечу через Claude 3.5 Haiku
🎨 "нарисуй [описание]" - создам изображение через FLUX
💻 "код [задача]" - помогу с программированием через DeepSeek

Попробуй написать: "Расскажи интересный факт"`;
      }
      else if (text?.toLowerCase().startsWith('нарисуй')) {
        const prompt = text.slice(7).trim();
        
        try {
          // Отправляем сообщение о начале генерации
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🎨 Генерирую изображение: "${prompt}"\n⏳ Подождите...`
            })
          });
          
          // Вызов FLUX через A4F API
          const fluxResponse = await fetch('https://api.a4f.co/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "flux-1.1-pro",
              prompt: prompt,
              n: 1,
              size: "1024x1024"
            })
          });
          
          const fluxResult = await fluxResponse.json();
          
          if (fluxResult.data?.[0]?.url) {
            // Отправляем изображение
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                photo: fluxResult.data[0].url,
                caption: `🎨 "${prompt}"`
              })
            });
          } else {
            throw new Error('Не удалось получить изображение');
          }
          
          return NextResponse.json({ success: true });
        } catch (error) {
          responseText = `❌ Ошибка генерации изображения: ${error.message}`;
        }
      }
      else if (text?.toLowerCase().startsWith('код')) {
        const task = text.slice(3).trim();
        
        try {
          const deepseekResponse = await fetch('https://api.a4f.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "deepseek-v3",
              messages: [
                {
                  role: "system",
                  content: "Ты опытный программист. Отвечай кратко и по делу. Код оформляй в markdown."
                },
                {
                  role: "user",
                  content: task
                }
              ],
              max_tokens: 1500,
              temperature: 0.7
            })
          });
          
          const deepseekResult = await deepseekResponse.json();
          
          if (deepseekResult.choices?.[0]?.message?.content) {
            responseText = `💻 DeepSeek V3:\n\n${deepseekResult.choices[0].message.content}`;
          } else {
            throw new Error('Пустой ответ от DeepSeek');
          }
        } catch (error) {
          responseText = `❌ Ошибка DeepSeek: ${error.message}`;
        }
      }
      else if (text) {
        // Обычный ответ через Claude
        try {
          const claudeResponse = await fetch('https://api.a4f.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "provider-3/claude-3.5-haiku",
              messages: [
                {
                  role: "system",
                  content: "Ты дружелюбный AI-ассистент. Отвечай кратко, но информативно на русском языке."
                },
                {
                  role: "user",
                  content: text
                }
              ],
              max_tokens: 1000,
              temperature: 0.8
            })
          });
          
          const claudeResult = await claudeResponse.json();
          
          if (claudeResult.choices?.[0]?.message?.content) {
            responseText = `🧠 Claude 3.5 Haiku:\n\n${claudeResult.choices[0].message.content}`;
          } else {
            throw new Error('Пустой ответ от Claude');
          }
        } catch (error) {
          responseText = `❌ Ошибка Claude: ${error.message}\n\nПроверьте API ключ и модель.`;
        }
      }
      
      // Отправляем ответ
      if (responseText) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            parse_mode: 'Markdown'
          })
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
