import { createContext } from 'react';

/**
 * AppConfig represents the configuration of the application.
 *
 * The configuration is fetched from the server at runtime because it is different
 * for each environment.
 */
export type AppConfig = {
    apiUrl: string;
    baseUrl: string;
    issuerBaseUrl: string;
    clientId: string;
    environment?: Environment;
};

export enum Environment {
    Local = 'local',
    Dev = 'dev',
    Test = 'test',
    Prod = 'prod',
}

export const ConfigContext = createContext<AppConfig | null>(null);

// Use a promise to ensure config is only fetched once
let appConfigPromise: Promise<AppConfig> | null = null;

/**
 * Fetches the application configuration from the server.
 *
 * This is intentionally not a React hook because the configuration is needed
 * also in clientLoaders.
 *
 * The config will only be fetched once, even if this function is called multiple times.
 *
 * @returns The application configuration.
 */
export const fetchAppConfig = async (): Promise<AppConfig> => {
    if (!appConfigPromise) {
        appConfigPromise = fetch('/config.json').then(response => response.json());
    }

    return appConfigPromise;
};
