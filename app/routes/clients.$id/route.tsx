import { ClientActionFunctionArgs, ClientLoaderFunctionArgs, redirect, useLoaderData } from 'react-router';
import { Tabs } from '@digdir/designsystemet-react';
import { useState } from 'react';

import { useTranslation } from '~/lib/i18n';
import { ApiClient, ApiResponse } from '~/lib/api_client';
import Scopes from '~/routes/clients.$id/scopes';
import Keys from '~/routes/clients.$id/keys';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { ClientOnBehalfOf } from '~/lib/models';
import AlertWrapper from '~/components/util/AlertWrapper';
import { isErrorResponse } from '~/lib/errors';
import { ClientService, IntegrationType } from '~/lib/clients';
import { Authorization } from '~/lib/auth';
import { StatusColor, StatusMessage } from '~/lib/status';

import Details from './details';
import OnBehalfOf from './onBehalfOf';
import { ActionIntent } from './actions';
import AiPanel from '~/components/AiPanel';
/**
 * Interface for the chatbot response structure.
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

            // Resten av koden forblir den samme...
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

/**
 * Loads client data and related resources for the client details page. Requires authenticated user.
 * @param params - The route parameters, including the client ID.
 */
export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
    await Authorization.requireAuthenticatedUser();
    const clientId = params.id!;
    const apiClient = await ApiClient.create();

    const { data: client, error } = await apiClient.getClient(clientId);

    if (error) {
        return error.toErrorResponse();
    }

    const actualIntegrationType = client.integration_type === 'api_klient' ? 'api_client' : client.integration_type;

    const JWK = await apiClient.getJwks(client.client_id!);

    const scopesAccessibleForAll = apiClient.getAccessibleForAllScopes(actualIntegrationType!);
    const scopesWithDelegationSource = apiClient.getScopesWithDelegationSource(actualIntegrationType!);
    const scopesAvailableToOrganization = apiClient.getScopesAccessibleToUsersOrganization();

    const { data: onBehalfOf } = await apiClient.getAllOnBehalfOf(client.client_id!);

    return {
        client,
        JWK: JWK.data ?? [],
        onBehalfOf,
        scopesAccessibleForAll,
        scopesWithDelegationSource,
        scopesAvailableToOrganization
    };
}

/**
 * Handles client deletion action.
 */
async function handleDeleteClient(clientService: ClientService, clientId: string) {
    const apiResponse = await clientService.deleteClient(clientId);
    if (!apiResponse.error) {
        StatusMessage.set('client_page.successful_delete', StatusColor.success);
        return { redirect: '/clients' };
    }
    return { apiResponse };
}

/**
 * Handles client update action.
 */
async function handleUpdateClient(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.updateClient(clientId, formData);
    const statusMessage = !apiResponse.error ? 'client_page.successful_update' : '';
    return { apiResponse, statusMessage };
}

/**
 * Handles add key action.
 */
async function handleAddKey(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.addKey(clientId, formData.get('jwk') as string);
    const statusMessage = !apiResponse.error ? 'client_page.successful_jwk_add' : '';
    return { apiResponse, statusMessage };
}

/**
 * Handles add scope action.
 */
async function handleAddScope(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.addScope(clientId, formData.getAll('scopes') as string[]);
    const statusMessage = !apiResponse.error ? 'client_page.successful_scope_add' : '';
    return { apiResponse, statusMessage };
}

/**
 * Handles OnBehalfOf actions (add, edit, delete).
 */
async function handleOnBehalfOfActions(clientService: ClientService, clientId: string, formData: FormData, intent: string) {
    let apiResponse: ApiResponse<any>;
    let messageKey: string;

    switch (intent) {
    case ActionIntent.AddOnBehalfOf:
        apiResponse = await clientService.addOnBehalfOf(clientId, Object.fromEntries(formData.entries()) as ClientOnBehalfOf);
        messageKey = 'client_page.successful_onbehalfof_create';
        break;
    case ActionIntent.EditOnBehalfOf:
        apiResponse = await clientService.editOnBehalfOf(clientId, Object.fromEntries(formData.entries()) as ClientOnBehalfOf);
        messageKey = 'client_page.successful_onbehalfof_edit';
        break;
    case ActionIntent.DeleteOnBehalfOf:
        apiResponse = await clientService.removeOnBehalfOf(clientId, formData.get('onBehalfOf') as string);
        messageKey = 'client_page.successful_onbehalfof_delete';
        break;
    default:
        return { apiResponse: undefined };
    }

    if (!apiResponse.error) {
        StatusMessage.set(messageKey, StatusColor.success, formData.get('name') as string);
    }
    return { apiResponse };
}

/**
 * Handles client actions such as updating, deleting, or adding keys and scopes.
 */
export async function clientAction({ request, params }: ClientActionFunctionArgs) {
    const clientId = params.id!;
    const formData = await request.formData();
    const clientService = await ClientService.create();
    const intent = formData.get('intent') as string;

    let result: { apiResponse?: ApiResponse<any>; statusMessage?: string; redirect?: string } = {};

    switch (intent) {
    case ActionIntent.DeleteClient:
        result = await handleDeleteClient(clientService, clientId);
        if (result.redirect) return redirect(result.redirect);
        break;
    case ActionIntent.UpdateClient:
        result = await handleUpdateClient(clientService, clientId, formData);
        break;
    case ActionIntent.AddKey:
        result = await handleAddKey(clientService, clientId, formData);
        break;
    case ActionIntent.AddScopeToClient:
        result = await handleAddScope(clientService, clientId, formData);
        break;
    case ActionIntent.AddOnBehalfOf:
    case ActionIntent.EditOnBehalfOf:
    case ActionIntent.DeleteOnBehalfOf:
        result = await handleOnBehalfOfActions(clientService, clientId, formData, intent);
        break;
    case ActionIntent.DeleteKey:
        result.apiResponse = await clientService.deleteJwk(clientId, formData.get('kid') as string);
        result.statusMessage = !result.apiResponse.error ? 'client_page.successful_jwk_delete' : '';
        break;
    case ActionIntent.DeleteScopeFromClient:
        result.apiResponse = await clientService.removeScope(clientId, formData.get('scope') as string);
        result.statusMessage = !result.apiResponse.error ? 'client_page.successful_scope_delete' : '';
        break;
    case ActionIntent.GenerateSecret:
        result.apiResponse = await clientService.generateClientSecret(clientId);
        if (!result.apiResponse.error) {
            StatusMessage.set('client_page.generate_secret_success', StatusColor.success);
            return { client_secret: result.apiResponse.data.client_secret };
        }
        break;
    default:
        return null;
    }

    if (result.apiResponse?.error) {
        return { error: result.apiResponse.error.userMessage };
    }

    if (result.statusMessage) {
        StatusMessage.set(result.statusMessage, StatusColor.success);
    }

    return result.apiResponse?.data ? { data: result.apiResponse.data } : null;
}

/**
 * ClientPage component displays the details of a client, including its keys, scopes, and on-behalf-of configurations.
 */
export default function ClientPage() {
    const { t } = useTranslation();
    const data = useLoaderData<typeof clientLoader>();

    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState<string>('');
    const [loading, setLoading] = useState(false);

    if (isErrorResponse(data)) {
        return <AlertWrapper message={data.error} type="error"/>;
    }

    const { client, JWK, onBehalfOf, scopesAccessibleForAll, scopesWithDelegationSource, scopesAvailableToOrganization } = data;

    const openAiPanel = () => {
        setAiPanelOpen(true);
    };

    const closeAiPanel = () => {
        setAiPanelOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        try {
            console.log('ClientPage: Starting chatbot request', { question: question.substring(0, 50) + '...' });

            // Await dataene før du bruker dem
            const [
                scopesAccessibleForAllData,
                scopesWithDelegationSourceData,
                scopesAvailableToOrganizationData
            ] = await Promise.all([
                scopesAccessibleForAll,
                scopesWithDelegationSource,
                scopesAvailableToOrganization
            ]);

            const context = {
                client: {
                    client_id: client.client_id,
                    client_name: client.client_name,
                    integration_type: client.integration_type,
                    scopes: client.scopes
                },
                jwkCount: JWK?.length || 0,
                onBehalfOfCount: onBehalfOf?.length || 0,
                availableScopes: {
                    accessibleForAll: scopesAccessibleForAllData.data?.length || 0,
                    withDelegationSource: scopesWithDelegationSourceData.data?.length || 0,
                    availableToOrganization: scopesAvailableToOrganizationData.data?.length || 0
                }
            };

            const result = await ChatbotService.askChatbot(question, context);
            console.log('ClientPage: Chatbot request successful');
            setResponse(result.answer);
        } catch (error) {
            console.error('ClientPage: Chatbot request failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            setResponse('Error: Could not get response from chatbot');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Render the client details page with a fixed AI button and side panel for chatbot interaction.
     */
    return (
        <div className="relative">
            {/* Fixed AI-flytknapp med secondary + blå hover */}
            <button
            onClick={openAiPanel}
            type="button"
            className="absolute top-3 left-56 z-50 w-28 h-12 rounded-full ds-button items-center justify-center transition-colors duration-200"
            title="Åpne AI-hjelp"
            >
                🤖 DesKI
            </button>

            {/*clientName={client.client_name ?? ''}*/}
            <AiPanel isOpen={aiPanelOpen} onClose={closeAiPanel} />

            <Tabs defaultValue="details">
                <Tabs.List className="top-0 z-10 bg-gray grid grid-cols-12 border-none">
                    <div className='col-span-12'>
                        <HeadingWrapper level={2} translate={false} heading={client.client_name ?? ''} className="py-4 bg-gray truncate block overflow-ellipsis"/>
                    </div>
                    <div className='col-span-12 flex'>
                        <Tabs.Tab value="details" className="py-4 px-8 border-solid border-b">
                            {t('client_page.details')}
                        </Tabs.Tab>
                        <Tabs.Tab value="keys" className="py-4 px-8 border-solid border-b">
                            {t('key', { count: 0 })}
                        </Tabs.Tab>
                        <Tabs.Tab value="scopes" className="py-4 px-8 border-solid border-b">
                            {t('scope', { count: 0 })}
                        </Tabs.Tab>
                        {(client.integration_type === IntegrationType.IDPORTEN || client.integration_type === IntegrationType.API_KLIENT || client.integration_type === IntegrationType.KRR) && (
                            <Tabs.Tab value="onBehalfOf" className="py-4 px-8 border-solid border-b">
                                OnBehalfOf
                            </Tabs.Tab>
                        )}
                    </div>
                </Tabs.List>

                <Tabs.Panel value="details" className="p-0">
                    <Details client={client}/>
                </Tabs.Panel>
                <Tabs.Panel value="keys" className="p-0">
                    <Keys jwks={JWK ?? []}/>
                </Tabs.Panel>
                <Tabs.Panel value="scopes" className="p-0">
                    <Scopes
                        scopes={client.scopes ?? []}
                        scopesAccessibleForAll={scopesAccessibleForAll}
                        scopesWithDelegationSource={scopesWithDelegationSource}
                        scopesAvailableToOrganization={scopesAvailableToOrganization}
                        clientIntegrationType={client.integration_type}
                    />
                </Tabs.Panel>
                <Tabs.Panel value="onBehalfOf" className="p-0">
                    <OnBehalfOf onBehalfOfs={onBehalfOf!}/>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}