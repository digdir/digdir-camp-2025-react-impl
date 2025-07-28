import {ClientActionFunctionArgs, ClientLoaderFunctionArgs, Outlet, redirect, useLoaderData} from 'react-router';
import { Tabs } from '@digdir/designsystemet-react';
import { useEffect } from 'react';

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
import { ContextBuilder } from '~/lib/context-builder';
import AiAssistant, { useAiAssistantContext } from '~/components/ai/AiAssistant';

import '~/styles/client-page.css';

import Details from './details';
import OnBehalfOf from './onBehalfOf';
import { ActionIntent } from './actions';

/**
 * Loader function for the client page. Fetches client details, JWKs, scopes, and onBehalfOf information.
 *
 * @param params - The parameters from the route, including the client ID.
 */
export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
    await Authorization.requireAuthenticatedUser();
    const clientId = params.id!;
    const apiClient = await ApiClient.create();
    const { data: client, error } = await apiClient.getClient(clientId);

    if (error) {
        return error.toErrorResponse();
    }

    const actualIntegrationType = 'ID_PORTEN';
    const JWK = await apiClient.getJwks(client.client_id!);
    const { data: scopesAccessibleForAll, error: error1 } = await apiClient.apiClient.GET('/api/v1/scopes/all', {
        params: {
            query: {
                accessible_for_all: true,
                integration_type: actualIntegrationType
            }
        }
    });

    if (error1) {
        console.error('Error fetching scopesAccessibleForAll:', error1);
    }

    const { data: scopesWithDelegationSource, error: error2 } = await apiClient.apiClient.GET('/api/v1/scopes/all', {
        params: {
            query: {
                delegated_sources: true,
                integration_type: actualIntegrationType
            }
        }
    });

    if (error2) {
        console.error('Error fetching scopesWithDelegationSource:', error2);
    }

    const { data: scopesAvailableToOrganization, error: error3 } = await apiClient.getScopesAccessibleToUsersOrganization();

    if (error3) {
        console.error('Error fetching scopesAvailableToOrganization:', error3);
    }

    const { data: onBehalfOf } = await apiClient.getAllOnBehalfOf(client.client_id!);

    return {
        client,
        JWK: JWK.data ?? [],
        onBehalfOf,
        scopesAccessibleForAll: scopesAccessibleForAll ?? [],
        scopesWithDelegationSource: scopesWithDelegationSource ?? [],
        scopesAvailableToOrganization: scopesAvailableToOrganization ?? []
    };
}

/**
 * Handles the deletion of a client.
 *
 * @param clientService - The service to manage client operations.
 * @param clientId - The ID of the client to be deleted.
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
 * Handles the update of a client.
 *
 * @param clientService - The service to manage client operations.
 * @param clientId - The ID of the client to be updated.
 * @param formData - The form data containing the updated client information.
 */
async function handleUpdateClient(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.updateClient(clientId, formData);
    const statusMessage = !apiResponse.error ? 'client_page.successful_update' : '';

    return { apiResponse, statusMessage };
}

/**
 * Handles the addition of a JWK (JSON Web Key) to a client.
 *
 * @param clientService - The service to manage client operations.
 * @param clientId - The ID of the client to which the JWK will be added.
 * @param formData - The form data containing the JWK to be added.
 */
async function handleAddKey(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.addKey(clientId, formData.get('jwk') as string);
    const statusMessage = !apiResponse.error ? 'client_page.successful_jwk_add' : '';

    return { apiResponse, statusMessage };
}

/**
 * Handles the addition of a scope to a client.
 *
 * @param clientService - The service to manage client operations.
 * @param clientId - The ID of the client to which the scope will be added.
 * @param formData - The form data containing the scopes to be added.
 */
async function handleAddScope(clientService: ClientService, clientId: string, formData: FormData) {
    const apiResponse = await clientService.addScope(clientId, formData.getAll('scopes') as string[]);
    const statusMessage = !apiResponse.error ? 'client_page.successful_scope_add' : '';
    return { apiResponse, statusMessage };
}

/**
 * Handles actions related to "On Behalf Of" functionality for a client.
 *
 * @param clientService - The service to manage client operations.
 * @param clientId - The ID of the client for which the action is performed.
 * @param formData - The form data containing the details for the "On Behalf Of" action.
 * @param intent - The intent of the action, which can be to add, edit, or delete an "On Behalf Of" entry.
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
 * Handles client actions based on the intent specified in the request.
 *
 * @param request - The request object containing the form data and action intent.
 * @param params - The parameters from the route, including the client ID.
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
 * ClientPage component. This component displays the details of a client, including its keys, scopes, and "On Behalf Of" information.
 *
 * @constructor - The constructor initializes the component state and handles the loading of client data.
 */
export default function ClientPage() {
    const { t } = useTranslation();
    const data = useLoaderData<typeof clientLoader>();
    const { setContext } = useAiAssistantContext();

    const isError = isErrorResponse(data);

    useEffect(() => {
        if (isError) return;

        const loadContext = async () => {
            const builtContext = await ContextBuilder.buildClientContext(
                data.client,
                data.JWK ?? [],
                data.onBehalfOf ?? [],
                data.scopesAccessibleForAll ?? [],
                data.scopesWithDelegationSource ?? [],
                data.scopesAvailableToOrganization ?? []
            );
            console.log('Context JSON:\n', JSON.stringify(builtContext, null, 2));
            const staticContext = {
                page: 'client-details',
                info: 'Dette er selvbetjening forsiden'
            };
            setContext({ ...builtContext, ...staticContext });
        };
        void loadContext();
    }, [data, isError, setContext]);

    if (isError) {
        return <AlertWrapper message={data.error} type="error" />;
    }

    const {
        client,
        JWK,
        onBehalfOf,
        scopesAccessibleForAll,
        scopesWithDelegationSource,
        scopesAvailableToOrganization
    } = data;

    /**
     * Renders the client page with tabs for details, keys, scopes, and "On Behalf Of" information.
     */
    return (
        <div className="relative">
            <AiAssistant />
            <Outlet />

            <Tabs defaultValue="details">
                <Tabs.List className="tabs-list">
                    <div className="tabs-heading">
                        <HeadingWrapper
                            level={2}
                            translate={false}
                            heading={client.client_name ?? ''}
                            className="tabs-heading-wrapper"
                        />
                    </div>
                    <div className="tabs-container">
                        <Tabs.Tab value="details" className="tab-item">
                            {t('client_page.details')}
                        </Tabs.Tab>
                        <Tabs.Tab value="keys" className="tab-item" data-tab-id="keys">
                            {t('key', { count: JWK.length })}
                        </Tabs.Tab>
                        <Tabs.Tab value="scopes" className="tab-item">
                            {t('scope', { count: 0 })}
                        </Tabs.Tab>
                        {(client.integration_type === IntegrationType.IDPORTEN ||
                            client.integration_type === IntegrationType.API_KLIENT ||
                            client.integration_type === IntegrationType.KRR) && (
                            <Tabs.Tab value="onBehalfOf" className="tab-item">
                                OnBehalfOf
                            </Tabs.Tab>
                        )}
                    </div>
                </Tabs.List>

                <Tabs.Panel value="details" className="tabs-panel">
                    <Details client={client} />
                </Tabs.Panel>
                <Tabs.Panel value="keys" className="tabs-panel">
                    <Keys jwks={JWK ?? []} />
                </Tabs.Panel>
                <Tabs.Panel value="scopes" className="tabs-panel">
                    <Scopes
                        scopes={client.scopes ?? []}
                        scopesAccessibleForAll={scopesAccessibleForAll as any}
                        scopesWithDelegationSource={scopesWithDelegationSource as any}
                        scopesAvailableToOrganization={scopesAvailableToOrganization as any}
                        clientIntegrationType={client.integration_type}
                    />
                </Tabs.Panel>
                <Tabs.Panel value="onBehalfOf" className="tabs-panel">
                    <OnBehalfOf onBehalfOfs={onBehalfOf!} />
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
