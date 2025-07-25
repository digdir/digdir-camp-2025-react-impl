/**
 * ContextBuilder class to build a client context.
 */
export class ContextBuilder {

    /**
     * Analyzes scope lifetime conflicts with client lifetime settings.
     * 
     * @param client - The client object containing lifetime settings.
     * @param clientScopes - Array of scope names that the client has access to.
     * @param availableScopes - All available scope objects with their lifetime settings.
     * @returns Array of scope conflicts with detailed information.
     */
    private static analyzeScopeLifetimeConflicts(
        client: any,
        clientScopes: string[],
        availableScopes: any[]
    ): any[] {
        const conflicts: any[] = [];
        
        if (!client || !clientScopes || !availableScopes) {
            console.log('🚫 analyzeScopeLifetimeConflicts: Missing required data', {
                hasClient: !!client,
                hasClientScopes: !!clientScopes,
                clientScopesLength: clientScopes?.length,
                hasAvailableScopes: !!availableScopes,
                availableScopesLength: availableScopes?.length
            });
            return conflicts;
        }

        const clientAccessTokenLifetime = client.access_token_lifetime;
        const clientAuthorizationLifetime = client.authorization_lifetime;

        console.log('🔍 analyzeScopeLifetimeConflicts: Starting analysis', {
            clientId: client.client_id,
            clientAccessTokenLifetime,
            clientAuthorizationLifetime,
            clientScopesCount: clientScopes.length,
            availableScopesCount: availableScopes.length,
            clientScopes: clientScopes,
            availableScopeNames: availableScopes.map(s => s.name || s.scope),
            scopesInAvailableButNotInClient: availableScopes.filter(s => 
                !clientScopes.includes(s.name || s.scope || `${s.prefix}:${s.subscope}`)
            ).map(s => ({
                name: s.name || s.scope || `${s.prefix}:${s.subscope}`,
                at_max_age: s.at_max_age,
                authorization_max_lifetime: s.authorization_max_lifetime
            }))
        });

        clientScopes.forEach(scopeName => {
            // Enhanced scope finding with multiple search strategies
            let scope = null;
            const searchStrategies = [
                () => availableScopes.find(s => s.name === scopeName),
                () => availableScopes.find(s => s.scope === scopeName),
                () => availableScopes.find(s => `${s.prefix}:${s.subscope}` === scopeName),
                () => availableScopes.find(s => s.name?.toLowerCase() === scopeName.toLowerCase()),
                () => availableScopes.find(s => s.scope?.toLowerCase() === scopeName.toLowerCase())
            ];

            for (const strategy of searchStrategies) {
                scope = strategy();
                if (scope) break;
            }
            
            console.log(`🔍 Checking scope '${scopeName}':`, {
                found: !!scope,
                searchAttempts: {
                    byName: !!availableScopes.find(s => s.name === scopeName),
                    byScope: !!availableScopes.find(s => s.scope === scopeName),
                    byPrefixSubscope: !!availableScopes.find(s => `${s.prefix}:${s.subscope}` === scopeName),
                    caseInsensitive: !!availableScopes.find(s => 
                        s.name?.toLowerCase() === scopeName.toLowerCase() || 
                        s.scope?.toLowerCase() === scopeName.toLowerCase()
                    )
                },
                scopeData: scope ? {
                    name: scope.name,
                    scope: scope.scope,
                    prefix: scope.prefix,
                    subscope: scope.subscope,
                    at_max_age: scope.at_max_age,
                    authorization_max_lifetime: scope.authorization_max_lifetime,
                    dataType_at_max_age: typeof scope.at_max_age,
                    dataType_auth_max: typeof scope.authorization_max_lifetime,
                    rawValues: {
                        at_max_age_raw: scope.at_max_age,
                        auth_max_raw: scope.authorization_max_lifetime
                    }
                } : null,
                availableScopesDebug: availableScopes.length > 10 ? 
                    `${availableScopes.length} scopes (showing first 5): ${availableScopes.slice(0, 5).map(s => s.name || s.scope || `${s.prefix}:${s.subscope}`).join(', ')}` :
                    availableScopes.map(s => s.name || s.scope || `${s.prefix}:${s.subscope}`).join(', ')
            });
            
            if (!scope) {
                // Check if it's a standard OpenID scope
                if (['openid', 'profile', 'email', 'phone', 'address'].includes(scopeName.toLowerCase())) {
                    console.log(`ℹ️ Scope '${scopeName}' is a standard OpenID Connect scope - no lifetime restrictions apply`);
                } else {
                    console.warn(`⚠️ Scope '${scopeName}' not found in available scopes - this could indicate a configuration issue!`);
                    console.log('Available scope identifiers:', availableScopes.map(s => ({
                        name: s.name,
                        scope: s.scope,
                        prefixSubscope: `${s.prefix}:${s.subscope}`,
                        active: s.active
                    })));
                }
                return; // Skip scopes that aren't found - no conflicts to check
            }

            // Check for authorization lifetime conflicts
            if (scope.authorization_max_lifetime != null && clientAuthorizationLifetime != null) {
                const scopeAuthMax = Number(scope.authorization_max_lifetime);
                const clientAuthLifetime = Number(clientAuthorizationLifetime);
                
                // Validate the numbers
                if (isNaN(scopeAuthMax) || isNaN(clientAuthLifetime)) {
                    console.error(`❌ Invalid number values for authorization lifetime check - scope: ${scope.authorization_max_lifetime} (${typeof scope.authorization_max_lifetime}), client: ${clientAuthorizationLifetime} (${typeof clientAuthorizationLifetime})`);
                    return;
                }
                
                console.log(`🔍 Authorization lifetime check for '${scopeName}':`, {
                    scopeAuthMax,
                    clientAuthLifetime,
                    scopeAuthMaxRaw: scope.authorization_max_lifetime,
                    clientAuthLifetimeRaw: clientAuthorizationLifetime,
                    willConflict: scopeAuthMax > 0 && scopeAuthMax < clientAuthLifetime
                });
                
                // Conflict when scope has a limit (> 0) and it's lower than client's setting
                if (scopeAuthMax > 0 && scopeAuthMax < clientAuthLifetime) {
                    console.log(`⚠️ Authorization conflict detected for scope '${scopeName}'`);
                    conflicts.push({
                        type: 'authorization_lifetime_conflict',
                        scopeName: scopeName,
                        scopeLifetime: scopeAuthMax,
                        clientLifetime: clientAuthLifetime,
                        severity: 'high',
                        description: `Scope '${scopeName}' har en maksimal autorisasjonslevetid på ${scopeAuthMax} sekunder, som er lavere enn klientens autorisasjonslevetid på ${clientAuthLifetime} sekunder. Dette vil føre til at brukeren blir logget ut tidligere enn forventet.`,
                        solution: `Reduser klientens autorisasjonslevetid til maksimalt ${scopeAuthMax} sekunder, eller øk scope '${scopeName}' sin authorization_max_lifetime.`
                    });
                }
            }

            // Check for access token lifetime conflicts  
            if (scope.at_max_age != null && clientAccessTokenLifetime != null) {
                const scopeAtMaxAge = Number(scope.at_max_age);
                const clientAccessLifetime = Number(clientAccessTokenLifetime);
                
                // Validate the numbers
                if (isNaN(scopeAtMaxAge) || isNaN(clientAccessLifetime)) {
                    console.error(`❌ Invalid number values for access token lifetime check - scope: ${scope.at_max_age} (${typeof scope.at_max_age}), client: ${clientAccessTokenLifetime} (${typeof clientAccessTokenLifetime})`);
                    return;
                }
                
                console.log(`🔍 Access token lifetime check for '${scopeName}':`, {
                    scopeAtMaxAge,
                    clientAccessLifetime,
                    scopeAtMaxAgeRaw: scope.at_max_age,
                    clientAccessLifetimeRaw: clientAccessTokenLifetime,
                    willConflict: scopeAtMaxAge > 0 && scopeAtMaxAge < clientAccessLifetime,
                    conflictExplanation: {
                        scopeHasLimit: scopeAtMaxAge > 0,
                        scopeIsStricter: scopeAtMaxAge < clientAccessLifetime,
                        result: scopeAtMaxAge > 0 && scopeAtMaxAge < clientAccessLifetime ? 'CONFLICT' : 'NO_CONFLICT'
                    }
                });
                
                // Conflict occurs when scope's at_max_age is lower than client's access_token_lifetime
                // AND scope's at_max_age is not 0 (0 means no limit)
                if (scopeAtMaxAge > 0 && scopeAtMaxAge < clientAccessLifetime) {
                    console.log(`⚠️ Access token conflict detected for scope '${scopeName}' - scope enforces ${scopeAtMaxAge}s but client wants ${clientAccessLifetime}s`);
                    conflicts.push({
                        type: 'access_token_lifetime_conflict',
                        scopeName: scopeName,
                        scopeLifetime: scopeAtMaxAge,
                        clientLifetime: clientAccessLifetime,
                        severity: 'high',
                        description: `Scope '${scopeName}' har en maksimal access token levetid på ${scopeAtMaxAge} sekunder, som er lavere enn klientens access_token_lifetime på ${clientAccessLifetime} sekunder. Access tokens vil utløpe tidligere enn klienten forventer.`,
                        solution: `Reduser klientens access_token_lifetime til maksimalt ${scopeAtMaxAge} sekunder, eller øk scope '${scopeName}' sin at_max_age.`
                    });
                } else {
                    console.log(`✅ No access token conflict for scope '${scopeName}' - ${scopeAtMaxAge === 0 ? 'scope has no limit' : `scope allows ${scopeAtMaxAge}s which is >= client's ${clientAccessLifetime}s`}`);
                }
            } else {
                console.log(`ℹ️ Skipping access token check for '${scopeName}' - missing values:`, {
                    scopeHasAtMaxAge: scope.at_max_age != null,
                    clientHasAccessTokenLifetime: clientAccessTokenLifetime != null,
                    scopeAtMaxAge: scope.at_max_age,
                    clientAccessTokenLifetime: clientAccessTokenLifetime
                });
            }
        });

        console.log('🔍 analyzeScopeLifetimeConflicts: Analysis complete', {
            totalConflicts: conflicts.length,
            conflicts: conflicts.map(c => ({
                type: c.type,
                scopeName: c.scopeName,
                scopeLifetime: c.scopeLifetime,
                clientLifetime: c.clientLifetime
            })),
            clientScopes: clientScopes,
            hasOnlyStandardScopes: clientScopes.every(s => ['openid', 'profile'].includes(s)),
            scopesChecked: clientScopes.filter(scopeName => 
                availableScopes.some(s => s.name === scopeName || s.scope === scopeName)
            ),
            potentialMissedConflicts: availableScopes.filter(s => 
                (s.at_max_age && s.at_max_age > 0 && s.at_max_age < clientAccessTokenLifetime) ||
                (s.authorization_max_lifetime && s.authorization_max_lifetime > 0 && s.authorization_max_lifetime < clientAuthorizationLifetime)
            ).map(s => ({
                name: s.name || s.scope || `${s.prefix}:${s.subscope}`,
                at_max_age: s.at_max_age,
                authorization_max_lifetime: s.authorization_max_lifetime,
                wouldConflictWith: {
                    accessToken: s.at_max_age && s.at_max_age > 0 && s.at_max_age < clientAccessTokenLifetime,
                    authorization: s.authorization_max_lifetime && s.authorization_max_lifetime > 0 && s.authorization_max_lifetime < clientAuthorizationLifetime
                }
            }))
        });

        return conflicts;
    }

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
        // Combine all available scopes for conflict analysis
        const allAvailableScopes = [
            ...(scopesAccessibleForAll ?? []),
            ...(scopesWithDelegationSource ?? []),
            ...(scopesAvailableToOrganization?.map(s => ({ name: s.scope, ...s })) ?? [])
        ];

        // Analyze scope lifetime conflicts
        const scopeConflicts = this.analyzeScopeLifetimeConflicts(
            client,
            client?.scopes ?? [],
            allAvailableScopes
        );

        // Add information about scopes for AI assistant context
        const clientScopes = client?.scopes ?? [];
        const hasOnlyStandardScopes = clientScopes.every((s: string) => ['openid', 'profile'].includes(s));
        const scopesWithLifetimeRestrictions = allAvailableScopes.filter(s => 
            clientScopes.includes(s.name || s.scope) && 
            (s.at_max_age != null || s.authorization_max_lifetime != null)
        );

        return {
            client,
            jwks: JWK,
            onBehalfOf: onBehalfOf ?? [],
            availableScopes: {
                accessibleForAll: scopesAccessibleForAll,
                withDelegationSource: scopesWithDelegationSource,
                availableToOrganization: scopesAvailableToOrganization
            },
            scopeConflicts: scopeConflicts,
            hasConfigurationIssues: scopeConflicts.length > 0,
            scopeAnalysis: {
                hasOnlyStandardScopes,
                clientScopesCount: clientScopes.length,
                scopesWithLifetimeRestrictions: scopesWithLifetimeRestrictions.length,
                message: hasOnlyStandardScopes ? 
                    'Denne klienten bruker kun standard OpenID scopes (openid, profile) som ikke har levetidsbegrensninger. Access token lifetime konflikter er derfor ikke relevante for denne klienten.' :
                    null
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
