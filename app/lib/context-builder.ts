/**
 * ContextBuilder class to build a client context.
 */
export class ContextBuilder {

    /**
     * Builds a client context with the provided parameters.
     *
     * @param client - The client object containing client details.
     * @param JWK - The JSON Web Key (JWK) used for signing tokens.
     * @param onBehalfOf - An array of entities on whose behalf the client is acting.
     * @param scopesAccessibleForAll - An array of scopes that are accessible for all.
     * @param scopesWithDelegationSource - An array of scopes that have a delegation source.
     * @param scopesAvailableToOrganization - An array of scopes available to the organization.
     */
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

    /**
     * Builds a scope context with the provided parameters.
     *
     * @param scope - The scope object containing scope details.
     * @param scopesWithAccess - An array of scopes that have access to the current scope.
     * @param delegationSources - An array of delegation sources for the current scope.
     */
    static async buildScopeContext(
        scope: any,
        scopesWithAccess: any[],
        delegationSources: any[]
    ): Promise<any> {
        return {
            scope: {
                name: scope.name,
                description: scope.description,
                created: scope.created,
                active: scope.active,
                prefix: scope.prefix,
                subscope: scope.subscope
            },
            scopesWithAccess: scopesWithAccess ?? [],
            delegationSources: delegationSources ?? []
        };
    }

    /**
     * Builds the home context with the provided clients and scopes.
     *
     * @param clients - An array of client objects.
     * @param scopes - An array of scope objects.
     */
    static async buildHomeContext(clients: any[], scopes: any[]): Promise<any> {
        return {
            page: 'home',
            info: 'Dette er selvbetjening forsiden',
            clients,
            scopes
        };
    }

    /**
     * Builds the scopes context with the provided scopes and scope prefixes.
     *
     * @param scopes - An array of scope objects.
     * @param scopePrefixes - An array of scope prefix objects.
     */
    static async buildScopesContext(scopes: any[], scopePrefixes: any[]): Promise<any> {
        return {
            scopes: scopes.map(s => ({
                name: s.name,
                description: s.description,
                prefix: s.prefix,
                active: s.active,
                created: s.created
            })),
            scopePrefixes: scopePrefixes.map(p => p.prefix)
        };
    }

    /**
     * Builds a clients context with the provided clients.
     *
     * @param clients - An array of client objects.
     */
    static async buildClientsContext(clients: any[]) {
        return {
            clientsSummary: clients.map(c => ({
                id: c.client_id,
                name: c.client_name,
                integrationType: c.integration_type
            }))
        };
    }

    /**
     * Builds a keys context with the provided JWKs.
     *
     * @param jwks - An array of JWK (JSON Web Key) objects.
     */
    static async buildKeysContext(jwks: any[]): Promise<any> {
        return {
            keys: jwks.map(jwk => ({
                kid: jwk.kid,
                alg: jwk.alg,
                kty: jwk.kty,
                created: jwk.created,
                exp: jwk.exp,
                x5c: jwk.x5c
            }))
        };
    }
}
