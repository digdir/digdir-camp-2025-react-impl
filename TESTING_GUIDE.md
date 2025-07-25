# Testplan for Scope Conflict Detection

## Forutsetninger
1. Applikasjonen må kjøre i utviklingsmiljø
2. Du må ha tilgang til å opprette/redigere klienter og scopes
3. Nettleser må ha developer tools åpen for å se console-logger

## Test 1: Verifiser context-bygging
### Steg:
1. Naviger til en klient-detaljside (f.eks. `/clients/[client-id]`)
2. Åpne browser developer tools → Console
3. Se etter console-melding: "Context JSON:" som viser den fullstendige konteksten

### Forventet resultat:
```json
{
  "client": { ... },
  "scopeConflicts": [
    {
      "type": "authorization_lifetime_conflict",
      "scopeName": "konflikterende-scope",
      "severity": "high",
      "description": "...",
      "solution": "..."
    }
  ],
  "hasConfigurationIssues": true
}
```

## Test 2: AI-assistant suggestions
### Steg:
1. På en klient-detaljside med scope-konflikter
2. Åpne AI-assistenten (klikk på AI-knappen)
3. Se på suggestions-listen

### Forventet resultat:
- Øverst i suggestions-listen skal du se røde varsler som:
  - "⚠️ Klienten har X scope(s) som logger ut brukeren tidligere enn forventet"
  - "⚠️ Klienten har X scope(s) med lavere access token levetid"

## Test 3: Automatisk highlighting
### Steg:
1. På en klient-detaljside
2. Klikk på "Scopes"-fanen
3. Observer om scope-rader med konflikter får orange pulserende markering

### Forventet resultat:
- Konflikterende scopes markeres med orange `scope-conflict-highlight` klasse
- Siden scroller automatisk til første konflikt
- Highlighting forsvinner etter 8 sekunder

## Test 4: Console-logging for debugging
### Steg:
1. Åpne developer tools → Console
2. Naviger til "Scopes"-fanen på en klient
3. Observer console-meldinger

### Forventet resultat:
```
🚀 Starting highlightScopeConflicts function
📋 Context for scope conflicts: {...}
🔍 Found scope conflicts: [...]
⚠️ Highlighting scopes with conflicts: ["scope1", "scope2"]
🎯 Looking for scope element 'scope1': <tr data-scope-name="scope1">
✨ Adding conflict highlight to scope: scope1
```

## Test 5: Data-attributter på scope-elementer
### Steg:
1. Gå til Scopes-fanen på en klient
2. Høyreklikk på en scope-rad → "Inspect Element"
3. Sjekk om `<tr>`-elementet har `data-scope-name`-attributt

### Forventet resultat:
```html
<tr data-scope-name="navnet-på-scopet">
  <td>navnet-på-scopet</td>
  <td>...</td>
</tr>
```

## Test 6: CSS-animasjoner
### Steg:
1. Når highlighting aktiveres, sjekk at CSS-klassene er aktive
2. Kontroller at animasjonen faktisk vises

### Forventet resultat:
- `.scope-conflict-highlight` klasse legges til konflikterende rader
- Orange pulserende animasjon er synlig
- Animasjonen følger `pulse-conflict` keyframes

## Test 7: Edge cases
### Test med klient uten scopes:
- Kontroller at det ikke oppstår feil når klient har tom scopes-array

### Test med scopes uten levetid-begrensninger:
- Kontroller at scopes uten `authorization_max_lifetime` eller `at_max_age` ikke forårsaker konflikter

### Test med null/undefined-verdier:
- Kontroller at funksjonen håndterer manglende data gracefully

## Feilsøking

### Hvis highlighting ikke fungerer:
1. Sjekk at `data-scope-name` attributter er lagt til scope-rader
2. Kontroller console for feilmeldinger i `highlightScopeConflicts`
3. Verifiser at CSS-klassen `.scope-conflict-highlight` eksisterer

### Hvis konflikter ikke detekteres:
1. Kontroller at `client.scopes` inneholder faktiske scope-navn
2. Sjekk at `availableScopes` har levetid-data (`authorization_max_lifetime`, `at_max_age`)
3. Verifiser at klientens `authorization_lifetime` og `access_token_lifetime` er satt

### Hvis AI-suggestions ikke vises:
1. Kontroller at `context.scopeConflicts` er populert
2. Sjekk at `getContextualSuggestions` kalles med riktig context
3. Verifiser at `context.page` er 'client-details'

## Debugging-kommandoer for console
```javascript
// Se current context
console.log('Current AI context:', aiAssistantContext);

// Manuelt trigge highlighting
if (window.highlightScopeConflicts) {
  window.highlightScopeConflicts(aiAssistantContext);
}

// Se alle scope-elementer
console.log('Scope elements:', document.querySelectorAll('[data-scope-name]'));

// Se CSS-klasser på scope-elementer
document.querySelectorAll('[data-scope-name]').forEach(el => {
  console.log(`${el.dataset.scopeName}:`, el.className);
});
```
