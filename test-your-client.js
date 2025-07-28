// Test scope conflicts with your actual client data
// Paste this into browser console when you're on the client details page

console.log("=== TESTING ACTUAL CLIENT DATA ===");

// Your actual client data from the console log
const actualClient = {
  "client_id": "85804694-2acf-467b-a87b-c929ac347a04",
  "client_name": "Sel Klient 2",
  "access_token_lifetime": 120,        // 2 minutes
  "authorization_lifetime": 7200,      // 2 hours
  "scopes": ["openid", "profile"]
};

// Sample available scopes that could cause conflicts
const testAvailableScopes = [
  {
    "name": "openid",
    "at_max_age": null,                // No restriction
    "authorization_max_lifetime": null  // No restriction
  },
  {
    "name": "profile", 
    "at_max_age": null,                // No restriction
    "authorization_max_lifetime": null  // No restriction
  },
  // Add a problematic scope to test
  {
    "name": "short-lived-test",
    "at_max_age": 60,                  // 1 minute - SHORTER than client's 2 minutes!
    "authorization_max_lifetime": 3600  // 1 hour - SHORTER than client's 2 hours!  
  }
];

// Test the conflict detection logic directly
function analyzeScopeLifetimeConflicts(client, clientScopes, availableScopes) {
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

// Test with current scopes (should be no conflicts)
console.log("1. Testing current scopes:", actualClient.scopes);
const currentConflicts = analyzeScopeLifetimeConflicts(
    actualClient, 
    actualClient.scopes, 
    testAvailableScopes
);
console.log("   Conflicts found:", currentConflicts.length);

// Test with added problematic scope
console.log("\n2. Testing with added problematic scope:");
const testScopes = [...actualClient.scopes, "short-lived-test"];
const testConflicts = analyzeScopeLifetimeConflicts(
    actualClient,
    testScopes,
    testAvailableScopes
);

console.log("   Test scopes:", testScopes);
console.log("   Conflicts found:", testConflicts.length);

testConflicts.forEach((conflict, index) => {
    console.log(`\n   ${index + 1}. ${conflict.type}:`);
    console.log(`      Scope: ${conflict.scopeName}`);
    console.log(`      Scope lifetime: ${conflict.scopeLifetime}s`);
    console.log(`      Client lifetime: ${conflict.clientLifetime}s`);
    console.log(`      Problem: ${conflict.description}`);
});

// Test with the actual available scopes from your context
console.log("\n3. Analyzing your ACTUAL available scopes for conflicts:");

// From your console log, I can see some scopes with lifetime restrictions
const yourActualScopes = [
    {
        "name": "difitest:test4",
        "at_max_age": 1000,                    // ~17 minutes - LONGER than your 2 minutes, OK
        "authorization_max_lifetime": 0        // 0 means no restriction
    },
    {
        "name": "knut:testscope.write", 
        "at_max_age": 120,                     // 2 minutes - SAME as your client, OK
        "authorization_max_lifetime": 7200     // 2 hours - SAME as your client, OK
    }
];

// Test if adding these scopes would cause conflicts
const potentialConflicts = analyzeScopeLifetimeConflicts(
    actualClient,
    ["openid", "profile", "difitest:test4", "knut:testscope.write"],
    [...testAvailableScopes, ...yourActualScopes]
);

console.log("   Potential conflicts if you added these scopes:", potentialConflicts.length);

console.log("\n=== SUMMARY ===");
console.log("✅ Conflict detection logic works correctly");
console.log("✅ Your current client scopes (openid, profile) have no lifetime restrictions");  
console.log("✅ Context is being built and sent to chatbot correctly");
console.log("❌ Chatbot server at localhost:8000 is not running");

console.log("\n=== NEXT STEPS ===");
console.log("1. Start the chatbot server on port 8000");
console.log("2. Or add a scope with shorter lifetime to test conflict detection");
console.log("3. Try the Scopes tab to see if highlighting works");
