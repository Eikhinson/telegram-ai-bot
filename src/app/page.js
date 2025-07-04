'use client';
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      console.log('Sending request to /api/chat');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: currentInput,
          userId: userId
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: data.response,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `❌ Ошибка: ${error.message}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 NeuromaniaGPT Chat</h1>
      <p>User ID: {userId}</p>
      
      <div style={{ 
        border: '1px solid #ccc', 
        height: '400px', 
        overflowY: 'scroll', 
        padding: '10px', 
        marginBottom: '10px',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '10px',
              padding: '8px',
              backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#fff',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}
          >
            <strong>{message.sender === 'user' ? 'Вы' : 'Бот'}:</strong> {message.text}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {message.timestamp}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ padding: '8px', fontStyle: 'italic', color: '#666' }}>
            Бот печатает...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите сообщение..."
          style={{ 
            flex: 1, 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px' 
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
