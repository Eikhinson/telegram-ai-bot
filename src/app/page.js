'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Функция для конвертации файла в base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Обработка выбора изображения
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      
      try {
        const base64 = await convertToBase64(file);
        setSelectedImage(base64);
        setImagePreview(URL.createObjectURL(file));
      } catch (error) {
        console.error('Ошибка конвертации изображения:', error);
        alert('Ошибка загрузки изображения');
      }
    }
  };

  // Удаление выбранного изображения
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage = {
      id: Date.now(),
      text: input || (selectedImage ? 'Изображение' : ''),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      image: imagePreview
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput('');
    removeImage();
    setLoading(true);

    try {
      const requestBody = {
        message: currentInput,
        userId: userId
      };

      if (currentImage) {
        requestBody.image = currentImage;
      }

      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: data.response,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          type: data.type
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
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

  const clearChat = async () => {
    try {
      await fetch('/.netlify/functions/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setMessages([]);
    } catch (error) {
      console.error('Ошибка очистки чата:', error);
      setMessages([]);
    }
  };

  // Рендер сообщения с поддержкой markdown изображений
  const renderMessage = (text) => {
    // Простая обработка markdown изображений ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts = text.split(imageRegex);
    
    return parts.map((part, index) => {
      if (index % 3 === 2) { // URL изображения
        return (
          <img 
            key={index} 
            src={part} 
            alt={parts[index - 1] || 'Generated image'} 
            className="max-w-full h-auto rounded-lg mt-2"
            style={{ maxHeight: '300px' }}
          />
        );
      } else if (index % 3 === 1) { // Alt text
        return null;
      } else { // Обычный текст
        return part ? <span key={index}>{part}</span> : null;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🤖 NeuromaniaGPT</h1>
            <p className="text-blue-200">AI Assistant с памятью, FLUX, Claude и DeepSeek</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Ваш ID: {userId}</p>
            <button 
              onClick={clearChat}
              className="text-xs bg-blue-500 hover:bg-blue-400 px-2 py-1 rounded mt-1"
            >
              Очистить чат
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <h2 className="text-xl mb-4">👋 Добро пожаловать!</h2>
              <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
                <h3 className="font-bold mb-2">Что я умею:</h3>
                <ul className="text-left space-y-2">
                  <li>🧠 <strong>Общение с памятью:</strong> Я помню наш разговор</li>
                  <li>🖼️ <strong>Анализ изображений:</strong> Прикрепите фото</li>
                  <li>🎨 <strong>Генерация:</strong> "нарисуй [описание]"</li>
                  <li>💻 <strong>Код:</strong> "код [задача]"</li>
                </ul>
                <p className="mt-4 text-sm text-gray-600">
                  Попробуйте: "Расскажи анекдот" или прикрепите изображение
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                {message.image && (
                  <img 
                    src={message.image} 
                    alt="User uploaded" 
                    className="max-w-full h-auto rounded mb-2"
                    style={{ maxHeight: '200px' }}
                  />
                )}
                <div className="whitespace-pre-wrap">
                  {message.sender === 'bot' ? renderMessage(message.text) : message.text}
                </div>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>AI думает...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="border-t bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Выбранное изображение:</span>
                <button
                  onClick={removeImage}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕ Удалить
                </button>
              </div>
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="mt-2 max-h-32 rounded border"
              />
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="border-t bg-white p-4">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg"
              disabled={loading}
            >
              📎
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение или прикрепите изображение..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
                        }
