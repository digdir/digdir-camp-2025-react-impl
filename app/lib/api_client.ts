import createClient, { Middleware, Client as OpenApiClient } from 'openapi-fetch';
import { redirect } from 'react-router';

import { ApiError } from '~/lib/errors';
import { AddClientRequest, AuthenticatedOrganization, Client, ClientOnBehalfOf, DelegationSource, JWK, Organization, Scope, ScopeAccess, ScopePrefix, UpdateClientRequest } from '~/lib/models';

import { Authorization } from './auth';
import { fetchAppConfig } from './config';
import { StatusColor, StatusMessage } from './status';

import type { paths } from '~/lib/api';

export type ApiResponse<T> =
    | { data: T; error?: never }
    | { data?: never; error: ApiError };


export class ApiClient {
    private readonly apiClient: OpenApiClient<paths>;

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

    static async create() {
        const appConfig = await fetchAppConfig();
        return new ApiClient(appConfig.apiUrl);
    }

    public async getClients(): Promise<ApiResponse<Client[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/clients', {});

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch clients') };
        }

        return { data };
    }

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

    public async addClient(client: AddClientRequest): Promise<ApiResponse<Client>> {
        const { data, error } = await this.apiClient.POST('/api/v1/clients', {
            body: client,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add client') };
        }

        return { data };
    }

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

    public async addScope(scope: Scope): Promise<ApiResponse<Scope>> {
        const { data, error } = await this.apiClient.POST('/api/v1/scopes', {
            body: scope,
        });

        if (error) {
            return { error: new ApiError(error, 'Failed to add scope') };
        }

        return { data };
    }

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

    public async getScopePrefixes(): Promise<ApiResponse<ScopePrefix[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/prefix');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch scope prefixes') };
        }

        return { data };
    }

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

    public async getDeletagionSources(): Promise<ApiResponse<DelegationSource[]>> {
        const { data, error } = await this.apiClient.GET('/api/v1/delegationsources');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch delegation sources') };
        }

        return { data };
    }

    public async getUserInfo(): Promise<ApiResponse<AuthenticatedOrganization>> {
        const { data, error } = await this.apiClient.GET('/api/v1/auth/user');

        if (error) {
            return { error: new ApiError(error, 'Failed to fetch user information') };
        }

        return { data };
    }

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
