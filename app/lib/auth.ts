import * as oidcClient from 'openid-client';
import {redirect} from 'react-router';
import {jwtDecode} from 'jwt-decode';

import {AuthenticatedOrganization} from '~/lib/models';
import {ApiClient, ApiResponse} from '~/lib/api_client';
import {StatusColor, StatusMessage} from '~/lib/status';

import {AppConfig, Environment, fetchAppConfig} from './config';
import {FlashStorage} from './storage';


const redirectUri = (appConfig: AppConfig) => {
    return `${appConfig.baseUrl}/auth/callback`;
}

let oidcConfig: oidcClient.Configuration

const getOidcConfig = async () => {
    if (oidcConfig) return oidcConfig;

    const appConfig = await fetchAppConfig();
    oidcConfig = await oidcClient.discovery(new URL(appConfig.issuerBaseUrl), appConfig.clientId, undefined, oidcClient.None());

    return oidcConfig;
}

type AnsattportenOptions = {
    useSyntheticUser?: boolean;
    entraId?: boolean;
    prompt: 'login' | 'consent';
    restoreAfterLoginUrl?: string;
};

let userInfoPromise: Promise<ApiResponse<AuthenticatedOrganization>> | null = null;

export class Authorization {

    static async buildAuthorizationUrl(options: AnsattportenOptions) {
        const appConfig = await fetchAppConfig();

        const state = oidcClient.randomState();
        const nonce = oidcClient.randomNonce();

        const pkceCodeVerifier = oidcClient.randomPKCECodeVerifier();
        const codeChallenge = await oidcClient.calculatePKCECodeChallenge(pkceCodeVerifier);

        const { acrValues, authorizationDetails } = this.authValues(options, appConfig.environment)

        const parameters: Record<string, string> = {
            response_type: 'code',
            scope: 'openid profile',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state,
            nonce,
            prompt: options.prompt,
            redirect_uri: redirectUri(appConfig),
            authorization_details: authorizationDetails,
            acr_values: acrValues
        }

        const authorizationUrl = oidcClient.buildAuthorizationUrl(await getOidcConfig(), parameters);

        FlashStorage.setItem('pkceCodeVerifier', pkceCodeVerifier);
        FlashStorage.setItem('state', state);
        FlashStorage.setItem('nonce', nonce);

        if (options.restoreAfterLoginUrl) {
            FlashStorage.setItem('restoreUrl', options.restoreAfterLoginUrl);
        }

        return authorizationUrl.href;
    };

    private static authValues(options: AnsattportenOptions, environment?: Environment): AuthOptions {

        const altinnResourcesArray = [
            { type: 'ansattporten:altinn:service', resource: 'urn:altinn:resource:5613:1', representation_is_required: 'true' },
            { type: 'ansattporten:altinn:service', resource: 'urn:altinn:resource:5621:1', representation_is_required: 'true', organizationform: 'enterprise' },
            { type: 'ansattporten:altinn:service', resource: 'urn:altinn:resource:5622:1', representation_is_required: 'true' }
        ];

        const entraIdResourcesArray = JSON.stringify([{ type: 'ansattporten:orgno', representation_is_required: 'true' }]);

        if (environment === Environment.Test) {
            altinnResourcesArray.push({
                type: 'ansattporten:altinn:service', resource: 'urn:altinn:resource:6061:1', representation_is_required: 'true'
            });
        }

        const altinnResources = JSON.stringify(altinnResourcesArray);

        const useSyntheticUser = (options.useSyntheticUser ?? localStorage.getItem('useSyntheticUser') === 'true') || false;
        localStorage.setItem('useSyntheticUser', useSyntheticUser ? 'true' : 'false');

        const showOrganizationPicker = environment === Environment.Prod || !useSyntheticUser
        const authorizationDetails = options.entraId ? entraIdResourcesArray : showOrganizationPicker ? altinnResources : JSON.stringify([])

        const acrValues = options.entraId ? AcrValue.EntraId : useSyntheticUser ? AcrValue.Substantial : AcrValue.High;

        return { acrValues, authorizationDetails };
    }

    static async handleCallback(request: Request) {
        const url = new URL(request.url);
        const error = url.searchParams.get('error');

        if (error === 'login_required') {
            throw redirect('/login');
        } else if (error) {
            await this.logout();
        }

        const pkceCodeVerifier = FlashStorage.getItem('pkceCodeVerifier');
        const expectedState = FlashStorage.getItem('state');
        const expectedNonce = FlashStorage.getItem('nonce');

        if (!pkceCodeVerifier || !expectedState || !expectedNonce) {
            await this.clear()
            StatusMessage.set('missing_session_data', StatusColor.danger);
            throw redirect('/login');
        }

        const tokens = await oidcClient.authorizationCodeGrant(await getOidcConfig(), request, {
            pkceCodeVerifier,
            expectedState,
            expectedNonce,
            idTokenExpected: true,
        });

        TokenStorage.storeTokens(tokens);

        const restoreUrl = FlashStorage.getItem('restoreUrl');
        if (restoreUrl) {
            throw redirect(restoreUrl);
        }

        throw redirect('/');
    }

    static async requireAuthenticatedUser(): Promise<void> {
        const hasValidToken = await this.requireValidToken();
        if (!hasValidToken) {
            throw redirect('/login');
        }
    }

    static get accessToken() {
        return TokenStorage.getTokens().accessToken;
    }

    static async clear() {
        localStorage.removeItem('useSyntheticUser');
        TokenStorage.clear();
    }

    static async logout() {
        const appConfig = await fetchAppConfig();
        const oidcConfig = await getOidcConfig();

        const logoutUrl = oidcClient.buildEndSessionUrl(oidcConfig, {
            post_logout_redirect_uri: `${appConfig.baseUrl}`,
        });

        await this.clear();
        throw redirect(logoutUrl.toString());
    }

    static async fetchUserInfo() {

        if (this.accessToken && !userInfoPromise) {
            const apiClient = await ApiClient.create();

            userInfoPromise = apiClient.getUserInfo();

            const { data, error } = await userInfoPromise;
            userInfoPromise = null;
            if (error) {
                console.error(error)
                return '';
            } else {
                return data;
            }
        } else {
            return '';
        }
    }

    static isAccessTokenExpired(): boolean {
        const { accessToken } = TokenStorage.getTokens();
        if (!accessToken) return true;

        try {
            const decoded: { exp: number } = jwtDecode(accessToken);
            const bufferTime = 10 * 1000; // 10 seconds buffer
            return Date.now() >= decoded.exp * 1000 - bufferTime;
        } catch (e) {
            console.error('Failed to decode JWT for expiry check', e);
            return true;
        }
    }

    static async requireValidToken(): Promise<boolean> {
        if (!this.isAccessTokenExpired()) {
            return true;
        }

        const { refreshToken } = TokenStorage.getTokens();
        if (!refreshToken) {
            await this.clear();
            return false;
        }

        try {
            const tokens = await oidcClient.refreshTokenGrant(await getOidcConfig(), refreshToken);
            TokenStorage.storeTokens(tokens);
            return true;
        } catch (e) {
            console.error('Failed to refresh token', e);
            await this.clear();
            return false;
        }
    }
}

enum AcrValue {
    Substantial = 'substantial',
    High = 'high',
    EntraId = 'entraid',
}

type AuthOptions = {
    acrValues: AcrValue;
    authorizationDetails: string;
};

enum TokenKey {
    AccessToken = 'accessToken',
    RefreshToken = 'refreshToken',
}

type Tokens = {
    accessToken: string | null;
    refreshToken: string | null;
};

class TokenStorage {
    static storeTokens(tokens: oidcClient.TokenEndpointResponse) {
        localStorage.setItem(TokenKey.AccessToken, tokens.access_token || '');
        localStorage.setItem(TokenKey.RefreshToken, tokens.refresh_token || '');
    }

    static getTokens(): Tokens {
        const accessToken = localStorage.getItem(TokenKey.AccessToken);
        const refreshToken = localStorage.getItem(TokenKey.RefreshToken);

        return {
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
        };
    }

    static clear() {
        localStorage.removeItem(TokenKey.AccessToken);
        localStorage.removeItem(TokenKey.RefreshToken);
    }
}
