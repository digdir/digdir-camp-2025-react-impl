import { join } from 'path';

import { describe, expect, test } from 'vitest'

import en from 'public/translations/en.json';
import nb from 'public/translations/nb.json';

import { sortJsonFile } from '../../scripts/sort_translation_keys';

import { findTranslation } from './i18n';

const translations = {
    cancel: 'Cancel',
    client_one: 'Client',
    client_other: 'Clients',
    client_page: {
        add_client: 'Add client',
    },
}

//Custom color in workflow console
const orange = (text: string) => `\x1b[38;5;208m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[38;5;226m${text}\x1b[0m`;

describe('find translation', () => {
    test('for simple key', () => {
        expect(findTranslation(translations, 'cancel')).toBe('Cancel');
    });

    test('for simple key, not found', () => {
        expect(findTranslation(translations, 'cancel_not_found')).toBe('cancel_not_found');
    });

    test('for nested key', () => {
        expect(findTranslation(translations, 'client_page.add_client',)).toBe('Add client');
    });

    test('for nested key, not found', () => {
        expect(findTranslation(translations, 'client_page.add_client_not_found',)).toBe('client_page.add_client_not_found');
        expect(findTranslation(translations, 'scope_page.scope_not_found',)).toBe('scope_page.scope_not_found');
    });

    test('for single count', () => {
        expect(findTranslation(translations, 'client', 1)).toBe('Client');
    });

    test('for zero count', () => {
        expect(findTranslation(translations, 'client', 0)).toBe('Clients');
    });


    test('for positive plural count', () => {
        expect(findTranslation(translations, 'client', 2)).toBe('Clients');
    });

    test('for negative plural count', () => {
        expect(findTranslation(translations, 'client', -2)).toBe('Clients');
    });
});

describe('Ensure translations are sorted', () => {
    test('all keys should be sorted alphabetically', () => {
        const enKeys = getAllKeys(en);
        const nbKeys = getAllKeys(nb);

        const enSortedKeys = getAllKeys(sortJsonFile(join('public', 'translations', 'en.json')));
        const nbSortedKeys = getAllKeys(sortJsonFile(join('public', 'translations', 'nb.json')));

        const unsortedEnglishKeys: string[] = []
        enKeys.forEach((key, index) => {
            if (key !== enSortedKeys[index]) {
                unsortedEnglishKeys.push(key);
            }
        });

        const unsortedNorwegianKeys: string[] = []
        nbKeys.forEach((key, index) => {
            if (key !== nbSortedKeys[index]) {
                unsortedNorwegianKeys.push(key);
            }
        });

        if (unsortedEnglishKeys.length > 0) {
            console.error(orange('English translations are not sorted. Try "npm run sort-translations" before committing again.'));
            console.error(yellow('Unsorted keys in en.json: '), unsortedEnglishKeys);
        }

        if (unsortedNorwegianKeys.length > 0) {
            console.error(orange('Norwegian translations are not sorted. Try "npm run sort-translations" before committing again.'));
            console.error(yellow('Unsorted keys in nb.json: '), unsortedNorwegianKeys);
        }

        expect(enKeys).toEqual(enSortedKeys);
        expect(nbKeys).toEqual(nbSortedKeys);
    });
});

describe('Compare transaltion keys', () => {
    test('all keys in en.json should be present in nb.json', () => {
        const enKeys = getAllKeys(en);
        const nbKeys = getAllKeys(nb);

        const missingNorwegianKeys = enKeys.filter(key => !nbKeys.includes(key));
        const missingEnglishKeys = nbKeys.filter(key => !enKeys.includes(key));

        if (missingNorwegianKeys.length > 0) {
            console.error('Missing keys in nb.json:', missingNorwegianKeys);
        }

        if (missingEnglishKeys.length > 0) {
            console.error('Missing keys in en.json:', missingEnglishKeys);
        }

        expect(missingNorwegianKeys).toHaveLength(0);
        expect(missingEnglishKeys).toHaveLength(0);
    });
});

// Gets all keys in a json file. Takes nested keys into account through recursion
// (client_page.onbehalfof.add_onbehalfof for example)
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
    return Object.entries(obj).reduce((keys, [key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...getAllKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
        return keys;
    }, [] as string[]);
}