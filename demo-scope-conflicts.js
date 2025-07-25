// Demo-script for å teste scope-konflikt-deteksjonen i browser console
// Kjør dette i browser developer tools når du er på en klient-detaljside

console.log("=== SCOPE CONFLICT DETECTION DEMO ===");

// Test 1: Simuler en klient med scope-konflikter
const simulatedContext = {
    client: {
        client_id: "demo-client",
        client_name: "Demo Klient",
        access_token_lifetime: 3600, // 1 time
        authorization_lifetime: 7200, // 2 timer  
        scopes: ["profile", "openid", "problematic-scope"]
    },
    scopeConflicts: [
        {
            type: 'authorization_lifetime_conflict',
            scopeName: 'problematic-scope',
            scopeLifetime: 3600,
            clientLifetime: 7200,
            severity: 'high',
            description: "Scope 'problematic-scope' har en maksimal autorisasjonslevetid på 3600 sekunder, som er lavere enn klientens autorisasjonslevetid på 7200 sekunder. Dette vil føre til at brukeren blir logget ut tidligere enn forventet.",
            solution: "Reduser klientens autorisasjonslevetid til maksimalt 3600 sekunder, eller fjern scope 'problematic-scope' fra klienten."
        }
    ],
    hasConfigurationIssues: true,
    page: 'client-details'
};

console.log("1. Simulert context med konflikt:", simulatedContext);

// Test 2: Sjekk om AI-assistant context eksisterer
if (typeof window !== 'undefined' && window.React) {
    console.log("2. React er tilgjengelig i window");
} else {
    console.log("2. React ikke funnet - dette scriptet må kjøres i browser");
}

// Test 3: Sjekk for scope-elementer i DOM
const scopeElements = document.querySelectorAll('[data-scope-name]');
console.log(`3. Funnet ${scopeElements.length} scope-elementer med data-scope-name attributt:`);
scopeElements.forEach((el, index) => {
    console.log(`   ${index + 1}. Scope: "${el.dataset.scopeName}"`);
});

// Test 4: Sjekk CSS-klasser
const highlightedElements = document.querySelectorAll('.scope-conflict-highlight');
console.log(`4. Antall elementer med conflict-highlight: ${highlightedElements.length}`);

// Test 5: Test CSS-animasjon manuelt (hvis scope-elementer finnes)
if (scopeElements.length > 0) {
    console.log("5. Tester highlighting på første scope-element...");
    const firstScope = scopeElements[0];
    
    // Legg til highlight-klasse
    firstScope.classList.add('scope-conflict-highlight');
    console.log(`   ✅ Lagt til highlight på: ${firstScope.dataset.scopeName}`);
    
    // Fjern highlight etter 3 sekunder
    setTimeout(() => {
        firstScope.classList.remove('scope-conflict-highlight');
        console.log(`   ✅ Fjernet highlight fra: ${firstScope.dataset.scopeName}`);
    }, 3000);
} else {
    console.log("5. ❌ Ingen scope-elementer funnet for testing av highlighting");
}

// Test 6: Sjekk om CSS-stilene er lastet
const testElement = document.createElement('div');
testElement.className = 'scope-conflict-highlight';
document.body.appendChild(testElement);

const computedStyle = window.getComputedStyle(testElement);
const hasAnimation = computedStyle.animationName !== 'none' && computedStyle.animationName !== '';

console.log(`6. CSS-animasjon lastet: ${hasAnimation ? '✅' : '❌'}`);
if (hasAnimation) {
    console.log(`   Animation: ${computedStyle.animationName}`);
    console.log(`   Duration: ${computedStyle.animationDuration}`);
}

document.body.removeChild(testElement);

// Test 7: Simuler contextual suggestions
function simulateContextualSuggestions(context) {
    const suggestions = [];
    
    if (context?.scopeConflicts && context.scopeConflicts.length > 0) {
        const authLifetimeConflicts = context.scopeConflicts.filter(c => c.type === 'authorization_lifetime_conflict');
        const accessTokenConflicts = context.scopeConflicts.filter(c => c.type === 'access_token_lifetime_conflict');

        if (authLifetimeConflicts.length > 0) {
            suggestions.push({
                id: 'auth-lifetime-conflicts',
                text: `Klienten har ${authLifetimeConflicts.length} scope(s) som logger ut brukeren tidligere enn forventet`,
                description: 'Scopes med lavere autorisasjonslevetid overstyrer klientens innstillinger',
                category: '⚠️ Konfigurasjonsfeil'
            });
        }

        if (accessTokenConflicts.length > 0) {
            suggestions.push({
                id: 'access-token-conflicts',
                text: `Klienten har ${accessTokenConflicts.length} scope(s) med lavere access token levetid`,
                description: 'Access tokens vil utløpe tidligere enn klientens innstillinger',
                category: '⚠️ Konfigurasjonsfeil'
            });
        }
    }
    
    return suggestions;
}

const demoSuggestions = simulateContextualSuggestions(simulatedContext);
console.log("7. Simulerte AI-suggestions:", demoSuggestions);

console.log("\n=== DEMO FULLFØRT ===");
console.log("For å teste i praksis:");
console.log("1. Gå til en klient-detaljside");
console.log("2. Åpne AI-assistenten og se etter konflikt-varsler");
console.log("3. Klikk på 'Scopes'-fanen og observer highlighting");
console.log("4. Sjekk browser console for debug-meldinger");

// Eksporter for bruk andre steder
if (typeof window !== 'undefined') {
    window.scopeConflictDemo = {
        simulatedContext,
        simulateContextualSuggestions,
        testCSS: () => {
            scopeElements.forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add('scope-conflict-highlight');
                    setTimeout(() => {
                        el.classList.remove('scope-conflict-highlight');
                    }, 2000);
                }, index * 500);
            });
        }
    };
    console.log("Demo-funksjoner tilgjengelig som: window.scopeConflictDemo");
}
