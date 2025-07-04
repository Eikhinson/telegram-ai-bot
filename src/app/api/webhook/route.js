import { NextResponse } from 'next/server';

// Простое хранилище чатов в памяти (в продакшене используйте базу данных)
const chats = new Map();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }
  
  const messages = chats.get(userId) || [];
  return NextResponse.json({ messages });
}

export async function POST(request) {
  try {
    const { message, userId } = await request.json();
    
    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and userId required' }, { status: 400 });
    }
    
    // Получаем историю чата
    const chatHistory = chats.get(userId) || [];
    
    // Добавляем сообщение пользователя
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    chatHistory.push(userMessage);
    
    let responseText = '';
    let responseType = 'text';
    
    // Обработка команд
    if (message.toLowerCase().startsWith('нарисуй')) {
      const prompt = message.slice(7).trim();
      
      try {
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
          responseText = `🎨 Изображение создано!\n\n![${prompt}](${fluxResult.data[0].url})`;
          responseType = 'image';
        } else {
          responseText = '❌ Ошибка генерации изображения';
        }
      } catch (error) {
        responseText = `❌ Ошибка FLUX: ${error.message}`;
      }
    }
    else if (message.toLowerCase().startsWith('код')) {
      const task = message.slice(3).trim();
      
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
          responseText = `💻 **DeepSeek V3:**\n\n${deepseekResult.choices[0].message.content}`;
        } else {
          responseText = '❌ Ошибка получения ответа от DeepSeek';
        }
      } catch (error) {
        responseText = `❌ Ошибка DeepSeek: ${error.message}`;
      }
    }
    else {
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
                content: message
              }
            ],
            max_tokens: 1000,
            temperature: 0.8
          })
        });
        
        const claudeResult = await claudeResponse.json();
        
        if (claudeResult.choices?.[0]?.message?.content) {
          responseText = `🧠 **Claude 3.5 Haiku:**\n\n${claudeResult.choices[0].message.content}`;
        } else {
          responseText = '❌ Ошибка получения ответа от Claude';
        }
      } catch (error) {
        responseText = `❌ Ошибка Claude: ${error.message}`;
      }
    }
    
    // Добавляем ответ бота
    const botMessage = {
      id: Date.now() + 1,
      text: responseText,
      sender: 'bot',
      timestamp: new Date().toISOString(),
      type: responseType
    };
    chatHistory.push(botMessage);
    
    // Сохраняем обновленную историю
    chats.set(userId, chatHistory);
    
    return NextResponse.json({ 
      success: true, 
      response: responseText,
      type: responseType
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (userId) {
    chats.delete(userId);
  }
  
  return NextResponse.json({ success: true });
}
