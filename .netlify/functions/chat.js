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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ messages: [] })
      };
    }

    if (event.httpMethod === 'POST') {
      const { message, userId } = JSON.parse(event.body);
      
      if (!message || !userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Message and userId required' })
        };
      }
      
      let responseText = '';
      
      if (message.toLowerCase().includes('привет')) {
        responseText = '👋 Привет! Как дела?';
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
      } else {
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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          response: responseText,
          type: 'text'
        })
      };
    }

    if (event.httpMethod === 'DELETE') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
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
