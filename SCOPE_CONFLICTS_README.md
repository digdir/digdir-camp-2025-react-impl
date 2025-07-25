# Scope Lifetime Conflict Detection - Implementasjonsguide

## Oversikt

Denne implementasjonen legger til funksjonalitet for å oppdage og markere scope-levetid-konflikter i AI-assistenten. Dette løser problemet der scopes med lavere levetid enn klientens innstillinger fører til uventet utlogging.

## Implementerte komponenter

### 1. Context Builder (`app/lib/context-builder.ts`)

**Ny funksjon**: `analyzeScopeLifetimeConflicts()`
- Sammenligner klientens levetid-innstillinger med scope-begrensninger
- Oppdager to typer konflikter:
  - `authorization_lifetime_conflict`: Scope har lavere autorisasjonslevetid
  - `access_token_lifetime_conflict`: Scope har lavere access token levetid

**Utvidet**: `buildClientContext()`
- Inkluderer nå `scopeConflicts` array i konteksten
- Legger til `hasConfigurationIssues` flagg

### 2. AI Assistant (`app/components/ai/AiAssistant.tsx`)

**Ny funksjon**: `highlightScopeConflicts()`
- Markerer scope-rader med konflikter i UI
- Bruker orange pulserende animasjon
- Scrolliner til første konflikt

**Utvidet**: `HighlightAction` interface
- Støtter nå `highlight-scope-conflict` action
- Inkluderer `scopeName` og `conflictType` felter

**Forbedret**: `getContextualSuggestions()`
- Viser prioriterte forslag når konflikter oppdages
- Indikerer antall konflikter per type

**Oppdatert**: Tab event handling
- Lytter på scopes-tab klikk
- Automatisk highlighting når tab aktiveres

### 3. Styling (`app/styles/client-page.css`)

**Ny CSS klasse**: `.scope-conflict-highlight`
- Orange pulserende border og bakgrunn
- Smooth animasjon med `pulse-conflict` keyframes
- Z-index for å sikre synlighet

### 4. Scope UI (`app/routes/clients.$id/scopes.tsx`)

**Utvidet**: Table.Row komponenter
- Legger til `data-scope-name` attributt
- Muliggjør targeting av spesifikke scopes for highlighting

## Bruksscenarier

### Scenario 1: Autorisasjonslevetid-konflikt
```
Klient: authorization_lifetime = 7200s (2 timer)
Scope: authorization_max_lifetime = 3600s (1 time)
→ Resultat: Bruker logges ut etter 1 time, ikke 2 timer som forventet
```

### Scenario 2: Access token-konflikt
```
Klient: access_token_lifetime = 3600s (1 time)
Scope: at_max_age = 1800s (30 minutter)
→ Resultat: Access tokens utløper etter 30 min, ikke 1 time som forventet
```

## Hvordan det fungerer

1. **Deteksjon**: Når klient-kontekst bygges, sammenlignes alle scope-levetider med klientens innstillinger
2. **Kontekst**: Konflikter lagres i AI-assistentens kontekst med detaljert informasjon
3. **Suggestions**: AI viser proaktive forslag når konflikter oppdages
4. **Highlighting**: Ved navigering til scopes-tab markeres konflikterende scopes automatisk
5. **Informasjon**: Brukeren får konkrete løsningsforslag for hver konflikt

## Testing

Kjør test-scriptet for å se funksjonaliteten:
```bash
node test-scope-conflicts.js
```

Dette viser eksempler på:
- Enkelt scenario med en konflikt
- Scenario uten konflikter  
- Scenario med multiple konflikter

## Utvidelsesmuligheter

Implementasjonen er designet for utvidelse til andre typer konfigurasjonsfeil:
- Scope-visibility konflikter
- Grant-type inkompatibilitet
- Redirect URI validering
- JWK expiry conflicts (allerede implementert)

## Neste steg

1. Test implementasjonen i utviklingsmiljø
2. Utvid til andre konfigurasjonsfeil-scenarioer
3. Legg til telemetri for å spore hyppighet av konflikter
4. Implementer automatiske forslag for optimale innstillinger

## Tekniske detaljer

- **Språk**: TypeScript/React
- **Styling**: CSS med keyframe animasjoner
- **State management**: React Context API
- **Event handling**: DOM event listeners
- **Data flow**: Context Builder → AI Assistant → UI Highlighting
