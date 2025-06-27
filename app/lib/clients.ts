import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';

import { ApiClient } from '~/lib/api_client';
import { validateFrontchannelLogoutUri, validateUri } from '~/lib/uriValidator';
import { UriTypes } from '~/components/context/UriContext';

import { AddClientRequest, Client, ClientOnBehalfOf, UpdateClientRequest } from './models';
import { isChecked } from './utils';

// The allowed integration types for new clients and scopes.
export enum IntegrationType {
    ANSATTPORTEN = 'ansattporten',
    IDPORTEN = 'idporten',
    KRR = 'krr',
    MASKINPORTEN = 'maskinporten',
    API_KLIENT = 'api_klient',
    IDPORTEN_SAML2 = 'idporten_saml2',
};

export enum ApplicationType {
    WEB = 'web',
    NATIVE = 'native',
    BROWSER = 'browser',
};

export enum TokenAuthenticationMethod {
    NONE = 'none',
    PRIVATE_KEY_JWT = 'private_key_jwt',
    CLIENT_SECRET_POST = 'client_secret_post',
    CLIENT_SECRET_BASIC = 'client_secret_basic',
}

export class ClientService {
    constructor(private readonly apiClient: ApiClient) {}

    static async create() {
        const apiClient = await ApiClient.create();
        return new ClientService(apiClient);
    }

    getClient(clientId: string) {
        return this.apiClient.getClient(clientId);
    }

    getClients() {
        return this.apiClient.getClients();
    }

    addClient(formData: FormData) {
        const integrationType = formData.get('integration_type') as IntegrationType;
        const { payload } = parseWithZod(formData, { schema: getSchema(integrationType) });

        // Check if scope is a string and split it, otherwise default to an empty array
        const scopeValue = typeof payload.scope === 'string' ? payload.scope : '';
        const scopes = scopeValue.trim() ? scopeValue.split(',').map(s => s.trim()) : [];

        const newClient: AddClientRequest = {
            ...convertClientFormDataToClient(integrationType, payload),
            scopes
        };

        return this.apiClient.addClient(newClient);
    }

    async updateClient(clientId: string, formData: FormData) {
        const integrationType = formData.get('integration_type') as IntegrationType;
        const { payload } = parseWithZod(formData, { schema: getSchema(integrationType) });

        const { data } = await this.apiClient.getClient(clientId)
        const updatedClient: UpdateClientRequest = {
            ...data,
            ...convertClientFormDataToClient(integrationType, payload),
        };

        return this.apiClient.updateClient(updatedClient);
    }

    deleteClient(clientId: string) {
        return this.apiClient.deleteClient(clientId);
    }

    addKey(clientId: string, jwk: string) {
        return this.apiClient.addJwk(clientId, jwk);
    }

    deleteJwk(clientId: string, kid: string) {
        return this.apiClient.deleteJwk(clientId, kid);
    }

    async addScope(clientId: string, scopes: string[]) {
        const { data, error } = await this.apiClient.getClient(clientId)

        if (error) {
            return { error };
        }

        data.scopes = [...(data.scopes || []), ...scopes];

        return this.apiClient.updateScopesOnClient(data)
    }

    async removeScope(clientId: string, scopeToRemove: string) {
        const { data, error } = await this.apiClient.getClient(clientId)

        if (error) {
            return { error };
        }

        data.scopes = data.scopes?.filter((scope: string) => scope !== scopeToRemove)

        return this.apiClient.updateScopesOnClient(data)
    }

    addOnBehalfOf(clientId: string, onBehalfOf: ClientOnBehalfOf) {
        return this.apiClient.addOnBehalfOf(clientId, onBehalfOf);
    }

    editOnBehalfOf(clientId: string, onBehalfOf: ClientOnBehalfOf) {
        return this.apiClient.editOnBehalfOf(clientId, onBehalfOf);
    }

    removeOnBehalfOf(clientId: string, onBehalfOfId: string) {
        return this.apiClient.deleteOnBehalfOf(clientId, onBehalfOfId);
    }

    generateClientSecret(clientId: string) {
        return this.apiClient.generateClientSecret(clientId);
    }
}

const baseSchema = z.object({
    client_name: z.string(({ message: 'validation.title_required' })),
    description: z.string(({ message: 'validation.client_description_required' })),
    integration_type: z.enum([IntegrationType.ANSATTPORTEN, IntegrationType.IDPORTEN, IntegrationType.MASKINPORTEN, IntegrationType.KRR, IntegrationType.API_KLIENT, IntegrationType.IDPORTEN_SAML2]),
    client_orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' })).optional(),
    scope: z.array(z.string()).optional()
});

const idportenGrantTypes = z.enum(['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'implicit']);

export const idportenSchema = baseSchema.extend({
    application_type: z.enum([ApplicationType.WEB, ApplicationType.NATIVE, ApplicationType.BROWSER]),
    token_endpoint_auth_method: z.enum([
        TokenAuthenticationMethod.NONE,
        TokenAuthenticationMethod.PRIVATE_KEY_JWT,
        TokenAuthenticationMethod.CLIENT_SECRET_POST,
        TokenAuthenticationMethod.CLIENT_SECRET_BASIC]),
    grant_types: z.union([z.array(idportenGrantTypes), idportenGrantTypes]), // it's a single string/value if only one selected, array if multiple
    client_redirect: z.string().optional(), //This is not used for submission, only for displaying the field's error if redirect_uris is empty
    frontchannel_logout_uri: z.string().optional(),
    code_challenge_method: z.enum(['S256', 'none']),
    frontchannel_logout_session_required: z.boolean().optional(),
    sso_disabled: z.boolean().optional(),
    refresh_token_usage: z.enum(['ONETIME', 'REUSE']),
    access_token_lifetime: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(1, { message: 'validation.must_be_greater_than_zero' }),
    refresh_token_lifetime: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(1, { message: 'validation.must_be_greater_than_zero' })
        .optional(),
    authorization_lifetime: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(1, { message: 'validation.must_be_greater_than_zero' }),
})

const maskinportenSchema = baseSchema.extend({
    application_type: z.enum(['web']),
    token_endpoint_auth_method: z.enum(['private_key_jwt']),
    grant_types: z.enum(['urn:ietf:params:oauth:grant-type:jwt-bearer']),
    access_token_lifetime: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(1, { message: 'validation.must_be_greater_than_zero' }),
});

export const onBehalfOfSchema = z.object({
    onbehalfof: z.string(({ message: 'validation.onbehalfof_required' })),
    name: z.string(({ message: 'validation.customer_name_required' })),
    orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' })),
    description: z.string(({ message: 'validation.description_required' })),
});

const dynamicSchema = (redirectUris: UriTypes['redirectUris'], postLogoutUris: UriTypes['postLogoutUris']) => {
    return z.object({
        ...Object.fromEntries(
            redirectUris.map(redirectUri => [
                redirectUri.id,
                z.string(),
            ])
        ),
        ...Object.fromEntries(
            postLogoutUris.map(postLogoutUri => [
                postLogoutUri.id,
                z.string(),
            ])
        ),
    })
}

export const combinedSchema = (redirectUris: UriTypes['redirectUris'], postLogoutUris: UriTypes['postLogoutUris'], applicationType: ApplicationType) => {
    return idportenSchema.merge(dynamicSchema(redirectUris, postLogoutUris)).superRefine((value, ctx) => {
        if (redirectUris.length === 0) {
            ctx.addIssue({
                path: ['client_redirect'],
                code: z.ZodIssueCode.custom,
                message: 'validation.uri.redirect_uri_required',
            });
        }

        redirectUris.forEach((redirectUri) => {
            const fieldKey = redirectUri.id;
            const result = validateUri(value[fieldKey], applicationType);

            if (!result.success) {
                ctx.addIssue({
                    path: [fieldKey],
                    code: z.ZodIssueCode.custom,
                    message: result.message,
                })
            }
        })

        postLogoutUris.forEach((postLogoutUri) => {
            const fieldKey = postLogoutUri.id;
            const result = validateUri(value[fieldKey], applicationType);

            if (!result.success) {
                ctx.addIssue({
                    path: [fieldKey],
                    code: z.ZodIssueCode.custom,
                    message: result.message,
                })
            }
        })

        if (value.frontchannel_logout_uri) {
            const uriResult = validateUri(value.frontchannel_logout_uri, applicationType);
            if (!uriResult.success) {
                ctx.addIssue({
                    path: ['frontchannel_logout_uri'],
                    code: z.ZodIssueCode.custom,
                    message: uriResult.message,
                });
            }

            const frontchannelLogoutUriResult = validateFrontchannelLogoutUri(value.frontchannel_logout_uri, applicationType, redirectUris);
            if (!frontchannelLogoutUriResult.success) {
                ctx.addIssue({
                    path: ['frontchannel_logout_uri'],
                    code: z.ZodIssueCode.custom,
                    message: frontchannelLogoutUriResult.message,
                });
            }
        }
    })
}

export type BaseSchema = z.infer<typeof baseSchema>;
export type IdportenSchema = z.infer<typeof idportenSchema>;
export type MaskinportenSchema = z.infer<typeof maskinportenSchema>;

export const getSchema = (selectedService: string) => {
    switch (selectedService) {
    case IntegrationType.ANSATTPORTEN:
    case IntegrationType.API_KLIENT:
    case IntegrationType.IDPORTEN:
        return idportenSchema;
    case IntegrationType.MASKINPORTEN:
    case IntegrationType.KRR:
        return maskinportenSchema;
    default:
        return baseSchema;
    }
};

// Convert client form data to API model according to integration type
export const convertClientFormDataToClient = (integrationType: IntegrationType, formData: Record<string, any>): Client => {
    if (integrationType === IntegrationType.MASKINPORTEN || integrationType === IntegrationType.KRR) {
        const data = formData as BaseSchema & MaskinportenSchema;
        return {
            client_name: data.client_name,
            client_orgno: data.client_orgno,
            description: data.description,
            integration_type: data.integration_type,
            application_type: data.application_type,
            grant_types: [data.grant_types],
            token_endpoint_auth_method: data.token_endpoint_auth_method,
            access_token_lifetime: data.access_token_lifetime
        }
    } else {
        const data = formData as BaseSchema & IdportenSchema;
        const redirect_uris = Object.entries(data)
            .filter(([key]) => key.startsWith('redirect_uri#'))
            .map(([, value]) => value)
            .filter((uri): uri is string => typeof uri === 'string');

        const post_logout_redirect_uris = Object.entries(data)
            .filter(([key]) => key.startsWith('post_logout_redirect_uri#'))
            .map(([, value]) => value)
            .filter((uri): uri is string => typeof uri === 'string');

        return {
            client_name: data.client_name,
            client_orgno: data.client_orgno,
            description: data.description,
            application_type: data.application_type,
            integration_type: data.integration_type,
            token_endpoint_auth_method: data.token_endpoint_auth_method,
            grant_types: (Array.isArray(data.grant_types) ? data.grant_types : [data.grant_types]),
            redirect_uris: redirect_uris,
            post_logout_redirect_uris: post_logout_redirect_uris,
            frontchannel_logout_uri: data.frontchannel_logout_uri,
            frontchannel_logout_session_required: isChecked(data.frontchannel_logout_session_required),
            sso_disabled: isChecked(data.sso_disabled),
            code_challenge_method: data.code_challenge_method,
            refresh_token_usage: data.refresh_token_usage,
            access_token_lifetime: data.access_token_lifetime,
            refresh_token_lifetime: data.refresh_token_lifetime,
            authorization_lifetime: data.authorization_lifetime,
        };

    }
}

export function validateClientForm(
    formData: FormData,
    uris: UriTypes,
    setUriValidationError: (v: boolean) => void
) {
    const integration_type = formData.get('integration_type') as IntegrationType;
    const application_type = formData.get('application_type') as ApplicationType;

    let schema: z.ZodTypeAny;

    if (integration_type === IntegrationType.MASKINPORTEN) {
        schema = getSchema(integration_type);
    } else {
        schema = combinedSchema(uris.redirectUris, uris.postLogoutUris, application_type);
    }

    const result = parseWithZod(formData, { schema });

    const uriSensitiveTypes = [
        IntegrationType.IDPORTEN,
        IntegrationType.ANSATTPORTEN,
        IntegrationType.API_KLIENT
    ];

    if (uriSensitiveTypes.includes(integration_type)) {
        if (result.status === 'success') {
            setUriValidationError(false);
        } else if (result.status === 'error') {
            const isOnlyUriErrors = Object.keys(result.error!).every((key) =>
                key.startsWith('client_redirect') ||
                key.startsWith('redirect_uri') ||
                key.startsWith('post_logout_redirect_uri')
            );
            setUriValidationError(isOnlyUriErrors);
        }
    }

    return result;
}