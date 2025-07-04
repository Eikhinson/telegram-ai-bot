import { NextResponse } from 'next/server';

// Простое хранилище в памяти
const chats = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const messages = chats.get(userId) || [];
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, userId } = body;
    
    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and userId required' }, { status: 400 });
    }
    
    // Простой ответ для тестирования
    let responseText = '';
    
    if (message.toLowerCase().includes('привет')) {
      responseText = '👋 Привет! Как дела?';
    } else if (message.toLowerCase().startsWith('нарисуй')) {
      responseText = '🎨 Функция рисования временно недоступна. Скоро исправим!';
    } else if (message.toLowerCase().startsWith('код')) {
      responseText = '💻 Функция программирования временно недоступна. Скоро исправим!';
    } else {
      responseText = `Получил ваше сообщение: "${message}". AI временно недоступен, но скоро заработает!`;
    }
    
    return NextResponse.json({ 
      success: true, 
      response: responseText,
      type: 'text'
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      chats.delete(userId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
