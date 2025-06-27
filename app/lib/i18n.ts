import { allLanguages, getSetting, Language, Setting } from './settings';

const translations = new Map<Language, Record<string, any>>();

export async function fetchTranslations(primaryLanguage: Language) {
    // Find which languages are missing.
    const languagesToLoad = allLanguages.filter(language => !translations.has(language));

    if (languagesToLoad.length === 0) {
        return; // All languages are already loaded
    }

    // Make sure primary language is available to the app to avoid flickering
    // from translation keys to translation values after translations have been
    // fetched.
    if (languagesToLoad.includes(primaryLanguage)) {
        const response = await fetch(`/translations/${primaryLanguage}.json`);
        translations.set(primaryLanguage, await response.json());
        // Remove primary language from the list to avoid loading it twice
        languagesToLoad.splice(languagesToLoad.indexOf(primaryLanguage), 1);
    }

    // Load the rest of the languages in parallel. This can be done in the
    // background (without await) since the user is *very* unlikely to switch
    // languages within milliseconds after loading the app :)
    languagesToLoad.map(async language => {
        const response = await fetch(`/translations/${language}.json`);
        translations.set(language, await response.json());
    });
}

export type TranslationOptions = {
    count?: number;
}

export function useTranslation() {
    const language = getSetting(Setting.Language);
    const languageTranslations = translations.get(language);

    return {
        t: (key: string | string[], options?: TranslationOptions): string => {
            const keyString = Array.isArray(key) ? key[0] : key;

            if (!languageTranslations) {
                return keyString;
            }

            return findTranslation(languageTranslations, keyString, options?.count);
        },
    };
}

export const findTranslation = (translations: Record<string, any>, key: string, count?: number): string => {
    let translationKey = key;

    switch (count) {
    case undefined:
        break;
    case 1:
        translationKey = `${key}_one`;
        break;
    default:
        translationKey = `${key}_other`;
    }

    const keys = translationKey.split('.');
    for (const [index, keyItem] of keys.entries()) {
        if (index === keys.length - 1) {
            return (translations && translations[keyItem]) || key;
        }
        translations = translations[keyItem];
    }

    return key;
}
