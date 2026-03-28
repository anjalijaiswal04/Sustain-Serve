import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi! I'm ShareFood AI. How can I help you today?", isBot: true },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput("");

    // Simulate bot response based on context
    setTimeout(() => {
      let botResponse = "I'm still learning! Please contact support for more details.";
      const lowerInput = userMessage.toLowerCase();
      
      if (lowerInput.includes('donate') || lowerInput.includes('how to')) {
        botResponse = "To donate, please register as a Donor. Once logged in, you can post a food listing with quantity, expiry time, and pickup details!";
      } else if (lowerInput.includes('ngo') || lowerInput.includes('accept')) {
        botResponse = "NGOs can view nearby available food donations on their dashboard and accept them. Once accepted, a delivery partner can be assigned.";
      } else if (lowerInput.includes('delivery') || lowerInput.includes('track')) {
        botResponse = "Delivery partners can pick up accepted donations. Both NGOs and Donors can track the delivery status in real-time.";
      } else if (lowerInput.includes('password') || lowerInput.includes('login')) {
        botResponse = "Please make sure your password is at least 6 characters long and your phone number is exactly 10 digits.";
      } else if (lowerInput.includes('hi') || lowerInput.includes('hello')) {
        botResponse = "Hello! How can I assist you in reducing food waste today?";
      }

      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 1000);
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
              <div key={i} className={`p-2 rounded-lg max-w-[85%] text-sm ${msg.isBot ? 'bg-emerald-100 text-emerald-900 self-start rounded-tl-none' : 'bg-blue-500 text-white self-end rounded-tr-none'}`}>
                {msg.text}
              </div>
            ))}
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
            <button onClick={handleSend} className="p-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
