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
 * Service for interacting with the chatbot API.
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
        return this.askChatbotWithRetry(question, context, abortController, 1);
    }

    /**
     * Internal method with retry logic for CORS/network issues
     */
    private static async askChatbotWithRetry(question: string, context?: any, abortController?: AbortController, maxRetries: number = 1): Promise<ChatbotResponse> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`ChatbotService: Attempt ${attempt}/${maxRetries} - Sending request to chatbot`, {
                    url: `${this.BASE_URL}/copilot/`,
                    question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
                    hasContext: !!context,
                    contextKeys: context ? Object.keys(context) : [],
                    contextSize: context ? JSON.stringify(context).length : 0,
                    attempt
                });

                const requestBody = {
                    question,
                    ...(context && { context })
                };

                if (context) {
                    console.log('ChatbotService: Context structure:', {
                        page: context.page,
                        hasClient: !!context.client,
                        hasJwks: !!context.jwks,
                        hasScopeConflicts: !!context.scopeConflicts,
                        scopeConflictsCount: context.scopeConflicts?.length || 0,
                        availableScopesKeys: context.availableScopes ? Object.keys(context.availableScopes) : [],
                        clientScopes: context?.client?.scopes || [],
                        accessibleForAllCount: context?.availableScopes?.accessibleForAll?.length || 0,
                        accessibleForAllSample: context?.availableScopes?.accessibleForAll?.slice(0, 5)?.map(s => ({
                            name: s.name,
                            at_max_age: s.at_max_age,
                            authorization_max_lifetime: s.authorization_max_lifetime
                        })) || [],
                        contextSizeKB: (JSON.stringify(context).length / 1024).toFixed(2) + ' KB'
                    });
                }

                const contextString = JSON.stringify(requestBody);
                const requestSizeKB = contextString.length / 1024;
                console.log(`ChatbotService: Request size: ${requestSizeKB.toFixed(2)} KB`);
                
                if (requestSizeKB > 1000) {
                    console.warn('ChatbotService: Large request detected, may cause issues');
                }

                console.log('ChatbotService: Making fetch request...');

                const timestamp = new Date().getTime();
                const requestUrl = `${this.BASE_URL}/copilot/?_t=${timestamp}`;
                
                const response = await fetch(requestUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    body: contextString,
                    signal: abortController?.signal,
                    credentials: 'omit',
                    cache: 'no-cache',
                    mode: 'cors'
                });

                console.log('ChatbotService: Fetch completed', {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('ChatbotService: HTTP error', {
                        status: response.status,
                        statusText: response.statusText,
                        errorBody: errorText.substring(0, 500) + (errorText.length > 500 ? '...' : ''),
                        requestSize: requestSizeKB.toFixed(2) + ' KB'
                    });
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                console.log('ChatbotService: Parsing response...');
                const data = await response.json();
                console.log('ChatbotService: Successfully parsed response', {
                    hasAnswer: !!data.answer,
                    answerLength: data.answer?.length ?? 0,
                    hasSource: !!data.source
                });

                return data;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('ChatbotService: Request was aborted');
                    throw error;
                }
                
                console.error(`ChatbotService: Attempt ${attempt} failed`, {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    url: `${this.BASE_URL}/copilot/`,
                    question: question.substring(0, 50) + '...',
                    errorType: error instanceof TypeError ? 'Network/CORS' : 'Other',
                    contextPresent: !!context,
                    requestSizeKB: context ? (JSON.stringify({ question, context }).length / 1024).toFixed(2) : 'N/A',
                    attempt,
                    willRetry: attempt < maxRetries
                });

                if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
                    if (attempt < maxRetries) {
                        console.log('ChatbotService: CORS/Network error detected, waiting 1s before retry...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }

                    console.error('CORS/Network Error Detected - This usually means:');
                    console.error('1. Browser is caching a failed CORS preflight request');
                    console.error('2. Browser extensions (ad blockers) are interfering');
                    console.error('3. Browser security policy is blocking the request');
                    console.error('4. Backend crashed or returned 500 error');
                    console.error('');
                    console.error('Try these solutions:');
                    console.error('1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)');
                    console.error('2. Clear browser cache and cookies');
                    console.error('3. Disable browser extensions temporarily');
                    console.error('4. Try in an incognito/private window');
                    
                    throw new Error('Browser CORS issue: Try hard refresh (Ctrl+F5) or incognito mode. Backend is working fine.');
                }

                if (attempt >= maxRetries) {
                    break;
                }
            }
        }
        throw lastError || new Error('All retry attempts failed');
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
    const suggestions: Suggestion[] = [];

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
                id: 'scope-lifetime-conflicts',
                text: 'Klient med noen scopes på som logger ut brukeren lenge før det jeg har satt levetid til',
                description: 'Analyser og løs scope lifetime konflikter',
                category: 'Feilsøking'
            },
            {
                id: 'fix-authorization-lifetime',
                text: 'Hvorfor blir brukerne logget ut tidligere enn forventet?',
                description: 'Sjekk autorisasjonslevetid mellom klient og scopes',
                category: 'Feilsøking'
            },
            {
                id: 'access-token-lifetime-issues',
                text: 'Access tokens utløper før klientens innstilling',
                description: 'Løs konflikter med access token levetid',
                category: 'Feilsøking'
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

    /**
     * Check for scope conflicts in the context and add relevant suggestions.
     */
    if (context?.scopeConflicts && context.scopeConflicts.length > 0) {
        const authLifetimeConflicts = context.scopeConflicts.filter((c: any) => c.type === 'authorization_lifetime_conflict');
        const accessTokenConflicts = context.scopeConflicts.filter((c: any) => c.type === 'access_token_lifetime_conflict');

        if (authLifetimeConflicts.length > 0) {
            suggestions.unshift({
                id: 'auth-lifetime-conflicts',
                text: `Klienten har ${authLifetimeConflicts.length} scope(s) som logger ut brukeren tidligere enn forventet`,
                description: 'Scopes med lavere autorisasjonslevetid overstyrer klientens innstillinger',
                category: 'Kritisk feil'
            });

            authLifetimeConflicts.slice(0, 3).forEach((conflict: any) => {
                suggestions.unshift({
                    id: `fix-auth-${conflict.scopeName}`,
                    text: `Løs autorisasjonskonflikt for scope '${conflict.scopeName}'`,
                    description: `Scope har ${conflict.scopeLifetime}s, klient har ${conflict.clientLifetime}s - reduser klientens levetid`,
                    category: 'Løsningsforslag'
                });
            });
        }

        /**
         * Check for access token conflicts and add suggestions.
         */
        if (accessTokenConflicts.length > 0) {
            suggestions.unshift({
                id: 'access-token-conflicts',
                text: `Klienten har ${accessTokenConflicts.length} scope(s) med lavere access token levetid`,
                description: 'Access tokens vil utløpe tidligere enn klientens innstillinger',
                category: 'Konfigurasjonsfeil'
            });

            accessTokenConflicts.slice(0, 2).forEach((conflict: any) => {
                suggestions.unshift({
                    id: `fix-token-${conflict.scopeName}`,
                    text: `Juster access token levetid for scope '${conflict.scopeName}'`,
                    description: `Scope har ${conflict.scopeLifetime}s, klient har ${conflict.clientLifetime}s`,
                    category: 'Løsningsforslag'
                });
            });
        }

        /**
         * If there are more than 3 scope conflicts, suggest reviewing all.
         */
        if (context.scopeConflicts.length > 3) {
            suggestions.unshift({
                id: 'review-all-conflicts',
                text: `Gjennomgå alle ${context.scopeConflicts.length} konfigurasjonskonflikter`,
                description: 'Få en komplett oversikt over alle lifetime konflikter og anbefalte løsninger',
                category: 'Komplett analyse'
            });
        }
    }

    /**
     * If the user input contains specific keywords, add relevant suggestions.
     */
    if (input.trim()) {
        const inputLower = input.toLowerCase();

        if (inputLower.includes('levetid') || inputLower.includes('lifetime') || inputLower.includes('logger ut') || inputLower.includes('utløp')) {
            suggestions.unshift({
                id: 'lifetime-help',
                text: 'Forstå hvordan scope lifetime påvirker min klient',
                description: 'Lær om sammenhenger mellom klient- og scope-levetider',
                category: 'Læringsressurs'
            });
        }

        if (inputLower.includes('konflikt') || inputLower.includes('feil') || inputLower.includes('problem')) {
            suggestions.unshift({
                id: 'conflict-diagnosis',
                text: 'Diagnostiser konfigurasjonskonflikter automatisk',
                description: 'La AI-assistenten analysere alle mulige problemer med klienten',
                category: 'Automatisk diagnose'
            });
        }

        if (inputLower.includes('access token') || inputLower.includes('tilgang')) {
            suggestions.unshift({
                id: 'access-token-help',
                text: 'Hvordan fungerer access token levetider?',
                description: 'Forklaring av access token lifetime innstillinger',
                category: 'Læringsressurs'
            });
        }

        return suggestions.filter(suggestion => 
            suggestion.text.toLowerCase().includes(inputLower) ||
            suggestion.description.toLowerCase().includes(inputLower) ||
            suggestion.category.toLowerCase().includes(inputLower)
        );
    }

    /**
     * Sort suggestions by category first, then by text.
     */
    return suggestions.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.text.localeCompare(b.text);
    });
}

/**
 * Interface for actions that can be dispatched to highlight tabs, JWKs, or scope conflicts.
 */
export interface HighlightAction {
  type: 'highlight-tab' | 'highlight-jwk' | 'highlight-scope-conflict';
  tabId?: string;
  jwkKid?: string;
  scopeName?: string;
  conflictType?: 'authorization_lifetime_conflict' | 'access_token_lifetime_conflict';
}

/**
 * Interface for the global AI assistant state.
 */
interface GlobalAiState {
    context: any;
    setContext: (context: any) => void;
    lockedContext: any;
    setLockedContext: (context: any) => void;
    messages: AiMessage[];
    setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    activeRequest: AbortController | null;
    setActiveRequest: (controller: AbortController | null) => void;
}

/**
 * Context for the AI assistant state.
 */
const AiAssistantContext = createContext<GlobalAiState | null>(null);

/**
 * Provider component for the AI assistant context.
 *
 * @param children - The child components to be rendered within the provider.
 * @constructor - This component initializes the AI assistant context and provides state management for messages, context, and loading state.
 */
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

    useEffect(() => {
        activeRequestRef.current = activeRequest;
    }, [activeRequest]);

    useEffect(() => {
        try {
            sessionStorage.setItem('ai_assistant_session', JSON.stringify(messages));
        } catch {
            // Silently ignore storage errors to prevent UI breaks
        }
    }, [messages]);

    useEffect(() => {
        try {
            if (lockedContext) {
                sessionStorage.setItem('ai_assistant_locked_context', JSON.stringify(lockedContext));
            } else {
                sessionStorage.removeItem('ai_assistant_locked_context');
            }
        } catch {
            // Silently ignore storage errors to prevent UI breaks
        }
    }, [lockedContext]);


    useEffect(() => {
        return () => {
            if (activeRequestRef.current) {
                activeRequestRef.current.abort();
            }
        };
    }, []);

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

/**
 * Custom hook to access the AI assistant context.
 */
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

    useEffect(() => {
        console.log('AiAssistant component mounted');
        console.log('Current window location:', window.location.href);

        const testBackend = async () => {
            try {
                console.log('Testing backend connectivity...');

                const timestamp = new Date().getTime();
                const testUrl = `http://localhost:8000/copilot/?_t=${timestamp}`;

                const testResponse = await fetch(testUrl, { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    body: JSON.stringify({ question: 'ping' }),
                    signal: AbortSignal.timeout(3000),
                    credentials: 'omit',
                    cache: 'no-cache',
                    mode: 'cors'
                });
                
                console.log('Backend main endpoint test:', {
                    status: testResponse.status,
                    ok: testResponse.ok,
                    statusText: testResponse.statusText,
                    corsHeaders: {
                        'access-control-allow-origin': testResponse.headers.get('access-control-allow-origin'),
                        'access-control-allow-methods': testResponse.headers.get('access-control-allow-methods'),
                        'access-control-allow-headers': testResponse.headers.get('access-control-allow-headers')
                    }
                });
                
                if (!testResponse.ok) {
                    console.warn('⚠Backend responded but with error status:', testResponse.status);
                }
                
            } catch (error) {
                console.error('Backend connectivity test failed:', {
                    error: error instanceof Error ? error.message : String(error),
                    errorType: error instanceof TypeError ? 'Network/CORS' : 'Other',
                    backendUrl: 'http://localhost:8000',
                    recommendation: error instanceof TypeError ? 
                        'Try refreshing the page or clearing browser cache' : 
                        'Check backend logs for errors'
                });

                try {
                    const healthCheck = await fetch('http://localhost:8000/health', { 
                        method: 'GET',
                        signal: AbortSignal.timeout(2000),
                        cache: 'no-cache',
                        mode: 'cors'
                    });
                    console.log('Health endpoint response:', healthCheck.status, healthCheck.statusText);
                } catch (healthError) {
                    console.log('Health endpoint also failed:', healthError instanceof Error ? healthError.message : String(healthError));
                }
            }
        };
        
        testBackend();
        
        console.log('Checking if logo.png is accessible...');

        fetch('/logo.png')
            .then(response => {
                console.log('Logo fetch response:', response.status, response.statusText);
                console.log('Response headers:', [...response.headers.entries()]);
                return response.blob();
            })
            .then(blob => {
                console.log('Logo blob:', blob.type, blob.size + ' bytes');
            })
            .catch(error => {
                console.log('Logo fetch error:', error);
            });
    }, []);

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
    const highlightedElementsRef = useRef<Set<string>>(new Set());
    const lastHighlightTimeRef = useRef<number>(0);
    
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
            if (!lockedContext) {
                lastContextMessageRef.current = null;
                lastContextLabelRef.current = null;
            } else {
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

    /**
     * Logs context updates in development mode for debugging purposes.
     */
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Context oppdatert:', context);
        }
    }, [context]);

    /**
     * Updates suggestions when context or question changes - memoized for performance
     */
    const contextualSuggestions = useMemo(() => {
        if (question.trim()) {
            return getContextualSuggestions(context, question);
        } else {
            return getContextualSuggestions(context).slice(0, 8);
        }
    }, [context, question]);

    /**
     * Updates suggestions and visibility based on contextual suggestions and user input.
     */
    useEffect(() => {
        setSuggestions(contextualSuggestions);
        setShowSuggestions(question.trim() ? contextualSuggestions.length > 0 : false);
        setSelectedSuggestionIndex(-1);
    }, [contextualSuggestions, question]);

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
            } catch (error) {
                console.warn('Scope highlighting failed:', error);
            }
        }

        return newMessages;
    };

    /**
     * Handles the typing animation for chatbot responses with optimized performance
     */
    const handleTypingAnimation = async (fullAnswer: string, abortController: AbortController) => {
        if (fullAnswer.length < 50) {
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: fullAnswer }]);
            setLoading(false);
            setActiveRequest(null);
            return;
        }

        let currentText = '';
        const botMessageId = uuidv4();
        setMessages(prev => [...prev, { id: botMessageId, sender: 'bot', text: currentText }]);

        let index = 0;
        const chunkSize = Math.max(1, Math.floor(fullAnswer.length / 50));
        const interval = setInterval(() => {
            if (abortController.signal.aborted) {
                clearInterval(interval);
                return;
            }

            index = Math.min(index + chunkSize, fullAnswer.length);
            currentText = fullAnswer.slice(0, index);

            setMessages(prev => {
                const others = prev.slice(0, -1);
                return [...others, { id: botMessageId, sender: 'bot', text: currentText }];
            });

            if (index >= fullAnswer.length) {
                clearInterval(interval);
                setLoading(false);
                setActiveRequest(null);
            }
        }, 30);
    };

    /**
     * Handles key highlighting based on the question content
     */
    const handleKeyHighlighting = async (question: string, context: any) => {
        const lowerQuestion = question.toLowerCase();
        const keyWords = ['nøkkel', 'nøkler', 'sertifikat', 'certificate', 'jwk', 'jwt', 'kryptografi', 'crypto'];
        const expiredWords = ['utløpt', 'expired', 'expire', 'utløper', 'expiry', 'utløp', 'gammel', 'old', 'invalid', 'ugyldig'];
        const problemWords = ['problem', 'feil', 'error', 'issue', 'trouble', 'ikke fungerer', 'virker ikke'];

        const scopeWords = [
            'scope', 'scopes', 'access token', 'access_token', 'tilgang',
            'autorisasjon', 'authorization', 'levetid', 'lifetime',
            'logger ut', 'logges ut', 'logout', 'innstilling', 'klientens',
            'brukeren', 'session', 'sesjon'
        ];
        const hasScopeWord = scopeWords.some(word => lowerQuestion.includes(word));
        const hasExplicitKeyWord = keyWords.some(word => lowerQuestion.includes(word));
        const hasKeyProblem = hasExplicitKeyWord && (expiredWords.some(word => lowerQuestion.includes(word)) || problemWords.some(word => lowerQuestion.includes(word)));

        if (hasScopeWord) {
            console.log('Key highlighting skipped - question is about scopes/authorization:', { question: lowerQuestion, matchedScopeWords: scopeWords.filter(word => lowerQuestion.includes(word)) });
            return;
        }

        const shouldHighlightKeys = hasExplicitKeyWord || hasKeyProblem;
        
        if (shouldHighlightKeys) {
            console.log('Key highlighting triggered:', { hasExplicitKeyWord, hasKeyProblem, question: lowerQuestion });

            const tabEl = document.querySelector('[data-tab-id="keys"]');
            if (tabEl) {
                console.log('Highlighting keys tab with improved styling');
                tabEl.classList.add('ai-tab-highlight');

                setTimeout(() => {
                    tabEl.classList.remove('ai-tab-highlight');
                }, 5000);
            }

            if (hasKeyProblem) {
                highlightExpiredKeys(context);
            }
        }
    };

    /**
     * Handles scope conflict highlighting based on the question content and optionally response content
     */
    const handleScopeConflictHighlighting = async (question: string, context: any, hasResponseConflicts: boolean = false) => {
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('error:') || lowerQuestion.includes('kan ikke nå') || lowerQuestion.includes('utilgjengelig')) {
            console.log('🚫 Scope conflict highlighting skipped - looks like error message:', { question: lowerQuestion });
            return;
        }
        
        const scopeConflictWords = [
            'access token', 'access_token', 'tilgang', 
            'autorisasjon', 'authorization', 
            'levetid', 'lifetime', 
            'logger ut', 'logges ut', 'logout',
            'scope', 'scopes', 'innstilling', 'klientens'
        ];
        const conflictWords = [
            'konflikt', 'problem', 'feil', 'utløper', 'før', 'tidligere',
            'mindre', 'lavere', 'kortere', 'tidligere enn', 'korte'
        ];
        
        const hasScopeConflictWord = scopeConflictWords.some(word => lowerQuestion.includes(word));
        const hasConflictWord = conflictWords.some(word => lowerQuestion.includes(word));
        const isAccessTokenIssue = lowerQuestion.includes('access token') || lowerQuestion.includes('access_token');
        const isLifetimeIssue = lowerQuestion.includes('levetid') || lowerQuestion.includes('lifetime') || lowerQuestion.includes('utløper');
        const isClientSettingIssue = lowerQuestion.includes('innstilling') || lowerQuestion.includes('klientens');
        
        const shouldHighlight = hasScopeConflictWord && hasConflictWord || 
                              (isAccessTokenIssue && isLifetimeIssue) ||
                              (isLifetimeIssue && isClientSettingIssue);
        
        if (shouldHighlight || hasResponseConflicts) {
            console.log('🔍 Scope conflict highlighting triggered:', { 
                question: lowerQuestion,
                hasScopeConflictWord,
                hasConflictWord,
                isAccessTokenIssue,
                isLifetimeIssue,
                isClientSettingIssue,
                hasResponseConflicts
            });

            highlightScopeConflicts(context);
            highlightLifetimeFields(context, hasResponseConflicts);

            const tabElements = document.querySelectorAll('[role="tab"]');
            let scopesTab: Element | null = null;
            tabElements.forEach((tab) => {
                const tabText = tab.textContent?.toLowerCase() || '';
                if (tabText.includes('scope') || tabText.includes('tilgang')) {
                    scopesTab = tab;
                }
            });
            
            if (scopesTab) {
                console.log('Highlighting scopes tab');
                (scopesTab as HTMLElement).classList.add('ai-tab-highlight');
                setTimeout(() => {
                    (scopesTab as HTMLElement).classList.remove('ai-tab-highlight');
                }, 5000);
            }
        }
    };

    /**
     * Highlights expired keys with blinking red animation
     */
    const highlightExpiredKeys = useCallback((context: any) => {
        console.log('Starting highlightExpiredKeys function');
        console.log('Full context:', context);

        const now = new Date();
        console.log(`Current time: ${now.toISOString()}`);
        
        const expiredKids = (context?.keys || context?.jwks)
            ?.filter((key: any) => {
                if (!key.exp) {
                    console.log(`Key ${key.kid}: No expiration date`);
                    return false;
                }
                const keyDate = dateFromEpochSeconds(key.exp);
                const keyIsExpired = isExpired(keyDate);
                console.log(`Key ${key.kid}: exp=${key.exp} (${keyDate.toISOString()}) vs now (${now.toISOString()}), isExpired=${keyIsExpired}`);

                const manualCheck = keyDate.getTime() < now.getTime();
                console.log(`Manual check for ${key.kid}: ${manualCheck} (keyTime: ${keyDate.getTime()}, nowTime: ${now.getTime()})`);
                
                return keyIsExpired;
            })
            ?.map((key: any) => key.kid);

        console.log('Checking for expired keys:', {
            totalKeys: (context?.keys || context?.jwks)?.length || 0, 
            expiredKids: expiredKids || [],
            contextHasKeys: !!(context?.keys || context?.jwks),
            contextStructure: Object.keys(context || {}),
            keysInContext: context?.keys || context?.jwks
        });

        const allKeyElements = document.querySelectorAll('[data-key-id]');
        console.log('Found DOM elements with data-key-id:', allKeyElements.length);

        if (allKeyElements.length === 0 && (context?.keys || context?.jwks)?.length > 0) {
            console.log('No key DOM elements found, looking for keys tab to click...');

            const tabElements = document.querySelectorAll('[role="tab"]');
            console.log('Found tabs:', tabElements.length);
            
            let keysTab = null;
            tabElements.forEach((tab, index) => {
                const tabText = tab.textContent?.toLowerCase() || '';
                console.log(`Tab ${index}: "${tab.textContent}"`);
                if (tabText.includes('nøkler') || tabText.includes('nøkkel') || tabText.includes('keys')) {
                    keysTab = tab;
                    console.log('Found keys tab!');
                }
            });
            
            if (keysTab) {
                console.log('Clicking keys tab to load key elements...');
                (keysTab as HTMLElement).click();

                setTimeout(() => {
                    console.log('Retrying highlight after tab navigation...');
                    highlightExpiredKeysAfterTabLoad(expiredKids);
                }, 500);
                return;
            } else {
                console.warn('Could not find keys tab to click');
            }
        }

        highlightExpiredKeysAfterTabLoad(expiredKids);
    }, []);

    /**
     * Helper function to highlight expired keys after ensuring the tab is loaded
     */
    const highlightExpiredKeysAfterTabLoad = (expiredKids: string[] | undefined) => {
        const allKeyElements = document.querySelectorAll('[data-key-id]');
        console.log('Found DOM elements with data-key-id:', allKeyElements.length);
        allKeyElements.forEach((el, index) => {
            const keyId = el.getAttribute('data-key-id');
            console.log(`  Element ${index}: data-key-id="${keyId}"`);
        });

        if (expiredKids && expiredKids.length > 0) {
            console.log('Highlighting expired keys with blinking animation:', expiredKids);

            document.querySelectorAll('[data-key-id]').forEach((el) => {
                (el as HTMLElement).classList.remove('jwk-expired-highlight');
            });

            setTimeout(() => {
                expiredKids.forEach((kid: string, index: number) => {
                    const el = document.querySelector(`[data-key-id="${kid}"]`);
                    console.log(`Looking for element with data-key-id="${kid}":`, el);
                    
                    if (el) {
                        setTimeout(() => {
                            console.log(`Adding highlight to key: ${kid}`);
                            el.classList.add('jwk-expired-highlight');

                            if (index === 0) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }

                            setTimeout(() => {
                                console.log(`Removing highlight from key: ${kid}`);
                                el.classList.remove('jwk-expired-highlight');
                            }, 8000);
                        }, index * 300);
                    } else {
                        console.warn('DOM-element for nøkkel ikke funnet:', kid);
                        console.log('Available elements:', document.querySelectorAll('[data-key-id]'));
                    }
                });
            }, 200);
        } else {
            console.log('ℹNo expired keys found by isExpired function');

            if (allKeyElements.length > 0) {
                console.log('TEST MODE: Highlighting all keys for 3 seconds since no expired keys found');
                allKeyElements.forEach((el, index) => {
                    setTimeout(() => {
                        el.classList.add('jwk-expired-highlight');
                        setTimeout(() => {
                            el.classList.remove('jwk-expired-highlight');
                        }, 3000);
                    }, index * 200);
                });
            } else {
                console.log('ℹNo key DOM elements to highlight');
            }
        }
    };

    /**
     * Highlights lifetime fields based on scope conflicts or response-detected conflicts
     */
    const highlightLifetimeFields = useCallback((context: any, hasResponseConflicts: boolean = false) => {
        console.log('Starting highlightLifetimeFields function');
        console.log('Context for lifetime field highlighting:', context);

        const now = Date.now();
        const timeSinceLastHighlight = now - lastHighlightTimeRef.current;
        const shouldSkipDueToRecentHighlight = timeSinceLastHighlight < 10000;

        if (shouldSkipDueToRecentHighlight) {
            console.log('🚫 Skipping lifetime field highlighting - recently highlighted:', {
                timeSinceLastHighlight,
                lastHighlightTime: new Date(lastHighlightTimeRef.current).toISOString()
            });
            return;
        }

        const scopeConflicts = context?.scopeConflicts || [];
        console.log('🔍 Found scope conflicts for lifetime fields:', scopeConflicts);
        console.log('🔍 Response indicates conflicts:', hasResponseConflicts);

        if (scopeConflicts.length === 0 && !hasResponseConflicts) {
            console.log('No scope conflicts found and no response conflicts - no lifetime fields to highlight');
            return;
        }

        lastHighlightTimeRef.current = now;
        console.log('Updated last highlight time:', new Date(now).toISOString());

        document.querySelectorAll('[data-field-type]').forEach((el) => {
            (el as HTMLElement).classList.remove(
                'lifetime-field-conflict-highlight',
                'access-token-conflict-highlight', 
                'authorization-conflict-highlight'
            );
        });

        const accessTokenConflicts = scopeConflicts.filter((c: any) => c.type === 'access_token_lifetime_conflict');
        const authorizationConflicts = scopeConflicts.filter((c: any) => c.type === 'authorization_lifetime_conflict');

        console.log('Conflict breakdown:', {
            accessTokenConflicts: accessTokenConflicts.length,
            authorizationConflicts: authorizationConflicts.length,
            hasResponseConflicts,
            willHighlightBoth: hasResponseConflicts
        });

        setTimeout(() => {
            const shouldHighlightAccessToken = accessTokenConflicts.length > 0 || hasResponseConflicts;
            const shouldHighlightAuthorization = authorizationConflicts.length > 0 || hasResponseConflicts;

            if (shouldHighlightAccessToken) {
                const accessTokenField = document.querySelector('[data-field-type="access_token_lifetime"]');
                if (accessTokenField) {
                    console.log('Highlighting access token lifetime field (response-triggered)');
                    console.log('Element details before highlighting:', {
                        tagName: accessTokenField.tagName,
                        className: accessTokenField.className,
                        id: accessTokenField.id,
                        attributes: Array.from(accessTokenField.attributes).map(attr => `${attr.name}="${attr.value}"`),
                        computedStyle: window.getComputedStyle(accessTokenField)
                    });
                    
                    (accessTokenField as HTMLElement).classList.add('access-token-conflict-highlight');

                    void (accessTokenField as HTMLElement).offsetHeight;
                    
                    console.log('Class added - element details after highlighting:', {
                        className: accessTokenField.className,
                        hasClass: accessTokenField.classList.contains('access-token-conflict-highlight'),
                        computedBackground: window.getComputedStyle(accessTokenField).backgroundColor,
                        computedBorder: window.getComputedStyle(accessTokenField).border,
                        computedOutline: window.getComputedStyle(accessTokenField).outline,
                        computedBoxShadow: window.getComputedStyle(accessTokenField).boxShadow
                    });

                    accessTokenField.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    setTimeout(() => {
                        (accessTokenField as HTMLElement).classList.remove('access-token-conflict-highlight');
                        console.log('Removed highlighting from access token field');
                    }, 8000);
                } else {
                    console.warn('Access token lifetime field not found in DOM');

                    const altSelectors = [
                        '[name="access_token_lifetime"]',
                        '[id*="access_token"]',
                        '[data-testid*="access-token"]',
                        'input[placeholder*="access token"]'
                    ];
                    
                    for (const selector of altSelectors) {
                        const altField = document.querySelector(selector);
                        if (altField) {
                            console.log(`Found access token field with alternative selector: ${selector}`);
                            (altField as HTMLElement).classList.add('access-token-conflict-highlight');
                            setTimeout(() => {
                                (altField as HTMLElement).classList.remove('access-token-conflict-highlight');
                            }, 8000);
                            break;
                        }
                    }
                }
            }

            if (shouldHighlightAuthorization) {
                const authorizationField = document.querySelector('[data-field-type="authorization_lifetime"]');
                if (authorizationField) {
                    console.log('Highlighting authorization lifetime field (response-triggered)');
                    console.log('Element details before highlighting:', {
                        tagName: authorizationField.tagName,
                        className: authorizationField.className,
                        id: authorizationField.id,
                        attributes: Array.from(authorizationField.attributes).map(attr => `${attr.name}="${attr.value}"`),
                        computedStyle: window.getComputedStyle(authorizationField)
                    });
                    
                    (authorizationField as HTMLElement).classList.add('authorization-conflict-highlight');

                    void (authorizationField as HTMLElement).offsetHeight;
                    
                    console.log('Class added - element details after highlighting:', {
                        className: authorizationField.className,
                        hasClass: authorizationField.classList.contains('authorization-conflict-highlight'),
                        computedBackground: window.getComputedStyle(authorizationField).backgroundColor,
                        computedBorder: window.getComputedStyle(authorizationField).border,
                        computedOutline: window.getComputedStyle(authorizationField).outline,
                        computedBoxShadow: window.getComputedStyle(authorizationField).boxShadow
                    });

                    if (!shouldHighlightAccessToken) {
                        authorizationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    setTimeout(() => {
                        (authorizationField as HTMLElement).classList.remove('authorization-conflict-highlight');
                        console.log('Removed highlighting from authorization field');
                    }, 8000);
                } else {
                    console.warn('Authorization lifetime field not found in DOM');

                    const altSelectors = [
                        '[name="authorization_max_lifetime"]',
                        '[id*="authorization"]',
                        '[data-testid*="authorization"]',
                        'input[placeholder*="authorization"]'
                    ];
                    
                    for (const selector of altSelectors) {
                        const altField = document.querySelector(selector);
                        if (altField) {
                            console.log(`Found authorization field with alternative selector: ${selector}`);
                            (altField as HTMLElement).classList.add('authorization-conflict-highlight');
                            setTimeout(() => {
                                (altField as HTMLElement).classList.remove('authorization-conflict-highlight');
                            }, 8000);
                            break;
                        }
                    }
                }
            }

            if (hasResponseConflicts && !document.querySelector('[data-field-type]')) {
                console.log('No specific lifetime fields found, trying to highlight form areas');
                const formElements = document.querySelectorAll('form, .form-section, .client-settings');
                formElements.forEach((form, index) => {
                    if (index < 2) {
                        (form as HTMLElement).classList.add('lifetime-field-conflict-highlight');
                        setTimeout(() => {
                            (form as HTMLElement).classList.remove('lifetime-field-conflict-highlight');
                        }, 6000);
                    }
                });
            }
        }, 300);
    }, []);

    /**
     * Highlights scope conflicts in the UI with blinking animation
     */
    const highlightScopeConflicts = useCallback((context: any) => {
        console.log('Starting highlightScopeConflicts function');
        console.log('Context for scope conflicts:', context);

        const scopeConflicts = context?.scopeConflicts || [];
        console.log('Found scope conflicts:', scopeConflicts);

        if (scopeConflicts.length === 0) {
            console.log('ℹNo scope conflicts found');
            return;
        }

        const conflictingScopeNames = scopeConflicts.map((conflict: any) => conflict.scopeName);
        console.log('⚠Highlighting scopes with conflicts:', conflictingScopeNames);

        document.querySelectorAll('[data-scope-name]').forEach((el) => {
            (el as HTMLElement).classList.remove('scope-conflict-highlight');
        });

        setTimeout(() => {
            conflictingScopeNames.forEach((scopeName: string, index: number) => {
                const selectors = [
                    `[data-scope-name="${scopeName}"]`,
                    `[data-scope="${scopeName}"]`,
                    `[data-testid="scope-${scopeName}"]`,
                    `[title*="${scopeName}"]`
                ];

                let scopeElement = null;
                for (const selector of selectors) {
                    scopeElement = document.querySelector(selector);
                    if (scopeElement) break;
                }

                if (!scopeElement) {
                    const allElements = document.querySelectorAll('*');
                    for (const el of allElements) {
                        if (el.textContent && el.textContent.includes(scopeName)) {
                            scopeElement = el;
                            break;
                        }
                    }
                }

                console.log(`Looking for scope element '${scopeName}':`, scopeElement);
                
                if (scopeElement) {
                    setTimeout(() => {
                        console.log(`Adding conflict highlight to scope: ${scopeName}`);
                        scopeElement.classList.add('scope-conflict-highlight');

                        if (index === 0) {
                            scopeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }

                        setTimeout(() => {
                            console.log(`Removing conflict highlight from scope: ${scopeName}`);
                            scopeElement.classList.remove('scope-conflict-highlight');
                        }, 8000);
                    }, index * 300);
                } else {
                    console.warn('DOM-element for scope ikke funnet:', scopeName);
                }
            });
        }, 200);
    }, []);

    /**
     * Sets up event listeners for tab clicks to highlight issues
     */
    useEffect(() => {
        const handleTabClick = (event: Event) => {
            const target = event.target as HTMLElement;
            const keysTabElement = target.closest('[data-tab-id="keys"]');
            const scopesTabElement = target.closest('[data-tab-id="scopes"]') || 
                                   target.closest('[role="tab"]')?.textContent?.toLowerCase().includes('scope') ? target.closest('[role="tab"]') : null;
            const detailsTabElement = target.closest('[data-tab-id="details"]') ||
                                    (target.closest('[role="tab"]')?.textContent?.toLowerCase().includes('detaljer') ? target.closest('[role="tab"]') : null) ||
                                    (target.closest('[role="tab"]')?.textContent?.toLowerCase().includes('details') ? target.closest('[role="tab"]') : null);
            
            const currentContext = lockedContext || context;
            
            if (keysTabElement && currentContext) {
                console.log('Keys tab clicked - checking for expired keys');
                highlightExpiredKeys(currentContext);
            }
            
            if (scopesTabElement && currentContext) {
                console.log('Scopes tab clicked - checking for scope conflicts');
                highlightScopeConflicts(currentContext);
            }
            
            if (detailsTabElement && currentContext) {
                console.log('Details tab clicked - checking for lifetime field conflicts');
                highlightLifetimeFields(currentContext);
            }
        };

        document.addEventListener('click', handleTabClick);

        return () => {
            document.removeEventListener('click', handleTabClick);
        };
    }, [context, lockedContext, highlightExpiredKeys, highlightScopeConflicts, highlightLifetimeFields]);

    /**
     * Handles the submission of a question to the AI assistant.
     *
     * @param e - The event triggered by the form submission or key press.
     */
    const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        const contextToUse = context;
        setLockedContext(contextToUse);

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

        if (activeRequest) {
            activeRequest.abort();
        }

        const newAbortController = new AbortController();
        setActiveRequest(newAbortController);

        console.log('Pre-processing user question for highlighting:', question);

        const lowerQuestion = question.toLowerCase();
        const questionIndicatesLifetimeConflicts = 
            lowerQuestion.includes('access tokens utløper før') ||
            lowerQuestion.includes('access token') && lowerQuestion.includes('utløper') ||
            lowerQuestion.includes('access token') && lowerQuestion.includes('før') ||
            lowerQuestion.includes('levetid') && lowerQuestion.includes('konflikt') ||
            lowerQuestion.includes('lifetime') && lowerQuestion.includes('problem') ||
            lowerQuestion.includes('logger ut') && lowerQuestion.includes('tidligere') ||
            lowerQuestion.includes('innstilling') && lowerQuestion.includes('før');
            
        if (questionIndicatesLifetimeConflicts) {
            console.log('Question indicates lifetime conflicts - triggering preemptive highlighting');
            await handleScopeConflictHighlighting(question, contextToUse, true);
        } else {
            await handleScopeConflictHighlighting(question, contextToUse, false);
        }

        try {
            const testSerialization = JSON.stringify(contextToUse);
            console.log('handleSubmit: Context serialization test successful', {
                sizeKB: (testSerialization.length / 1024).toFixed(2),
                question: question
            });
        } catch (serializationError) {
            console.error('handleSubmit: Context serialization failed', {
                error: serializationError,
                contextKeys: contextToUse ? Object.keys(contextToUse) : []
            });
            setMessages(prev => [
                ...prev,
                { 
                    id: uuidv4(), 
                    sender: 'bot', 
                    text: 'Error: Context data cannot be serialized. Please try again.' 
                },
            ]);
            setLoading(false);
            setActiveRequest(null);
            return;
        }

        try {
            const result = await ChatbotService.askChatbot(question, contextToUse, newAbortController);

            if (newAbortController.signal.aborted) {
                return;
            }

            const responseText = result.answer.toLowerCase();
            const hasResponseConflicts =
                responseText.includes('kortere levetid') ||
                responseText.includes('utløper før') ||
                responseText.includes('lavere enn klientens') ||
                responseText.includes('access tokens utløper før') ||
                responseText.includes('utløpe tidligere') ||
                responseText.includes('konflikt') ||
                responseText.includes('problem') ||
                responseText.includes('feil med levetid') ||
                responseText.includes('lifetime') ||
                responseText.includes('logger ut tidligere') ||
                responseText.includes('tidligere enn forventet') ||
                responseText.includes('at_max_age') ||
                responseText.includes('access_token_lifetime') ||
                responseText.includes('authorization_max_lifetime') ||
                (responseText.includes('scope') && (
                    responseText.includes('120') || 
                    responseText.includes('300') ||
                    responseText.includes('sekunder') ||
                    responseText.includes('minutter')
                ));

            console.log('Enhanced chatbot response conflict analysis:', {
                hasResponseConflicts,
                responseSnippet: responseText.substring(0, 300) + '...',
                contextConflictsCount: contextToUse?.scopeConflicts?.length || 0,
                matchedPatterns: [
                    responseText.includes('kortere levetid') && 'kortere levetid',
                    responseText.includes('utløper før') && 'utløper før',
                    responseText.includes('access tokens utløper før') && 'access tokens utløper før',
                    responseText.includes('konflikt') && 'konflikt',
                    responseText.includes('lifetime') && 'lifetime'
                ].filter(Boolean)
            });
            
            await handleTypingAnimation(result.answer, newAbortController);
            await handleKeyHighlighting(question, contextToUse);

            if (hasResponseConflicts) {
                console.log('Response contains conflict indicators - doing additional highlighting');
                await handleScopeConflictHighlighting(question, contextToUse, hasResponseConflicts);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Chatbot request was aborted');
                return;
            }

            console.error('handleSubmit: Error details', {
                question: question,
                contextPage: contextToUse?.page,
                contextKeys: contextToUse ? Object.keys(contextToUse) : [],
                hasScopeConflicts: !!contextToUse?.scopeConflicts,
                scopeConflictsCount: contextToUse?.scopeConflicts?.length || 0,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            });

            let userMessage = '';
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes('Browser CORS issue') || errorMessage.includes('Failed to fetch')) {
                userMessage = 'Kan ikke nå AI-assistenten akkurat nå. Prøv å oppdatere siden (Ctrl+F5) eller åpne i privat vindu.';
            } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
                userMessage = 'AI-assistenten er midlertidig utilgjengelig. Prøv igjen om litt.';
            } else {
                userMessage = 'Kunne ikke få svar fra AI-assistenten. Prøv igjen.';
            }

            setMessages(prev => [
                ...prev,
                { id: uuidv4(), sender: 'bot', text: userMessage },
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
                <img 
                    src="/logo.png" 
                    alt="DesKI Logo" 
                    className="ai-button-logo"
                    onLoad={(e) => {
                        console.log('Logo loaded successfully!');
                        console.log('Image element:', e.target);
                        console.log('Image src:', (e.target as HTMLImageElement).src);
                        console.log('Image dimensions:', {
                            width: (e.target as HTMLImageElement).width,
                            height: (e.target as HTMLImageElement).height,
                            naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                            naturalHeight: (e.target as HTMLImageElement).naturalHeight
                        });
                    }}
                    onError={(e) => {
                        console.log('Logo failed to load!');
                        console.log('Error target:', e.target);
                        console.log('Attempted src:', (e.target as HTMLImageElement).src);
                        console.log('Error event:', e);
                        
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const button = target.parentElement;
                        if (button) {
                            console.log('Setting fallback text to button');
                            button.innerHTML = '<span style="color: white; font-size: 14px;">DesKI</span>';
                        }
                    }}
                />
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
                        
                        {}
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
                        
                        {}
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
                        disabled={loading}
                        onClick={() => {
                            if (activeRequest) {
                                activeRequest.abort();
                                setActiveRequest(null);
                            }
                            setLoading(false);
                            setMessages([]);
                            setLockedContext(null);
                            lastContextLabelRef.current = null;
                            lastContextMessageRef.current = null;

                            try {
                                sessionStorage.removeItem(CONTEXT_MESSAGE_KEY);
                                sessionStorage.removeItem(CONTEXT_LABEL_KEY);
                                sessionStorage.removeItem('ai_assistant_locked_context');
                            } catch (error) {
                                console.warn('Session storage cleanup failed:', error);
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
