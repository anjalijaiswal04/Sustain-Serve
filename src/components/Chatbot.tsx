import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { db } from '../utils/db';
import { getAIChatResponse } from '../utils/aiFeatures';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi! I'm ShareFood AI. How can I help you today? Ask me about donating, tracking, NGO acceptance, or live platform stats!", isBot: true },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput("");
    setIsTyping(true);

    // Gather live context from localStorage
    setTimeout(() => {
      const donations = db.getDonations();
      const users = db.getUsers();
      const context = {
        pendingDonations: donations.filter(d => d.status === 'Pending').length,
        totalDonations: donations.length,
        deliveredCount: donations.filter(d => d.status === 'Delivered').length,
        registeredUsers: users.length,
      };

      const botResponse = getAIChatResponse(userMessage, context);
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition ${isOpen ? 'hidden' : 'block'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200 z-[100] overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-emerald-600 text-white">
            <h3 className="font-semibold">ShareFood Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-emerald-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 h-64 overflow-y-auto bg-gray-50 flex flex-col space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg max-w-[85%] text-sm whitespace-pre-line ${msg.isBot ? 'bg-emerald-100 text-emerald-900 self-start rounded-tl-none' : 'bg-blue-500 text-white self-end rounded-tr-none'}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="p-2 rounded-lg max-w-[85%] text-sm bg-emerald-100 text-emerald-900 self-start rounded-tl-none">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={isTyping} className="p-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
