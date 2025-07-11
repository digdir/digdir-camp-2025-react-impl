import { useEffect, useRef, useState } from 'react';
import '~/styles/client-page.css';

interface AiAssistantProps {
  context?: any;
}

interface ChatbotResponse {
  answer: string;
  source?: string;
}

class ChatbotService {
    private static readonly BASE_URL = 'http://localhost:8000';

    static async askChatbot(question: string, context?: any): Promise<ChatbotResponse> {
        try {
            console.log('ChatbotService: Sending request to chatbot', {
                url: `${this.BASE_URL}/copilot/`,
                question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
                hasContext: !!context
            });

            const requestBody = {
                question,
                ...(context && { context })
            };

            const response = await fetch(`${this.BASE_URL}/copilot/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ChatbotService: HTTP error', {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('ChatbotService: Successfully parsed response', {
                hasAnswer: !!data.answer,
                answerLength: data.answer?.length || 0,
                hasSource: !!data.source
            });

            return data;
        } catch (error) {
            console.error('ChatbotService: Request failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                url: `${this.BASE_URL}/copilot/`,
                question: question.substring(0, 50) + '...'
            });
            throw error;
        }
    }
}

export default function AiAssistant({ context }: AiAssistantProps) {
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [question, setQuestion] = useState('');

    type Message = {
        sender: 'user' | 'bot';
        text: string;
    };

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const openAiPanel = () => setAiPanelOpen(true);
    const closeAiPanel = () => {
        setAiPanelOpen(false);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        });
    }, [messages, loading]);

    const handleSubmit = async (
        e: React.FormEvent | React.KeyboardEvent
    ) => {
        e.preventDefault();
        if (!question.trim()) return;

        const userMessage = { sender: 'user', text: question };

        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);

        try {
            const result = await ChatbotService.askChatbot(question, context);
            const botMessage = { sender: 'bot', text: result.answer };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { sender: 'bot', text: 'Error: Could not get response from chatbot' }
            ]);
        } finally {
            setLoading(false);
            setQuestion('');
        }
    };

    return (
        <>
            <button
                onClick={() => {
                    if (aiPanelOpen) {
                        closeAiPanel();
                    } else {
                        openAiPanel();
                    }
                }}
                type="button"
                className={`ai-button ${aiPanelOpen ? 'move-left' : ''}`}
                title="Åpne AI-hjelp"
            >
                DesKI
            </button>

            <div className={`ai-panel ${aiPanelOpen ? 'slide-in' : 'slide-out'}`}>
                <div className="ai-panel-header">
                    <h3 className="ai-panel-title">DesKI Assistant</h3>
                    <button
                        onClick={closeAiPanel}
                        className="ai-panel-close"
                        aria-label="Lukk chat"
                    >
                        ✕
                    </button>
                </div>

                <div className="ai-response">
                    {messages.length === 0 && (
                        <p className="text-gray-400">Ask me something...</p>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`chat-message ${msg.sender === 'user' ? 'user' : 'bot'}`}
                        >
                            <p>{msg.text}</p>
                        </div>
                    ))}

                    {loading && (
                        <div className="chat-message bot">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="ai-form">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault(); // Unngå ny linje
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Ask your question..."
                        className="ai-textarea"
                        rows={3}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="ai-submit-button"
                    >
                        {loading ? 'Asking...' : 'Ask'}
                    </button>
                </form>
            </div>
        </>
    );
}