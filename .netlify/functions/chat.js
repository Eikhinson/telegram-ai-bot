// Хранилище контекста пользователей (в памяти)
const userContexts = new Map();

// Максимальное количество сообщений в контексте
const MAX_CONTEXT_MESSAGES = 10;

// Функция для получения контекста пользователя
function getUserContext(userId) {
  if (!userContexts.has(userId)) {
    userContexts.set(userId, []);
  }
  return userContexts.get(userId);
}

// Функция для добавления сообщения в контекст
function addToContext(userId, role, content) {
  const context = getUserContext(userId);
  context.push({ role, content });
  
  // Ограничиваем размер контекста
  if (context.length > MAX_CONTEXT_MESSAGES) {
    context.splice(0, context.length - MAX_CONTEXT_MESSAGES);
  }
}

// Функция для очистки контекста
function clearUserContext(userId) {
  userContexts.delete(userId);
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters?.userId;
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID required' })
        };
      }
      
      // Возвращаем контекст пользователя
      const userContext = getUserContext(userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          messages: userContext.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : msg.content.text || 'Изображение'
          }))
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const { message, userId, image } = JSON.parse(event.body);
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID required' })
        };
      }
      
      let responseText = '';
      let userMessage = message || 'Изображение';
      
      // Добавляем сообщение пользователя в контекст
      if (image) {
        // Если есть изображение, создаем специальный формат сообщения
        addToContext(userId, 'user', {
          type: 'image',
          text: userMessage,
          image_url: { url: image }
        });
      } else {
        addToContext(userId, 'user', userMessage);
      }
      
      // Обработка изображений
      if (image) {
        try {
          const userContext = getUserContext(userId);
          const messages = [
            {
              role: "system",
              content: "Ты AI-ассистент, который может анализировать изображения. Отвечай на русском языке, будь дружелюбным и подробным."
            },
            ...userContext.slice(-5).map(msg => {
              if (typeof msg.content === 'object' && msg.content.type === 'image') {
                return {
                  role: msg.role,
                  content: [
                    { type: "text", text: msg.content.text || "Что на этом изображении?" },
                    { type: "image_url", image_url: { url: msg.content.image_url.url } }
                  ]
                };
              }
              return { role: msg.role, content: msg.content };
            })
          ];

          const claudeResponse = await fetch('https://api.a4f.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "provider-3/claude-3.5-haiku",
              messages: messages,
              max_tokens: 1500,
              temperature: 0.7
            })
          });
          
          const claudeResult = await claudeResponse.json();
          
          if (claudeResult.choices?.[0]?.message?.content) {
            responseText = `🖼️ **Анализ изображения:**\n\n${claudeResult.choices[0].message.content}`;
          } else {
            responseText = '❌ Ошибка анализа изображения';
          }
        } catch (error) {
          responseText = `❌ Ошибка анализа изображения: ${error.message}`;
        }
      }
      // Обработка команд с текстом
      else if (message) {
        if (message.toLowerCase().includes('привет')) {
          responseText = '👋 Привет! Как дела? Я помню наш разговор!';
        } else if (message.toLowerCase().startsWith('нарисуй')) {
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
            } else {
              responseText = '❌ Ошибка генерации изображения';
            }
          } catch (error) {
            responseText = `❌ Ошибка FLUX: ${error.message}`;
          }
        } else if (message.toLowerCase().startsWith('код')) {
          const task = message.slice(3).trim();
          
          try {
            const userContext = getUserContext(userId);
            const messages = [
              {
                role: "system",
                content: "Ты опытный программист. Отвечай кратко и по делу. Код оформляй в markdown. Учитывай контекст предыдущих сообщений."
              },
              ...userContext.slice(-5).filter(msg => typeof msg.content === 'string').map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: "user",
                content: task
              }
            ];

            const deepseekResponse = await fetch('https://api.a4f.co/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: "deepseek-v3",
                messages: messages,
                max_tokens: 2000,
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
        } else {
          // Обычный ответ через Claude с контекстом
          try {
            const userContext = getUserContext(userId);
            const messages = [
              {
                role: "system",
                content: "Ты дружелюбный AI-ассистент. Отвечай кратко, но информативно на русском языке. Учитывай контекст предыдущих сообщений для более персонализированного общения."
              },
              ...userContext.slice(-5).filter(msg => typeof msg.content === 'string').map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: "user",
                content: message
              }
            ];

            const claudeResponse = await fetch('https://api.a4f.co/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.A4F_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: "provider-3/claude-3.5-haiku",
                messages: messages,
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
      }
      
      // Добавляем ответ бота в контекст
      addToContext(userId, 'assistant', responseText);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          response: responseText,
          type: image ? 'image_analysis' : 'text'
        })
      };
    }

    if (event.httpMethod === 'DELETE') {
      const { userId } = JSON.parse(event.body || '{}');
      
      if (userId) {
        clearUserContext(userId);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Context cleared' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
