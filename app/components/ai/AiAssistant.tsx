import { TrashIcon } from '@navikt/aksel-icons';
import { useEffect, useRef, useState } from 'react';
import '~/styles/client-page.css';
import { v4 as uuidv4 } from 'uuid';

/**
 * Props for the AiAssistant component.
 */
interface AiAssistantProps {
  context?: any;
}

/**
 * Response structure from the chatbot service.
 */
interface ChatbotResponse {
  answer: string;
  source?: string;
}

/**
 * Service to interact with the chatbot API.
 * Handles sending questions and receiving answers.
 */
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

            console.log('ChatbotService: sending context:', JSON.stringify(context, null, 2));

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
            }

            const data = await response.json();
            console.log('ChatbotService: Successfully parsed response', {
                hasAnswer: !!data.answer,
                answerLength: data.answer?.length ?? 0,
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

function getEmptyMessage(context?: any): string {
    if (!context?.page) {
        return 'Spør meg om noe...';
    }

    switch (context.page) {
    case 'home':
        return 'Her kan du spørre om relevant informasjon om hovedsiden.';
    case 'clients':
        return 'Her kan du stille spørsmål om klientene dine.';
    case 'scopes':
        return 'Her kan du stille spørsmål om scopes.';
    case 'scope-details':
        return 'Her kan du stille spørsmål om detaljer for dette scopet.';
    case 'client-details':
        return 'Her kan du stille spørsmål om detaljer for denne klienten.';
    default:
        return 'Spør meg om noe...';
    }
}

/**
 * AiAssistant component. This component provides an AI assistant interface for users to ask questions.
 *
 * @param context - The context to be used by the AI assistant, which can include client information, scopes, and other relevant data.
 * @constructor - The constructor initializes the component state and handles user interactions.
 */
export default function AiAssistant({ context }: Readonly<AiAssistantProps>) {
    const PANEL_STATE_KEY = 'chatbot_panel_open';
    const [aiPanelOpen, setAiPanelOpen] = useState(() => {
        try {
            return sessionStorage.getItem(PANEL_STATE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [question, setQuestion] = useState('');

    type Message = {
        id: string;
        sender: 'user' | 'bot';
        text: string;
    };

    const SESSION_KEY = 'chatbot_messages';
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
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

    useEffect(() => {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
        } catch {
            // ignore
        }
    }, [messages]);

    useEffect(() => {
        try {
            sessionStorage.setItem(PANEL_STATE_KEY, String(aiPanelOpen));
        } catch {
            // ignore
        }
    }, [aiPanelOpen]);

    const handleSubmit = async (
        e: React.FormEvent | React.KeyboardEvent
    ) => {
        e.preventDefault();
        if (!question.trim()) return;

        if (!context) {
            setMessages(prev => [
                ...prev,
                { id: uuidv4(), sender: 'bot', text: 'Konteksten er ikke klar. Prøv igjen om et øyeblikk.' }
            ]);
            return;
        }

        const userMessage = { id: uuidv4(), sender: 'user', text: question } as const;
        setMessages(prev => [...prev, userMessage]);
        setQuestion('');
        setLoading(true);

        try {
            const result = await ChatbotService.askChatbot(question, context);
            console.log('ChatbotService: context being sent:', JSON.stringify(context, null, 2));
            const fullAnswer = result.answer;


            let currentText = '';
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: currentText }]);

            let index = 0;

            const interval = setInterval(() => {
                index++;
                currentText = fullAnswer.slice(0, index);
                setMessages(prev => {

                    const others = prev.slice(0, -1);

                    return [...others, { id: uuidv4(), sender: 'bot', text: currentText }];
                });

                if (index === fullAnswer.length) {
                    clearInterval(interval);
                    setLoading(false);
                }
            }, 15);
        } catch (error) {
            let message = 'Error: Could not get response from chatbot';

            if (error instanceof Error) {
                message = `Error: ${error.message}`;
            }

            setMessages(prev => [
                ...prev,
                { id: uuidv4(), sender: 'bot', text: message }
            ]);
            setLoading(false);
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
                    <h3 className="ai-panel-title">DesKI-assistent</h3>
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
                        <p className="text-gray-400">{getEmptyMessage(context)}</p>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
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
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Still spørsmålet her..."
                        className="ai-textarea"
                        rows={3}
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="ai-submit-button"
                    >
                        {loading ? 'Genererer svar...' : 'Spør'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMessages([])}
                        title="Tøm chat"
                        className={`${loading ? 'hidden' : 'fixed bottom-10 right-[15rem] ai-clear-button'}`}
                    >
                        <TrashIcon fontSize="1.25rem" />
                    </button>
                </form>
            </div>
        </>
    );
}
