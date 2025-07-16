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

    static async buildHomeContext(clients: any[], scopes: any[]): Promise<any> {
        return {
            page: 'home',
            info: 'Dette er selvbetjening forsiden',
            clients,
            scopes
        };
    }

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
}
