import { useFetcher } from 'react-router';
import { createContext, useContext } from 'react';

export enum Language {
    Norwegian = 'nb',
    English = 'en',
}

export const allLanguages = [Language.Norwegian, Language.English];

export enum ColorMode {
    Light = 'light',
    Dark = 'dark',
    Auto = 'auto',
}

export enum Setting {
    ColorMode = 'colorMode',
    Language = 'language',
}

const defaultValues = {
    [Setting.ColorMode]: ColorMode.Auto,
    [Setting.Language]: Language.Norwegian,
};

export const UserSettingsContext = createContext(defaultValues);

export const useLanguage = (): [Language, (newLanguage: Language) => void] => {
    const userSettings = useContext(UserSettingsContext);
    const fetcher = useFetcher();

    const language = userSettings[Setting.Language];

    const setLanguage = (value: Language) => {
        fetcher.submit({ [Setting.Language]: value }, { method: 'patch', action: '/settings' });
    }

    return [language, setLanguage];
};

export const useColorMode = (): [ColorMode, (newColorMode: ColorMode) => void] => {
    const userSettings = useContext(UserSettingsContext);
    const fetcher = useFetcher();

    const colorMode = userSettings[Setting.ColorMode];

    const setColorMode = (value: ColorMode) => {
        fetcher.submit({ [Setting.ColorMode]: value }, { method: 'patch', action: '/settings' });
    }

    return [colorMode, setColorMode];
};

export const getSetting = (setting: Setting) => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    return settings[setting] ?? defaultValues[setting];
};

export const setSettings = (updatedSettings: Record<string, any>) => {
    let settings = JSON.parse(localStorage.getItem('settings') || '{}');
    settings = { ...settings, ...updatedSettings };
    localStorage.setItem('settings', JSON.stringify(settings));
};
