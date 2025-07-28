// Test script for scope conflict detection functionality
// Dette er et eksempel på hvordan scope-konflikt-deteksjonen fungerer

const ContextBuilder = {
    analyzeScopeLifetimeConflicts: function(client, clientScopes, availableScopes) {
        const conflicts = [];
        
        if (!client || !clientScopes || !availableScopes) {
            return conflicts;
        }

        const clientAccessTokenLifetime = client.access_token_lifetime;
        const clientAuthorizationLifetime = client.authorization_lifetime;

        clientScopes.forEach(scopeName => {
            const scope = availableScopes.find(s => s.name === scopeName);
            if (!scope) return;

            // Check for authorization lifetime conflicts
            if (scope.authorization_max_lifetime && clientAuthorizationLifetime) {
                if (scope.authorization_max_lifetime < clientAuthorizationLifetime) {
                    conflicts.push({
                        type: 'authorization_lifetime_conflict',
                        scopeName: scopeName,
                        scopeLifetime: scope.authorization_max_lifetime,
                        clientLifetime: clientAuthorizationLifetime,
                        severity: 'high',
                        description: `Scope '${scopeName}' har en maksimal autorisasjonslevetid på ${scope.authorization_max_lifetime} sekunder, som er lavere enn klientens autorisasjonslevetid på ${clientAuthorizationLifetime} sekunder. Dette vil føre til at brukeren blir logget ut tidligere enn forventet.`,
                        solution: `Reduser klientens autorisasjonslevetid til maksimalt ${scope.authorization_max_lifetime} sekunder, eller fjern scope '${scopeName}' fra klienten.`
                    });
                }
            }

            // Check for access token lifetime conflicts  
            if (scope.at_max_age && clientAccessTokenLifetime) {
                if (scope.at_max_age < clientAccessTokenLifetime) {
                    conflicts.push({
                        type: 'access_token_lifetime_conflict',
                        scopeName: scopeName,
                        scopeLifetime: scope.at_max_age,
                        clientLifetime: clientAccessTokenLifetime,
                        severity: 'medium',
                        description: `Scope '${scopeName}' har en maksimal access token levetid på ${scope.at_max_age} sekunder, som er lavere enn klientens access token levetid på ${clientAccessTokenLifetime} sekunder. Access tokens vil utløpe tidligere enn forventet.`,
                        solution: `Reduser klientens access token levetid til maksimalt ${scope.at_max_age} sekunder, eller fjern scope '${scopeName}' fra klienten.`
                    });
                }
            }
        });

        return conflicts;
    }
};

// Test scenario 1: Klient har høyere autorisasjonslevetid enn scope
console.log("=== TEST SCENARIO 1: Authorization Lifetime Conflict ===");

const testClient1 = {
    client_id: "test-client-1",
    client_name: "Test Klient med Lang Levetid",
    integration_type: "idporten",
    access_token_lifetime: 3600, // 1 time
    authorization_lifetime: 7200, // 2 timer
    scopes: ["profile", "openid", "short-lived-scope"]
};

const testScopes1 = [
    {
        name: "profile",
        description: "Profil informasjon",
        authorization_max_lifetime: null, // Ingen begrensning
        at_max_age: null
    },
    {
        name: "openid",
        description: "OpenID Connect",
        authorization_max_lifetime: null,
        at_max_age: null
    },
    {
        name: "short-lived-scope",
        description: "Kort-levd scope",
        authorization_max_lifetime: 3600, // 1 time - lavere enn klientens 2 timer!
        at_max_age: 1800 // 30 minutter - lavere enn klientens 1 time!
    }
];

const conflicts1 = ContextBuilder.analyzeScopeLifetimeConflicts(
    testClient1,
    testClient1.scopes,
    testScopes1
);

console.log("Funnede konflikter:");
conflicts1.forEach((conflict, index) => {
    console.log(`\n${index + 1}. ${conflict.type}:`);
    console.log(`   Scope: ${conflict.scopeName}`);
    console.log(`   Severity: ${conflict.severity}`);
    console.log(`   Problem: ${conflict.description}`);
    console.log(`   Løsning: ${conflict.solution}`);
});

// Test scenario 2: Klient uten konflikter
console.log("\n\n=== TEST SCENARIO 2: No Conflicts ===");

const testClient2 = {
    client_id: "test-client-2",
    client_name: "Test Klient uten Konflikter",
    integration_type: "idporten",
    access_token_lifetime: 1800, // 30 minutter
    authorization_lifetime: 3600, // 1 time
    scopes: ["profile", "openid", "short-lived-scope"]
};

const conflicts2 = ContextBuilder.analyzeScopeLifetimeConflicts(
    testClient2,
    testClient2.scopes,
    testScopes1
);

console.log(`Funnede konflikter: ${conflicts2.length === 0 ? 'Ingen konflikter!' : conflicts2.length}`);

// Test scenario 3: Multiple conflicts
console.log("\n\n=== TEST SCENARIO 3: Multiple Conflicts ===");

const testClient3 = {
    client_id: "test-client-3", 
    client_name: "Test Klient med Multiple Konflikter",
    integration_type: "maskinporten",
    access_token_lifetime: 7200, // 2 timer
    authorization_lifetime: 14400, // 4 timer
    scopes: ["scope-a", "scope-b", "scope-c"]
};

const testScopes3 = [
    {
        name: "scope-a",
        description: "Scope A",
        authorization_max_lifetime: 3600, // 1 time - konflikt!
        at_max_age: 1800 // 30 min - konflikt!
    },
    {
        name: "scope-b", 
        description: "Scope B",
        authorization_max_lifetime: 7200, // 2 timer - konflikt!
        at_max_age: 3600 // 1 time - konflikt!
    },
    {
        name: "scope-c",
        description: "Scope C", 
        authorization_max_lifetime: 28800, // 8 timer - OK
        at_max_age: 14400 // 4 timer - OK
    }
];

const conflicts3 = ContextBuilder.analyzeScopeLifetimeConflicts(
    testClient3,
    testClient3.scopes,
    testScopes3
);

console.log(`Funnede konflikter: ${conflicts3.length}`);
conflicts3.forEach((conflict, index) => {
    console.log(`\n${index + 1}. ${conflict.type}:`);
    console.log(`   Scope: ${conflict.scopeName}`);
    console.log(`   Klient levetid: ${conflict.clientLifetime}s`);
    console.log(`   Scope levetid: ${conflict.scopeLifetime}s`);
    console.log(`   Severity: ${conflict.severity}`);
});

console.log("\n=== SAMMENDRAG ===");
console.log("Implementeringen oppdager følgende typer konflikter:");
console.log("1. authorization_lifetime_conflict - Scope har lavere autorisasjonslevetid enn klient");
console.log("2. access_token_lifetime_conflict - Scope har lavere access token levetid enn klient");
console.log("\nDisse konfliktene vil føre til at brukeren blir logget ut eller access tokens utløper");
console.log("tidligere enn forventet basert på klientens konfigurerte levetider.");
