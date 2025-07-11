import { useState } from 'react';
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
    const [response, setResponse] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const openAiPanel = () => setAiPanelOpen(true);
    const closeAiPanel = () => setAiPanelOpen(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        try {
            console.log('AiAssistant: Starting chatbot request', { question: question.substring(0, 50) + '...' });
            const result = await ChatbotService.askChatbot(question, context);
            console.log('AiAssistant: Chatbot request successful');
            setResponse(result.answer);
        } catch (error) {
            console.error('AiAssistant: Chatbot request failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            setResponse('Error: Could not get response from chatbot');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={openAiPanel}
                type="button"
                className="ai-button"
                title="Åpne AI-hjelp"
            >
        🤖 DesKI
            </button>

            {aiPanelOpen && (
                <div className="ai-panel">
                    <div className="ai-panel-header">
                        <h3 className="ai-panel-title">DesKI Assistant</h3>
                        <button onClick={closeAiPanel} className="ai-panel-close">
                            X
                        </button>
                    </div>

                    <div className="ai-response">
                        {response ? (
                            <p>{response}</p>
                        ) : (
                            <p className="text-gray-400">Ask me something...</p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="ai-form">
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
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
            )}
        </>
    );
}