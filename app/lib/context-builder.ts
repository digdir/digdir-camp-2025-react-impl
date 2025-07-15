/**
 * ContextBuilder class to build a client context.
 */
export class ContextBuilder {
    static async buildClientContext(
        client: any,
        JWK: any[],
        onBehalfOf: any[],
        scopesAccessibleForAll: any[],
        scopesWithDelegationSource: any[],
        scopesAvailableToOrganization: any[]
    ): Promise<any> {
        return {
            client,
            jwks: JWK,
            onBehalfOf: onBehalfOf ?? [],
            availableScopes: {
                accessibleForAll: scopesAccessibleForAll,
                withDelegationSource: scopesWithDelegationSource,
                availableToOrganization: scopesAvailableToOrganization
            }
        };
    }
}
