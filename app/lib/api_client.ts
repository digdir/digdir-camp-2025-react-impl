import createClient, { Middleware, Client as OpenApiClient } from 'openapi-fetch';
import { redirect } from 'react-router';

import { ApiError } from '~/lib/errors';
import { AddClientRequest, AuthenticatedOrganization, Client, ClientOnBehalfOf, DelegationSource, JWK, Organization, Scope, ScopeAccess, ScopePrefix, UpdateClientRequest } from '~/lib/models';

import { Authorization } from './auth';
import { fetchAppConfig } from './config';
import { StatusColor, StatusMessage } from './status';

import type { paths } from '~/lib/api';

/**
 * Type representing the API response structure.
 */
export type ApiResponse<T> =
    | { data: T; error?: never }
    | { data?: never; error: ApiError };

/**
 * ApiClient class to interact with the OpenAPI-based API.
 */
export class ApiClient {
    readonly apiClient: OpenApiClient<paths>;

    /**
     * Creates an instance of ApiClient.
     * @param apiUrl - The base URL of the API.
     */
    constructor(apiUrl: string) {
        const authMiddleware: Middleware = {
            async onRequest({ request }) {
                const ok = await Authorization.requireValidToken();
                if (!ok) {
                    StatusMessage.set('missing_session_data', StatusColor.danger);
                    throw redirect('/login');
                }
                request.headers.set('Authorization', `Bearer ${Authorization.accessToken}`);
                return request;
            },

            async onResponse({ response }) {
                if (response.status === 401) {
                    throw new Error('Received 401 unauthorized from API');
                }
            },
        };

        this.apiClient = createClient<paths>({ baseUrl: apiUrl });
        this.apiClient.use(authMiddleware);
    }

    /**
     * Creates an instance of ApiClient with the API URL fetched from the app configuration.
     */
    static async create() {
        const appConfig = await fetchAppConfig();
        return new ApiClient(appConfig.apiUrl);
    }

    /**
     * Fetches the API version.
     */
    public async getClients(): Promise<ApiResponse<Client[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/clients', {});

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch clients') };
        }

        return { data };
    }

    /**
     * Fetches a specific client by ID.
     *
     * @param id - The ID of the client to fetch.
     */
    public async getClient(id: string): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.GET('/api/v1/clients/{id}', {
            params: {
                path: { id }
            }
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch client') };
        }

        return { data };
    }

    /**
     * Adds a new client.
     *
     * @param client - The client data to add.
     */
    public async addClient(client: AddClientRequest): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.POST('/api/v1/clients', {
            body: client,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add client') };
        }

        return { data };
    }

    /**
     * Deletes a client by ID.
     *
     * @param clientId - The ID of the client to delete.
     */
    public async deleteClient(clientId: string): Promise<ApiResponse<void>> {
        const { error } = await this.apiClient.DELETE('/api/v1/clients/{id}', {
            params: {
                path: { id: clientId },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to delete client') };
        }

        return { data: undefined };
    }

    /**
     * Updates an existing client.
     *
     * @param client - The client data to update.
     */
    public async updateClient(client: UpdateClientRequest): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.PUT('/api/v1/clients/{id}', {
            params: {
                path: { id: client.client_id! }
            },
            body: client,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to update client') };
        }

        return { data };
    }

    /**
     * Adds a JWK (JSON Web Key) to a client.
     *
     * @param clientId - The ID of the client to which the JWK will be added.
     * @param input - The JWK in string format.
     */
    public async addJwk(clientId: string, input: string): Promise<ApiResponse<JWK>> {
        const { data, error } = await this.apiClient.POST('/api/v2/clients/{clientId}/key', {
            params: {
                path: { clientId },
            },
            body: input,
            bodySerializer(body: any) {
                return body;
            },
            headers: {
                'Content-Type': 'text/plain',
            }
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add JWK') };
        }

        return { data };
    }

    /**
     * Generates a new client secret for a given client ID.
     *
     * @param clientId - The ID of the client for which to generate a secret.
     */
    public async generateClientSecret(clientId: string): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.POST('/api/v1/clients/{id}/secret', {
            params: {
                path: { id: clientId },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to generate client secret') };
        }

        return { data };
    }

    /**
     * Fetches prefixes for the organization number.
     *
     * @returns A promise that resolves to an ApiResponse containing an array of Scope objects.
     */
    public async getPrefixesForOrgno(): Promise<ApiResponse<Scope[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/prefix', {});

        if (error) {
            if (error.error_description?.includes('does not have any')) {
                return { data: [] };
            }

            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data };
    }

    /**
     * Fetches scopes based on the provided parameters.
     *
     * @param scope - Optional scope name to filter results.
     * @param inactive - Whether to include inactive scopes.
     * @returns A promise that resolves to an ApiResponse containing an array of Scope objects.
     */
    public async getScopes(scope?: string, inactive: boolean = true): Promise<ApiResponse<Scope[]>> {
        const queryParams: any = { inactive };
        if (scope) {
            queryParams.scope = scope;
        }

        const { data, error } = await this.apiClient.GET('/api/v1/scopes', {
            params: {
                query: queryParams
            }
        });

        if (error) {
            if (error.error_description?.includes('does not have any')) {
                return { data: [] };
            }

            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data: data };
    }

    /**
     * Fetches a specific scope by name.
     *
     * @param scope - The name of the scope to fetch.
     * @param inactive - Whether to include inactive scopes.
     * @returns A promise that resolves to an ApiResponse containing the Scope object.
     */
    public async getScope(scope?: string, inactive: boolean = true): Promise<ApiResponse<Scope>> {
        const queryParams: any = { inactive };
        if (scope) {
            queryParams.scope = scope;
        }

        const { data, error } = await this.apiClient.GET('/api/v1/scopes/scope', {
            params: {
                query: queryParams
            }
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data: data };
    }

    /**
     * Adds a new scope.
     *
     * @param scope - The scope object to add.
     * @returns A promise that resolves to an ApiResponse containing the added Scope object.
     */
    public async addScope(scope: Scope): Promise<ApiResponse<Scope>> {
        const { data, error } = await this.apiClient.POST('/api/v1/scopes', {
            body: scope,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add scope') };
        }

        return { data };
    }

    /**
     * Updates an existing scope.
     *
     * @param scope - The scope object to update.
     * @returns A promise that resolves to an ApiResponse containing the updated Scope object.
     */
    public async updateScope(scope: Scope): Promise<ApiResponse<Scope>> {
        const { data, error } = await this.apiClient.PUT('/api/v1/scopes', {
            params: {
                query: {
                    scope: scope.name!,
                },
            },
            body: scope,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to update scope') };
        }

        return { data };
    }

    /**
     * Deletes a scope by name.
     *
     * @param scopeName - The name of the scope to delete.
     * @returns A promise that resolves to an ApiResponse indicating success or failure.
     */
    public async deleteScope(scopeName: string): Promise<ApiResponse<void>> {
        const { error } = await this.apiClient.DELETE('/api/v1/scopes', {
            params: {
                query: {
                    scope: scopeName,
                },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to delete scope') };
        }

        return { data: undefined };
    }

    /**
     * Fetches JWKs (JSON Web Keys) for a specific client.
     *
     * @param clientId - The ID of the client for which to fetch JWKs.
     * @returns A promise that resolves to an ApiResponse containing an array of JWK objects.
     */
    public async getJwks(clientId: string): Promise<ApiResponse<JWK[]>> {
        const { error, data } = await this.apiClient.GET('/api/v1/clients/{clientId}/jwks', {
            params: {
                path: { clientId },
            },
        });

        if (error && 'status' in error && error.status !== 404) {
            return { error: new ApiError(error, 'Failed to fetch JWKs') };
        }

        return { data: data?.keys ?? [] };
    }

    /**
     * Deletes a JWK (JSON Web Key) for a specific client.
     *
     * @param clientId - The ID of the client from which to delete the JWK.
     * @param kid - The key ID of the JWK to delete.
     * @returns A promise that resolves to an ApiResponse indicating success or failure.
     */
    public async deleteJwk(clientId: string, kid: string): Promise<ApiResponse<void>> {
        const { error } = await this.apiClient.DELETE('/api/v1/clients/{clientId}/jwks/{kid}', {
            params: {
                path: { clientId, kid },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to delete JWK') };
        }

        return { data: undefined };
    }

    /**
     * Fetches all OnBehalfOf entities for a specific client.
     *
     * @param clientId - The ID of the client for which to fetch OnBehalfOf entities.
     * @returns A promise that resolves to an ApiResponse containing an array of ClientOnBehalfOf objects.
     */
    public async getAllOnBehalfOf(clientId: string): Promise<ApiResponse<ClientOnBehalfOf[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/clients/{clientId}/onbehalfof', {
            params: {
                path: { clientId },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch OnBehalfOf for client') };
        }

        return { data };
    }

    /**
     * Adds a new OnBehalfOf entity to a specific client.
     *
     * @param clientId - The ID of the client to which the OnBehalfOf entity will be added.
     * @param newClientOnBehalfOf - The new ClientOnBehalfOf object to add.
     * @returns A promise that resolves to an ApiResponse containing the added ClientOnBehalfOf object.
     */
    public async addOnBehalfOf(clientId: string, newClientOnBehalfOf: ClientOnBehalfOf): Promise<ApiResponse<ClientOnBehalfOf>> {
        const { data, error } = await this.apiClient.POST('/api/v1/clients/{clientId}/onbehalfof', {
            params: {
                path: { clientId },
            },
            body: newClientOnBehalfOf,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add OnBehalfOf to client') };
        }

        return { data };
    }

    /**
     * Edits an existing OnBehalfOf entity for a specific client.
     *
     * @param clientId - The ID of the client for which to edit the OnBehalfOf entity.
     * @param clientOnBehalfOf - The ClientOnBehalfOf object containing updated information.
     * @returns A promise that resolves to an ApiResponse containing the updated ClientOnBehalfOf object.
     */
    public async editOnBehalfOf(clientId: string, clientOnBehalfOf: ClientOnBehalfOf): Promise<ApiResponse<ClientOnBehalfOf>> {
        const { data, error } = await this.apiClient.PUT('/api/v1/clients/{clientId}/onbehalfof/{id}', {
            params: {
                path: { clientId, id: clientOnBehalfOf.onbehalfof! },
            },
            body: clientOnBehalfOf,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to edit OnBehalfOf on client') };
        }

        return { data };
    }

    /**
     * Deletes an OnBehalfOf entity for a specific client.
     *
     * @param clientId - The ID of the client from which to delete the OnBehalfOf entity.
     * @param id - The ID of the OnBehalfOf entity to delete.
     * @returns A promise that resolves to an ApiResponse indicating success or failure.
     */
    public async deleteOnBehalfOf(clientId: string, id: string): Promise<ApiResponse<void>> {
        const { data, error } = await this.apiClient.DELETE('/api/v1/clients/{clientId}/onbehalfof/{id}', {
            params: {
                path: { clientId, id },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to delete OnBehalfOf from client') };
        }

        return { data };
    }

    /**
     * Updates the scopes on a specific client.
     *
     * @param client - The UpdateClientRequest object containing the client ID and updated scopes.
     * @returns A promise that resolves to an ApiResponse containing the updated Client object.
     */
    public async updateScopesOnClient(client: UpdateClientRequest): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.PUT('/api/v1/clients/{id}', {
            params: {
                path: { id: client.client_id! }
            },
            body: client,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to update client') };
        }

        return { data };
    }

    /**
     * Fetches all scopes that are accessible for all scopes of a specific integration type.
     *
     * @param integration_type - The type of integration to filter scopes by.
     * @returns A promise that resolves to an ApiResponse containing an array of Scope objects.
     */
    public async getAccessibleForAllScopes(integration_type: string): Promise<ApiResponse<Scope[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/scopes/all', {
            params: {
                query: {
                    accessible_for_all: true,
                    integration_type: integration_type.toUpperCase()
                }
            }
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data };
    }

    /**
     * Fetches all scopes that have a delegation source for a specific integration type.
     *
     * @param integration_type - The type of integration to filter scopes by.
     * @returns A promise that resolves to an ApiResponse containing an array of Scope objects.
     */
    public async getScopesWithDelegationSource(integration_type: string): Promise<ApiResponse<Scope[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/scopes/all', {
            params: {
                query: {
                    delegated_sources: true,
                    integration_type: integration_type.toUpperCase()
                }
            }
        });

        if (error) {
            if (error.error_description?.includes('does not have any')) {
                return { data: [] };
            }

            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data };
    }

    /**
     * Fetches all scopes that are accessible to the user's organization.
     *
     * @returns A promise that resolves to an ApiResponse containing an array of Scope objects.
     */
    public async getScopesAccessibleToUsersOrganization(): Promise<ApiResponse<Scope[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/scopes/access/all');

        if (error) {
            if (error.error_description?.includes('does not have any')) {
                return { data: [] };
            }

            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data };
    }

    /**
     * Fetches all scope prefixes.
     *
     * @returns A promise that resolves to an ApiResponse containing an array of ScopePrefix objects.
     */
    public async getScopePrefixes(): Promise<ApiResponse<ScopePrefix[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/prefix');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch scope prefixes') };
        }

        return { data };
    }

    /**
     * Fetches all scopes that have access for a specific scope name.
     *
     * @param scopeName - The name of the scope to check access for.
     * @returns A promise that resolves to an ApiResponse containing an array of ScopeAccess objects.
     */
    public async getScopesWithAccess(scopeName: string): Promise<ApiResponse<ScopeAccess[]>> {
        const { data: data, error } = await this.apiClient.GET('/api/v1/scopes/access', {
            params: {
                query: { scope: scopeName }
            }
        });

        if (error) {
            if (error.error_description?.includes('does not have any')) {
                return { data: [] };
            }

            return { error: new ApiError(error, 'Failed to fetch scopes') };
        }

        return { data };
    }

    /**
     * Adds access to a specific scope for a consumer organization.
     *
     * @param consumerOrgno - The organization number of the consumer.
     * @param scopeName - The name of the scope to which access will be granted.
     * @returns A promise that resolves to an ApiResponse containing the ScopeAccess object.
     */
    public async addScopeAccess(
        consumerOrgno: string,
        scopeName: string
    ): Promise<ApiResponse<ScopeAccess>> {
        const { data: data, error } = await this.apiClient.PUT('/api/v1/scopes/access/{consumer_orgno}',
            {
                params: {
                    path: { consumer_orgno: consumerOrgno },
                    query: { scope: scopeName }
                }
            }
        );

        if (error) {
            return { error: new ApiError(error, 'Failed to add scope access') };
        }

        return { data };
    }

    /**
     * Removes access to a specific scope for a consumer organization.
     *
     * @param consumerOrgno - The organization number of the consumer.
     * @param scopeName - The name of the scope from which access will be removed.
     * @returns A promise that resolves to an ApiResponse containing the ScopeAccess object.
     */
    public async removeScopeAccess(
        consumerOrgno: string,
        scopeName: string
    ): Promise<ApiResponse<ScopeAccess>> {
        const { data: data, error } = await this.apiClient.DELETE('/api/v1/scopes/access/{consumer_orgno}',
            {
                params: {
                    path: { consumer_orgno: consumerOrgno },
                    query: { scope: scopeName }
                }
            }
        );

        if (error) {
            return { error: new ApiError(error, 'Failed to remove scope access') };
        }

        return { data };
    }

    /**
     * Fetches the organization name based on the provided organization number.
     *
     * @param orgno - The organization number to look up.
     * @returns A promise that resolves to an ApiResponse containing the Organization object.
     */
    public async getOrganizationName(orgno: string): Promise<ApiResponse<Organization>> {
        const { data, error } = await this.apiClient.GET('/api/v1/organizations/{orgnr}', {
            params: {
                path: {
                    orgnr: orgno,
                },
            },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to find organization') };
        }

        return { data };
    }

    /**
     * Fetches all delegation sources.
     *
     * @returns A promise that resolves to an ApiResponse containing an array of DelegationSource objects.
     */
    public async getDeletagionSources(): Promise<ApiResponse<DelegationSource[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/delegationsources');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch delegation sources') };
        }

        return { data };
    }

    /**
     * Fetches the authenticated user's information.
     *
     * @returns A promise that resolves to an ApiResponse containing the AuthenticatedOrganization object.
     */
    public async getUserInfo(): Promise<ApiResponse<AuthenticatedOrganization>> {
        const { data, error } = await this.apiClient.GET('/api/v1/auth/user');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch user information') };
        }

        return { data };
    }

    /**
     * Updates the synthetic organization number for the authenticated user.
     *
     * @param orgno - The organization number to switch to.
     * @returns A promise that resolves to an ApiResponse containing the updated AuthenticatedOrganization object.
     */
    public async updateSyntheticOrgno(orgno: string): Promise<ApiResponse<AuthenticatedOrganization>> {
        const { data, error } = await this.apiClient.POST('/api/v1/auth/switch-synth-org', {
            body: { orgno: orgno },
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch user information') };
        }

        return { data };
    }
}
