import { TrashIcon } from '@navikt/aksel-icons';
import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import '~/styles/client-page.css';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router';

/**
 * Custom message interface for AI assistant
 */
interface AiMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
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
 * Handles                        onClick={() => {
                            if (activeRequest) {
                                activeRequest.abort();
                                setActiveRequest(null);
                            }
                            setLoading(false);
                            setMessages([]);
                            setLockedContext(null); // Fjern låst kontekst når chatten tømmes
                            lastContextLabelRef.current = null;
                            lastContextMessageRef.current = null;
                            setContextMessage(null);

                            try {
                                sessionStorage.removeItem(CONTEXT_MESSAGE_KEY);
                                sessionStorage.removeItem(CONTEXT_LABEL_KEY);
                            } catch {
                                // ignore
                            }
                        }} and receiving answers.
 */
class ChatbotService {
    private static readonly BASE_URL = 'http://localhost:8000';

    /**
   * Sends a question to the chatbot and returns the response.
   *
   * @param question - The question to ask the chatbot.
   * @param context - Optional context to provide additional information for the question.
   * @param abortController - Optional AbortController for cancelling the request.
   * @returns A promise that resolves to the chatbot response.
   */
    static async askChatbot(question: string, context?: any, abortController?: AbortController): Promise<ChatbotResponse> {
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
                signal: abortController?.signal
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
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('ChatbotService: Request was aborted');
                throw error;
            }
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

/**
 * Returns a default message based on the current context.
 * If no context is provided, it returns a generic message.
 *
 * @param context - The current context of the AI assistant.
 * @returns A string message indicating what the user can ask about.
 */
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
 * Returns a label for the current context.
 * This label is used to inform the user about the current context of the AI assistant.
 *
 * @param context - The current context of the AI assistant.
 * @returns A string label indicating the current context.
 */
function getContextLabel(context?: any): string {
    if (!context?.page) return 'Ingen kontekst';
    switch (context.page) {
    case 'home':
        return 'Hovedsiden';
    case 'clients':
        return 'Klientoversikten';
    case 'scopes':
        return 'Scopesiden';
    case 'scope-details':
        return 'Scope-detaljer';
    case 'client-details':
        return 'Klient-detaljer';
    default:
        return 'Ukjent kontekst';
    }
}

export interface HighlightAction {
  type: 'highlight-tab' | 'highlight-jwk';
  tabId?: string;
  jwkKid?: string;
}

// Global state for håndtering av pågående chatbot-forespørsler
interface GlobalAiState {
    context: any;
    setContext: (context: any) => void;
    lockedContext: any; // Kontekst som brukes under pågående spørsmål
    setLockedContext: (context: any) => void;
    messages: AiMessage[];
    setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    activeRequest: AbortController | null;
    setActiveRequest: (controller: AbortController | null) => void;
}

// Opprett en Context for AI-assistentens globale tilstand
const AiAssistantContext = createContext<GlobalAiState | null>(null);

export const AiAssistantProvider = ({ children }: { children: React.ReactNode }) => {
    const [context, setContext] = useState<any>(null);
    const [lockedContext, setLockedContext] = useState<any>(() => {
        try {
            const stored = sessionStorage.getItem('ai_assistant_locked_context');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [messages, setMessages] = useState<AiMessage[]>(() => {
        try {
            const stored = sessionStorage.getItem('ai_assistant_session');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [loading, setLoading] = useState(false);
    const [activeRequest, setActiveRequest] = useState<AbortController | null>(null);
    const activeRequestRef = useRef<AbortController | null>(null);

    // Oppdater ref når activeRequest endres
    useEffect(() => {
        activeRequestRef.current = activeRequest;
    }, [activeRequest]);

    // Lagre meldinger til sessionStorage når de endres
    useEffect(() => {
        try {
            sessionStorage.setItem('ai_assistant_session', JSON.stringify(messages));
        } catch {
            // ignore
        }
    }, [messages]);

    // Lagre låst kontekst til sessionStorage
    useEffect(() => {
        try {
            if (lockedContext) {
                sessionStorage.setItem('ai_assistant_locked_context', JSON.stringify(lockedContext));
            } else {
                sessionStorage.removeItem('ai_assistant_locked_context');
            }
        } catch {
            // ignore
        }
    }, [lockedContext]);

    // Cleanup effect - avbryt pågående forespørsel når hele applikasjonen unmountes
    useEffect(() => {
        return () => {
            if (activeRequestRef.current) {
                activeRequestRef.current.abort();
            }
        };
    }, []); // Tom dependency array betyr at cleanup bare kjører når komponenten unmountes

    const memoizedValue = useMemo(() => ({ 
        context, 
        setContext, 
        lockedContext,
        setLockedContext,
        messages, 
        setMessages, 
        loading, 
        setLoading,
        activeRequest,
        setActiveRequest
    }), [context, lockedContext, messages, loading, activeRequest]);

    return (
        <AiAssistantContext.Provider value={memoizedValue}>
            {children}
        </AiAssistantContext.Provider>
    );
};

export const useAiAssistantContext = () => {
    const context = useContext(AiAssistantContext);
    if (!context) {
        throw new Error('useAiAssistantContext must be used within an AiAssistantProvider');
    }
    return context;
};

/**
 * AiAssistant component. This component provides an AI assistant interface for users to ask questions.
 *
 * @constructor - The constructor initializes the component state and handles user interactions.
 */
export default function AiAssistant(): React.JSX.Element {
    const { context, lockedContext, setLockedContext, messages, setMessages, loading, setLoading, activeRequest, setActiveRequest } = useAiAssistantContext();

    const PANEL_STATE_KEY = 'chatbot_panel_open';
    const CONTEXT_MESSAGE_KEY = 'chatbot_last_context_message';
    const CONTEXT_LABEL_KEY = 'chatbot_last_context_label';
    const [aiPanelOpen, setAiPanelOpen] = useState(() => {
        try {
            return sessionStorage.getItem(PANEL_STATE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [question, setQuestion] = useState('');
    const initialContextMessage = (() => {
        try {
            return sessionStorage.getItem(CONTEXT_MESSAGE_KEY);
        } catch {
            return null;
        }
    })();
    const [contextMessage, setContextMessage] = useState<string | null>(initialContextMessage);
    
    const initialLastContextMessage = (() => {
        try {
            return sessionStorage.getItem(CONTEXT_MESSAGE_KEY);
        } catch {
            return null;
        }
    })();
    const lastContextMessageRef = useRef<string | null>(initialLastContextMessage);
    
    const initialLastContextLabel = (() => {
        try {
            return sessionStorage.getItem(CONTEXT_LABEL_KEY);
        } catch {
            return null;
        }
    })();
    const lastContextLabelRef = useRef<string | null>(initialLastContextLabel);

    const location = useLocation();

    useEffect(() => {
        const storedPath = sessionStorage.getItem('chatbot_last_path');
        if (storedPath !== location.pathname) {
            // Bare nullstill context hvis det ikke er en pågående samtale (lockedContext)
            if (!lockedContext) {
                lastContextMessageRef.current = null;
                lastContextLabelRef.current = null;
                setContextMessage(null);
            } else {
                // Hvis vi har låst kontekst, behold context-labelet
                const currentContextLabel = getContextLabel(lockedContext);
                lastContextMessageRef.current = `Nåværende kontekst: ${currentContextLabel}`;
                lastContextLabelRef.current = currentContextLabel;
                setContextMessage(`Nåværende kontekst: ${currentContextLabel}`);
            }
            sessionStorage.setItem('chatbot_last_path', location.pathname);
        }
    }, [location.pathname, lockedContext]);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const openAiPanel = () => setAiPanelOpen(true);
    const closeAiPanel = () => {
        setAiPanelOpen(false);
    };

    /**
     * Scrolls to the bottom of the chat messages whenever new messages are added or loading state changes.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        });
    }, [messages, loading]);

    /**
     * Saves the AI panel state to session storage whenever it changes.
     * This allows the panel to maintain its open/closed state across page reloads.
     */
    useEffect(() => {
        try {
            sessionStorage.setItem(PANEL_STATE_KEY, String(aiPanelOpen));
        } catch {
        // ignore
        }
    }, [aiPanelOpen]);

    // Legger til logging for debugging
    useEffect(() => {
        console.log('Context oppdatert:', context);
    }, [context]);

    useEffect(() => {
        console.log('Meldinger oppdatert:', messages);
    }, [messages]);

    useEffect(() => {
        console.log('AI Panel status:', aiPanelOpen);
    }, [aiPanelOpen]);

    /**
     * Handles context changes and adds context messages if needed
     */
    const handleContextChange = (currentContextLabel: string, prevContextLabel: string | null) => {
        const newMessages: AiMessage[] = [];

        if (!prevContextLabel || prevContextLabel !== currentContextLabel) {
            const contextMessage = `Byttet kontekst til: ${currentContextLabel}`;
            lastContextMessageRef.current = `Nåværende kontekst: ${currentContextLabel}`;
            lastContextLabelRef.current = currentContextLabel;
            setContextMessage(`Nåværende kontekst: ${currentContextLabel}`);

            newMessages.push({
                id: uuidv4(),
                sender: 'bot',
                text: contextMessage
            });

            try {
                sessionStorage.setItem(CONTEXT_MESSAGE_KEY, `Nåværende kontekst: ${currentContextLabel}`);
                sessionStorage.setItem(CONTEXT_LABEL_KEY, currentContextLabel);
            } catch {
                // ignore
            }
        }

        return newMessages;
    };

    /**
     * Handles the typing animation for chatbot responses
     */
    const handleTypingAnimation = async (fullAnswer: string, abortController: AbortController) => {
        let currentText = '';
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: currentText }]);

        let index = 0;
        const interval = setInterval(() => {
            // Sjekk om forespørselen er avbrutt før hver oppdatering
            if (abortController.signal.aborted) {
                clearInterval(interval);
                return;
            }

            index++;
            currentText = fullAnswer.slice(0, index);
            setMessages(prev => {
                const others = prev.slice(0, -1);
                return [...others, { id: uuidv4(), sender: 'bot', text: currentText }];
            });

            if (index === fullAnswer.length) {
                clearInterval(interval);
                setLoading(false);
                setActiveRequest(null); // Nullstill aktiv forespørsel når ferdig
            }
        }, 15);
    };

    /**
     * Handles key highlighting based on the question content
     */
    const handleKeyHighlighting = async (question: string, context: any) => {
        if (question.toLowerCase().includes('nøkkel') || question.toLowerCase().includes('key')) {
            const tabEl = document.querySelector('[data-tab-id="keys"]');
            if (tabEl) {
                tabEl.classList.add('ai-tab-highlight');
                tabEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            const expiredKids = context?.jwks
                ?.filter((key: any) => {
                    const now = Math.floor(Date.now() / 1000);
                    return key.exp && key.exp < now;
                })
                ?.map((key: any) => key.kid);

            console.log('Expired kids:', expiredKids);

            if (expiredKids?.length > 0) {
                document.querySelectorAll('[data-key-id]').forEach((el) => {
                    (el as HTMLElement).classList.remove('jwk-expired-highlight');
                });

                setTimeout(() => {
                    expiredKids.forEach((kid: string) => {
                        const el = document.querySelector(`[data-key-id="${kid}"]`);
                        if (el) {
                            el.classList.add('jwk-expired-highlight');
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            console.warn('DOM-element for nøkkel ikke funnet:', kid);
                        }
                    });
                }, 300);
            }
        }
    };

    /**
     * Handles the submission of a question to the AI assistant.
     *
     * @param e - The event triggered by the form submission or key press.
     */
    const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        // For nye spørsmål: Bruk alltid gjeldende kontekst fra siden
        // Dette sikrer at konteksten oppdateres når brukeren navigerer til nye sider
        const contextToUse = context;
        setLockedContext(contextToUse); // Låse konteksten for denne samtalen

        const currentContextLabel = getContextLabel(contextToUse);
        lastContextMessageRef.current ??= `Nåværende kontekst: ${currentContextLabel}`;
        const prevContextLabel = lastContextLabelRef.current;

        if (!contextToUse) {
            setMessages(prev => [
                ...prev,
                {
                    id: uuidv4(),
                    sender: 'bot',
                    text: 'Konteksten er ikke klar. Prøv igjen om et øyeblikk.'
                }
            ]);
            return;
        }

        const contextMessages = handleContextChange(currentContextLabel, prevContextLabel);
        lastContextLabelRef.current = currentContextLabel;

        const userMessage: AiMessage = {
            id: uuidv4(),
            sender: 'user',
            text: question
        };

        setMessages(prev => [...prev, ...contextMessages, userMessage]);
        setQuestion('');
        setLoading(true);

        // Avbryt eventuell pågående forespørsel
        if (activeRequest) {
            activeRequest.abort();
        }

        // Opprett ny AbortController for denne forespørselen
        const newAbortController = new AbortController();
        setActiveRequest(newAbortController);

        try {
            const result = await ChatbotService.askChatbot(question, contextToUse, newAbortController);
            
            // Sjekk om forespørselen fortsatt er aktiv (ikke avbrutt av ny navigasjon)
            if (newAbortController.signal.aborted) {
                return;
            }
            
            await handleTypingAnimation(result.answer, newAbortController);
            await handleKeyHighlighting(question, contextToUse);
        } catch (error) {
            // Ikke vis feilmelding hvis forespørselen ble avbrutt
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Chatbot request was aborted');
                return;
            }

            const message = error instanceof Error
                ? `Error: ${error.message}`
                : 'Error: Could not get response from chatbot';
            setMessages(prev => [
                ...prev,
                { id: uuidv4(), sender: 'bot', text: message },
            ]);
            setLoading(false);
            setActiveRequest(null);
        }
    };

    /**
     * Renders the AI assistant interface.
     */
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

                    {messages.map((msg) => {
                        let messageClass = 'bot';
                        if (msg.text.startsWith('Byttet kontekst til:')) {
                            messageClass = 'system';
                        } else if (msg.sender === 'user') {
                            messageClass = 'user';
                        }

                        return (
                            <div
                                key={msg.id}
                                className={`chat-message ${messageClass}`}
                            >
                                <p>{msg.text}</p>
                            </div>
                        );
                    })}

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
                    {contextMessage && (
                        <div className="ai-context-label">
                            {contextMessage}
                        </div>
                    )}
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
                        onClick={() => {
                            // Avbryt pågående forespørsel
                            if (activeRequest) {
                                activeRequest.abort();
                                setActiveRequest(null);
                            }
                            setLoading(false);
                            setMessages([]);
                            setLockedContext(null); // Fjern låst kontekst når chatten tømmes
                            lastContextLabelRef.current = null;
                            lastContextMessageRef.current = null;
                            setContextMessage(null);

                            try {
                                sessionStorage.removeItem(CONTEXT_MESSAGE_KEY);
                                sessionStorage.removeItem(CONTEXT_LABEL_KEY);
                                sessionStorage.removeItem('ai_assistant_locked_context');
                            } catch {
                                // ignore
                            }
                        }}
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
