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

    return { client, JWK: JWK.data ?? [], onBehalfOf, scopesAccessibleForAll, scopesWithDelegationSource, scopesAvailableToOrganization };
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

    return (
        <div className="relative">
            <button
                onClick={openAiPanel}
                className="ds-button col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-3"
                data-variant="secondary"
                type="button"
            >
                Open Ai-Panel
            </button>

            {aiPanelOpen && (
                <div className="fixed right-0 top-[64px] h-[calc(100%-64px)] w-full max-w-md bg-white shadow-lg border-l border-gray-300 z-50 overflow-y-auto">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-semibold">AI Panel</h2>
                        <button
                            onClick={closeAiPanel}
                            className="ds-button col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-3"
                            data-variant="secondary"
                            type="button"
                        >
                            X
                        </button>
                    </div>
                    <div className="p-4">
                        {/* Her kan du legge inn hva du vil */}
                        <p>This is the AI panel for: <strong>{client.client_name}</strong></p>
                        <p>Legg til AI-funksjonalitet her ✨</p>
                    </div>
                </div>
            )}

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
