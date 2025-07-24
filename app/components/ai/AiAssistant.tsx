import { TrashIcon } from '@navikt/aksel-icons';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import { useLocation } from 'react-router';
import { v4 as uuidv4 } from 'uuid';

import { dateFromEpochSeconds, isExpired } from '~/lib/utils';
import '~/styles/client-page.css';

/**
 * Custom message interface for AI assistant
 */
interface AiMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
}

/**
 * Interface for auto-completion suggestions
 */
interface Suggestion {
    id: string;
    text: string;
    description: string;
    category: string;
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
    case 'client-keys':
        return 'Her kan du stille spørsmål om nøklene til denne klienten.';
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
    case 'client-keys':
        return 'Klient-nøkler';
    default:
        return 'Ukjent kontekst';
    }
}

/**
 * Generates context-aware suggestions based on the current page and user input.
 *
 * @param context - The current context of the AI assistant.
 * @param input - The current user input.
 * @returns An array of suggestions.
 */
function getContextualSuggestions(context?: any, input: string = ''): Suggestion[] {
    const inputLower = input.toLowerCase();
    const suggestions: Suggestion[] = [];

    // Context-specific suggestions
    switch (context?.page) {
    case 'home':
        suggestions.push(
            {
                id: 'overview-clients',
                text: 'Gi meg en oversikt over mine klienter',
                description: 'Se sammendrag av alle dine registrerte klienter',
                category: 'Oversikt'
            },
            {
                id: 'overview-scopes',
                text: 'Hvilke scopes har jeg tilgang til?',
                description: 'Se oversikt over tilgjengelige scopes',
                category: 'Oversikt'
            },
            {
                id: 'getting-started',
                text: 'Hvordan kommer jeg i gang?',
                description: 'Få hjelp til å komme i gang med plattformen',
                category: 'Veiledning'
            }
        );
        break;

    case 'clients':
        suggestions.push(
            {
                id: 'create-client',
                text: 'Hvordan oppretter jeg en ny klient?',
                description: 'Steg-for-steg guide til å opprette klient',
                category: 'Opprettelse'
            },
            {
                id: 'client-types',
                text: 'Hvilke klienttyper finnes?',
                description: 'Lær om forskjellige integrasjonstyper',
                category: 'Informasjon'
            },
            {
                id: 'find-client',
                text: 'Hjelp meg å finne en spesifikk klient',
                description: 'Søk og filtrer blant dine klienter',
                category: 'Søk'
            }
        );
        break;

    case 'client-details':
        suggestions.push(
            {
                id: 'update-client',
                text: 'Hvordan oppdaterer jeg klientinformasjon?',
                description: 'Endre innstillinger for denne klienten',
                category: 'Redigering'
            },
            {
                id: 'client-scopes',
                text: 'Hvilke scopes har denne klienten?',
                description: 'Se og administrer klientens scopes',
                category: 'Scopes'
            },
            {
                id: 'client-troubleshoot',
                text: 'Klienten min fungerer ikke',
                description: 'Feilsøk problemer med klienten',
                category: 'Feilsøking'
            }
        );
        break;

    case 'client-keys':
        suggestions.push(
            {
                id: 'add-key',
                text: 'Hvordan legger jeg til en ny nøkkel?',
                description: 'Guide for å legge til JWK eller sertifikat',
                category: 'Nøkler'
            },
            {
                id: 'expired-keys',
                text: 'Mine nøkler har utløpt, hva gjør jeg?',
                description: 'Håndter utløpte nøkler og forny dem',
                category: 'Nøkler'
            },
            {
                id: 'key-formats',
                text: 'Hvilke nøkkelformater støttes?',
                description: 'Lær om JWK, PEM og andre formater',
                category: 'Informasjon'
            }
        );
        break;

    case 'scopes':
        suggestions.push(
            {
                id: 'create-scope',
                text: 'Hvordan oppretter jeg et nytt scope?',
                description: 'Guide for å opprette nytt scope',
                category: 'Opprettelse'
            },
            {
                id: 'scope-permissions',
                text: 'Hvordan fungerer scope-tilganger?',
                description: 'Lær om delegering og tilgangsstyring',
                category: 'Tilgang'
            },
            {
                id: 'scope-prefixes',
                text: 'Hva er scope-prefikser?',
                description: 'Forstå organisering av scopes',
                category: 'Informasjon'
            }
        );
        break;

    case 'scope-details':
        suggestions.push(
            {
                id: 'scope-access',
                text: 'Hvem har tilgang til dette scopet?',
                description: 'Se hvem som kan bruke dette scopet',
                category: 'Tilgang'
            },
            {
                id: 'manage-access',
                text: 'Hvordan gir jeg tilgang til andre?',
                description: 'Dele scope-tilgang med andre organisasjoner',
                category: 'Administrasjon'
            },
            {
                id: 'scope-usage',
                text: 'Hvordan brukes dette scopet?',
                description: 'Praktisk veiledning for scope-bruk',
                category: 'Bruk'
            }
        );
        break;
    }

    // Filter suggestions based on input
    if (input.trim()) {
        return suggestions.filter(suggestion => 
            suggestion.text.toLowerCase().includes(inputLower) ||
            suggestion.description.toLowerCase().includes(inputLower) ||
            suggestion.category.toLowerCase().includes(inputLower)
        );
    }

    // Return all suggestions if no input, grouped by category
    return suggestions.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.text.localeCompare(b.text);
    });
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
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
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
            } else {
                // Hvis vi har låst kontekst, behold context-labelet
                const currentContextLabel = getContextLabel(lockedContext);
                lastContextMessageRef.current = `Nåværende kontekst: ${currentContextLabel}`;
                lastContextLabelRef.current = currentContextLabel;
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
     * Updates suggestions when context or question changes
     */
    useEffect(() => {
        if (question.trim()) {
            const contextualSuggestions = getContextualSuggestions(context, question);
            setSuggestions(contextualSuggestions);
            setShowSuggestions(contextualSuggestions.length > 0);
        } else {
            const allSuggestions = getContextualSuggestions(context);
            setSuggestions(allSuggestions.slice(0, 8)); // Limit to 8 suggestions when no input
            setShowSuggestions(false); // Don't show by default when empty
        }
        setSelectedSuggestionIndex(-1);
    }, [context, question]);

    /**
     * Handles suggestion selection with keyboard navigation
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
            return;
        }

        switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setSelectedSuggestionIndex(prev => 
                prev < suggestions.length - 1 ? prev + 1 : 0
            );
            break;
        case 'ArrowUp':
            e.preventDefault();
            setSelectedSuggestionIndex(prev => 
                prev > 0 ? prev - 1 : suggestions.length - 1
            );
            break;
        case 'Tab':
        case 'Enter':
            if (selectedSuggestionIndex >= 0) {
                e.preventDefault();
                const selectedSuggestion = suggestions[selectedSuggestionIndex];
                setQuestion(selectedSuggestion.text);
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                textareaRef.current?.focus();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
            break;
        case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
            break;
        default:
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        }
    };

    /**
     * Handles suggestion click
     */
    const handleSuggestionClick = (suggestion: Suggestion) => {
        setQuestion(suggestion.text);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        textareaRef.current?.focus();
    };

    /**
     * Handles input focus to show suggestions
     */
    const handleInputFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    /**
     * Handles input blur to hide suggestions (with delay for clicks)
     */
    const handleInputBlur = () => {
        // Add small delay to allow suggestion clicks to register
        setTimeout(() => {
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
        }, 150);
    };

    /**
     * Handles context changes and adds context messages if needed
     */
    const handleContextChange = (currentContextLabel: string, prevContextLabel: string | null) => {
        const newMessages: AiMessage[] = [];

        if (!prevContextLabel || prevContextLabel !== currentContextLabel) {
            const contextMessage = `Byttet kontekst til: ${currentContextLabel}`;
            lastContextMessageRef.current = `Nåværende kontekst: ${currentContextLabel}`;
            lastContextLabelRef.current = currentContextLabel;

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
        const lowerQuestion = question.toLowerCase();
        const keyWords = ['nøkkel', 'key', 'keys', 'nøkler', 'sertifikat', 'certificate', 'jwk', 'jwt', 'kryptografi', 'crypto'];
        const expiredWords = ['utløpt', 'expired', 'expire', 'utløper', 'expiry', 'utløp', 'gammel', 'old', 'invalid', 'ugyldig'];
        const problemWords = ['problem', 'feil', 'error', 'issue', 'trouble', 'ikke fungerer', 'virker ikke'];
        
        const hasKeyWord = keyWords.some(word => lowerQuestion.includes(word));
        const hasExpiredWord = expiredWords.some(word => lowerQuestion.includes(word));
        const hasProblemWord = problemWords.some(word => lowerQuestion.includes(word));
        
        if (hasKeyWord || hasExpiredWord || hasProblemWord) {
            console.log('🔑 Key highlighting triggered:', { hasKeyWord, hasExpiredWord, hasProblemWord, question: lowerQuestion });
            
            // Highlight the keys tab with improved styling
            const tabEl = document.querySelector('[data-tab-id="keys"]');
            if (tabEl) {
                console.log('🎯 Highlighting keys tab with improved styling');
                tabEl.classList.add('ai-tab-highlight');
                
                // Remove highlight after 5 seconds (increased for better visibility)
                setTimeout(() => {
                    tabEl.classList.remove('ai-tab-highlight');
                }, 5000);
            }
            
            // If asking about expired keys or problems, highlight expired keys
            if (hasExpiredWord || hasProblemWord) {
                highlightExpiredKeys(context);
            }
        }
    };

    /**
     * Highlights expired keys with blinking red animation
     */
    const highlightExpiredKeys = useCallback((context: any) => {
        console.log('🚀 Starting highlightExpiredKeys function'); 
        console.log('📋 Full context:', context);
        
        // Get current time for comparison
        const now = new Date();
        console.log(`⏰ Current time: ${now.toISOString()}`);
        
        const expiredKids = (context?.keys || context?.jwks)
            ?.filter((key: any) => {
                if (!key.exp) {
                    console.log(`⚠️ Key ${key.kid}: No expiration date`);
                    return false;
                }
                const keyDate = dateFromEpochSeconds(key.exp);
                const keyIsExpired = isExpired(keyDate);
                console.log(`🔍 Key ${key.kid}: exp=${key.exp} (${keyDate.toISOString()}) vs now (${now.toISOString()}), isExpired=${keyIsExpired}`);
                
                // Double check with manual calculation
                const manualCheck = keyDate.getTime() < now.getTime();
                console.log(`🔍 Manual check for ${key.kid}: ${manualCheck} (keyTime: ${keyDate.getTime()}, nowTime: ${now.getTime()})`);
                
                return keyIsExpired;
            })
            ?.map((key: any) => key.kid);

        console.log('🔍 Checking for expired keys:', { 
            totalKeys: (context?.keys || context?.jwks)?.length || 0, 
            expiredKids: expiredKids || [],
            contextHasKeys: !!(context?.keys || context?.jwks),
            contextStructure: Object.keys(context || {}),
            keysInContext: context?.keys || context?.jwks
        });

        // Check if we need to navigate to keys tab first
        const allKeyElements = document.querySelectorAll('[data-key-id]');
        console.log('🎯 Found DOM elements with data-key-id:', allKeyElements.length);
        
        // If no key DOM elements found but we have keys in context, we might need to navigate to keys tab
        if (allKeyElements.length === 0 && (context?.keys || context?.jwks)?.length > 0) {
            console.log('🔄 No key DOM elements found, looking for keys tab to click...');
            
            // Look for "Nøkler" tab and click it
            const tabElements = document.querySelectorAll('[role="tab"]');
            console.log('🎯 Found tabs:', tabElements.length);
            
            let keysTab = null;
            tabElements.forEach((tab, index) => {
                const tabText = tab.textContent?.toLowerCase() || '';
                console.log(`Tab ${index}: "${tab.textContent}"`);
                if (tabText.includes('nøkler') || tabText.includes('nøkkel') || tabText.includes('keys')) {
                    keysTab = tab;
                    console.log('🎯 Found keys tab!');
                }
            });
            
            if (keysTab) {
                console.log('�️ Clicking keys tab to load key elements...');
                (keysTab as HTMLElement).click();
                
                // Wait for DOM to update, then try highlighting again
                setTimeout(() => {
                    console.log('🔄 Retrying highlight after tab navigation...');
                    highlightExpiredKeysAfterTabLoad(expiredKids);
                }, 500);
                return;
            } else {
                console.warn('❌ Could not find keys tab to click');
            }
        }

        // If we have DOM elements or no keys to highlight, proceed normally
        highlightExpiredKeysAfterTabLoad(expiredKids);
    }, []);

    /**
     * Helper function to highlight expired keys after ensuring the tab is loaded
     */
    const highlightExpiredKeysAfterTabLoad = (expiredKids: string[] | undefined) => {
        // Always try to find DOM elements regardless of expired status for testing
        const allKeyElements = document.querySelectorAll('[data-key-id]');
        console.log('🎯 Found DOM elements with data-key-id:', allKeyElements.length);
        allKeyElements.forEach((el, index) => {
            const keyId = el.getAttribute('data-key-id');
            console.log(`  Element ${index}: data-key-id="${keyId}"`);
        });

        if (expiredKids && expiredKids.length > 0) {
            console.log('⚠️ Highlighting expired keys with blinking animation:', expiredKids);
            
            // Remove existing highlights
            document.querySelectorAll('[data-key-id]').forEach((el) => {
                (el as HTMLElement).classList.remove('jwk-expired-highlight');
            });

            // Add highlights with staggered animation
            setTimeout(() => {
                expiredKids.forEach((kid: string, index: number) => {
                    const el = document.querySelector(`[data-key-id="${kid}"]`);
                    console.log(`🎯 Looking for element with data-key-id="${kid}":`, el);
                    
                    if (el) {
                        setTimeout(() => {
                            console.log(`✨ Adding highlight to key: ${kid}`);
                            el.classList.add('jwk-expired-highlight');
                            
                            // Scroll to first expired key for visibility
                            if (index === 0) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            
                            // Remove highlight after 8 seconds (longer for better visibility)
                            setTimeout(() => {
                                console.log(`🔄 Removing highlight from key: ${kid}`);
                                el.classList.remove('jwk-expired-highlight');
                            }, 8000);
                        }, index * 300); // Increased stagger time for better effect
                    } else {
                        console.warn('❌ DOM-element for nøkkel ikke funnet:', kid);
                        console.log('Available elements:', document.querySelectorAll('[data-key-id]'));
                    }
                });
            }, 200);
        } else {
            console.log('ℹ️ No expired keys found by isExpired function');
            
            // For testing purposes - highlight all keys temporarily if no expired ones
            if (allKeyElements.length > 0) {
                console.log('🧪 TEST MODE: Highlighting all keys for 3 seconds since no expired keys found');
                allKeyElements.forEach((el, index) => {
                    setTimeout(() => {
                        el.classList.add('jwk-expired-highlight');
                        setTimeout(() => {
                            el.classList.remove('jwk-expired-highlight');
                        }, 3000);
                    }, index * 200);
                });
            } else {
                console.log('ℹ️ No key DOM elements to highlight');
            }
        }
    };

    /**
     * Sets up event listener for keys tab clicks to highlight expired keys
     */
    useEffect(() => {
        const handleTabClick = (event: Event) => {
            const target = event.target as HTMLElement;
            const tabElement = target.closest('[data-tab-id="keys"]');
            
            if (tabElement) {
                console.log('🎯 Keys tab clicked - checking for expired keys');
                
                // Get current context
                const currentContext = lockedContext || context;
                if (currentContext) {
                    // Highlight expired keys when tab is clicked
                    highlightExpiredKeys(currentContext);
                }
            }
        };

        // Add event listener to document for tab clicks
        document.addEventListener('click', handleTabClick);
        
        // Cleanup
        return () => {
            document.removeEventListener('click', handleTabClick);
        };
    }, [context, lockedContext, highlightExpiredKeys]);

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
                    <div className="ai-context-label">
                        Nåværende kontekst: {getContextLabel(context)}
                    </div>
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder={loading ? 'Skriv neste spørsmål...' : 'Still spørsmålet her...'}
                            className="ai-textarea"
                            rows={3}
                        />
                        
                        {/* Stop button when AI is generating */}
                        {loading && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeRequest) {
                                        activeRequest.abort();
                                        setActiveRequest(null);
                                    }
                                    setLoading(false);
                                }}
                                title="Stopp generering"
                                className="ai-stop-button"
                            >
                                <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="currentColor"
                                >
                                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                                </svg>
                            </button>
                        )}
                        
                        {/* Auto-completion suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && !loading && (
                            <div 
                                ref={suggestionsRef}
                                className="absolute bottom-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50 mb-2 ai-suggestions-dropdown"
                            >
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={suggestion.id}
                                        type="button"
                                        className={`w-full text-left px-4 py-3 ai-suggestion-item transition-all duration-150 ${
                                            index === selectedSuggestionIndex ? 'selected' : ''
                                        }`}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                    >
                                        <div className="ai-suggestion-text">
                                            {suggestion.text}
                                        </div>
                                        <div className="ai-suggestion-description">
                                            {suggestion.description}
                                        </div>
                                        <div className="ai-suggestion-category">
                                            {suggestion.category}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="ai-submit-button"
                    >
                        Spør
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

                            try {
                                sessionStorage.removeItem(CONTEXT_MESSAGE_KEY);
                                sessionStorage.removeItem(CONTEXT_LABEL_KEY);
                                sessionStorage.removeItem('ai_assistant_locked_context');
                            } catch {
                                // ignore
                            }
                        }}
                        title="Tøm chat"
                        className="fixed bottom-10 right-[15.5rem] ai-clear-button"
                    >
                        <TrashIcon fontSize="1.25rem" />
                    </button>
                </form>
            </div>
        </>
    );
}
