import { ClientActionFunctionArgs, ClientLoaderFunctionArgs, redirect, useLoaderData } from 'react-router';
import { Tabs } from '@digdir/designsystemet-react';

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

import { useState } from 'react';


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
 * Handles client actions such as updating, deleting, or adding keys and scopes.
 * @param request - The request object containing form data.
 * @param params - The route parameters, including the client ID.
 */
export async function clientAction({ request, params }: ClientActionFunctionArgs) {
    const clientId = params.id!;
    const formData = await request.formData();

    const clientService = await ClientService.create()

    let apiResponse: ApiResponse<any> | null = null;
    let statusMessage = ''

    switch (formData.get('intent') as string) {
    case ActionIntent.DeleteClient:
        apiResponse = await clientService.deleteClient(clientId);
        if (!apiResponse.error) {
            StatusMessage.set('client_page.successful_delete', StatusColor.success)
            return redirect('/clients');
        }
        break;
    case ActionIntent.UpdateClient:
        apiResponse = await clientService.updateClient(clientId, formData);
        if (!apiResponse.error) {
            statusMessage = 'client_page.successful_update'
        }
        break;
    case ActionIntent.AddKey:
        apiResponse = await clientService.addKey(clientId, formData.get('jwk') as string);
        if (!apiResponse.error) {
            statusMessage = 'client_page.successful_jwk_add'
        }
        break;
    case ActionIntent.AddScopeToClient:
        apiResponse = await clientService.addScope(clientId, formData.getAll('scopes') as string[]);
        if (!apiResponse.error) {
            statusMessage = 'client_page.successful_scope_add'
        }
        break;
    case ActionIntent.AddOnBehalfOf:
        apiResponse = await clientService.addOnBehalfOf(clientId, Object.fromEntries(formData.entries()) as ClientOnBehalfOf);
        if (!apiResponse.error) {
            StatusMessage.set('client_page.successful_onbehalfof_create', StatusColor.success, formData.get('name') as string)
        }
        break;
    case ActionIntent.EditOnBehalfOf:
        apiResponse = await clientService.editOnBehalfOf(clientId, Object.fromEntries(formData.entries()) as ClientOnBehalfOf);
        if (!apiResponse.error) {
            StatusMessage.set('client_page.successful_onbehalfof_edit', StatusColor.success, formData.get('name') as string)
        }
        break;
    case ActionIntent.DeleteOnBehalfOf:
        apiResponse = await clientService.removeOnBehalfOf(clientId, formData.get('onBehalfOf') as string);
        if (!apiResponse.error) {
            StatusMessage.set('client_page.successful_onbehalfof_delete', StatusColor.success, formData.get('name') as string)
        }
        break;
    case ActionIntent.DeleteKey:
        apiResponse = await clientService.deleteJwk(clientId, formData.get('kid') as string);
        if (!apiResponse.error) {
            statusMessage = 'client_page.successful_jwk_delete'
        }
        break;
    case ActionIntent.DeleteScopeFromClient:
        apiResponse = await clientService.removeScope(clientId, formData.get('scope') as string);
        if (!apiResponse.error) {
            statusMessage = 'client_page.successful_scope_delete'
        }
        break;
    case ActionIntent.GenerateSecret:
        apiResponse = await clientService.generateClientSecret(clientId);
        if (!apiResponse.error) {
            StatusMessage.set('client_page.generate_secret_success', StatusColor.success)
            return { client_secret: apiResponse.data.client_secret };
        }
        break;
    default:
        return null;
    }

    if (apiResponse.error) {
        return { error: apiResponse.error.userMessage };
    }

    if (statusMessage !== '') {
        StatusMessage.set(statusMessage, StatusColor.success)
    }

    if (apiResponse?.data) {
        return { data: apiResponse.data };
    }

    return null;
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
            
           {/* Fixed AI-flytknapp med secondary + blå hover */}
            <button
            onClick={openAiPanel}
            type="button"
            className="fixed bottom-6 right-6 z-10 w-40 h-28 rounded-full ds-button items-center justify-center text-2xl transition-colors duration-200"
            
            title="Åpne AI-hjelp"
            >
                🤖 DesKI
            </button>

            {/*clientName={client.client_name ?? ''}*/}
            <AiPanel isOpen={aiPanelOpen} onClose={closeAiPanel} />

            <Tabs defaultValue="details">
                <Tabs.List className="top-0 z-10 bg-gray grid grid-cols-12 border-none">
                    <div className='col-span-12'>
                        <HeadingWrapper level={2} translate={false} heading={client.client_name || ''} className="py-4 bg-gray truncate block overflow-ellipsis"/>
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
                        clientIntegrationType={client.integration_type!}
                    />
                </Tabs.Panel>
                <Tabs.Panel value="onBehalfOf" className="p-0">
                    <OnBehalfOf onBehalfOfs={onBehalfOf!}/>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
