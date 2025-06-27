import * as URI from 'uri-js';
import { URIComponents } from 'uri-js';

import { ApplicationType } from '~/lib/clients';
import { UriTypes } from '~/components/context/UriContext';

const doesNotContainFragment = (parsedUri: URIComponents) => {
    if (parsedUri.fragment !== undefined) {
        return { success: false, message: 'validation.uri.noFragmentAllowed' };
    }
    return { success: true };
};

const containsScheme = (parsedUri: URIComponents, applicationType: ApplicationType) => {
    if ((applicationType === ApplicationType.WEB || applicationType === ApplicationType.BROWSER) && !['http', 'https'].includes(parsedUri.scheme!.toLowerCase())) {
        return { success: false, message: 'validation.uri.invalidSchemeForWebOrBrowser' };
    } else if (!parsedUri.scheme) {
        return { success: false, message: 'validation.uri.missingScheme' };
    }
    return { success: true };
};

const isHttpOrHttpsWithHost = (parsedUri: URIComponents) => {
    if (['http', 'https'].includes(parsedUri.scheme!.toLowerCase())) {
        if (parsedUri.host === undefined || parsedUri.host === '') {
            return { success: false, message: 'validation.uri.missingHost' };
        }
    }
    return { success: true };
};

export const validateUri = (uri: string, applicationType: ApplicationType) => {
    try {
        const parsedUri = URI.parse(uri);

        const fragmentResult = doesNotContainFragment(parsedUri)
        if (!fragmentResult.success) return fragmentResult

        const schemeResult = containsScheme(parsedUri, applicationType)
        if (!schemeResult.success) return schemeResult

        const hostResult = isHttpOrHttpsWithHost(parsedUri)
        if (!hostResult.success) return hostResult

        return { success: true };
    } catch {
        return { success: false, message: 'validation.uri.invalid_uri' };
    }
}

export const validateFrontchannelLogoutUri = (uri: string, applicationType: ApplicationType, redirectUris: UriTypes['redirectUris']) => {
    if (applicationType !== ApplicationType.NATIVE) {
        try {
            const parsedUri = URI.parse(uri);

            const match = Array.from(redirectUris).some((redirectStr) => {
                const redirectUri = URI.parse(redirectStr.uri);
                return parsedUri.scheme === redirectUri.scheme &&
                    parsedUri.host === redirectUri.host &&
                    parsedUri.port === redirectUri.port;
            });

            if (!match) {
                return { success: false, message: 'validation.uri.logoutUriMismatch' };
            }
        } catch {
            return { success: false, message: 'validation.uri.logoutUriInvalidOrShort' };
        }
    }
    return { success: true };
}