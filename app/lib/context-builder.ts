import { ClientOnBehalfOf, JWK } from '~/lib/models';
import { ApiResponse } from '~/lib/api_client';

import type { components } from '~/lib/api';

export interface ClientContext {
  client: {
    client_id: string | undefined;
    client_name: string | undefined;
    integration_type: string | undefined;
    scopes: string[] | undefined;
  };
  jwkCount: number;
  onBehalfOfCount: number;
  availableScopes: {
    accessibleForAll: number;
    withDelegationSource: number;
    availableToOrganization: number;
  };
}

export class ContextBuilder {
    static async buildClientContext(
        client: components['schemas']['ClientResponse'],
        JWK: JWK[],
        onBehalfOf: ClientOnBehalfOf[] | undefined,
        scopesAccessibleForAll: Promise<ApiResponse<any>>,
        scopesWithDelegationSource: Promise<ApiResponse<any>>,
        scopesAvailableToOrganization: Promise<ApiResponse<any>>
    ): Promise<ClientContext> {
        const [
            scopesAccessibleForAllData,
            scopesWithDelegationSourceData,
            scopesAvailableToOrganizationData
        ] = await Promise.all([
            scopesAccessibleForAll,
            scopesWithDelegationSource,
            scopesAvailableToOrganization
        ]);

        return {
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
    }
}