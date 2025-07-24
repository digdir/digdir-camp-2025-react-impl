import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';

import { ApiClient } from '~/lib/api_client';
import { validateFrontchannelLogoutUri, validateUri } from '~/lib/uriValidator';
import { UriTypes } from '~/components/context/UriContext';

import { AddClientRequest, Client, ClientOnBehalfOf, UpdateClientRequest } from './models';
import { isChecked } from './utils';

/**
 * Enum representing the different integration types for clients.
 */
export enum IntegrationType {
    ANSATTPORTEN = 'ansattporten',
    IDPORTEN = 'idporten',
    KRR = 'krr',
    MASKINPORTEN = 'maskinporten',
    API_KLIENT = 'api_klient',
    IDPORTEN_SAML2 = 'idporten_saml2',
};

/**
 * Enum representing the different application types for clients.
 */
export enum ApplicationType {
    WEB = 'web',
    NATIVE = 'native',
    BROWSER = 'browser',
};

/**
 * Enum representing the different token authentication methods for clients.
 */
export enum TokenAuthenticationMethod {
    NONE = 'none',
    PRIVATE_KEY_JWT = 'private_key_jwt',
    CLIENT_SECRET_POST = 'client_secret_post',
    CLIENT_SECRET_BASIC = 'client_secret_basic',
}

/**
 * Service class for managing client operations.
 */
export class ClientService {
    constructor(private readonly apiClient: ApiClient) {}

    /**
     * Creates an instance of ClientService with an ApiClient.
     *
     * @returns {Promise<ClientService>} A promise that resolves to a new instance of ClientService.
     */
    static async create() {
        const apiClient = await ApiClient.create();
        return new ClientService(apiClient);
    }

    /**
     * Fetches a client by its ID.
     *
     * @param clientId - The ID of the client to fetch.
     */
    getClient(clientId: string) {
        return this.apiClient.getClient(clientId);
    }

    /**
     * Fetches all clients.
     *
     * @returns {Promise<Client[]>} A promise that resolves to an array of clients.
     */
    getClients() {
        return this.apiClient.getClients();
    }

    /**
     * Fetches all scopes.
     *
     * @returns {Promise<any>} A promise that resolves to an array of scopes.
     */
    addClient(formData: FormData) {
        const integrationType = formData.get('integration_type') as IntegrationType;
        const { payload } = parseWithZod(formData, { schema: getSchema(integrationType) });

        const scopeValue = typeof payload.scope === 'string' ? payload.scope : '';
        const scopes = scopeValue.trim() ? scopeValue.split(',').map(s => s.trim()) : [];

        const newClient: AddClientRequest = {
            ...convertClientFormDataToClient(integrationType, payload),
            scopes
        };

        return this.apiClient.addClient(newClient);
    }

    /**
     * Updates an existing client.
     *
     * @param clientId - The ID of the client to update.
     * @param formData - The form data containing the updated client information.
     * @returns {Promise<UpdateClientRequest>} A promise that resolves to the updated client request.
     */
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

    /**
     * Deletes a client by its ID.
     *
     * @param clientId - The ID of the client to delete.
     * @returns {Promise<void>} A promise that resolves when the client is deleted.
     */
    deleteClient(clientId: string) {
        return this.apiClient.deleteClient(clientId);
    }

    /**
     * Adds a JWK (JSON Web Key) to a client.
     *
     * @param clientId - The ID of the client to which the JWK will be added.
     * @param jwk - The JSON Web Key to add.
     * @returns {Promise<void>} A promise that resolves when the JWK is added.
     */
    addKey(clientId: string, jwk: string) {
        return this.apiClient.addJwk(clientId, jwk);
    }

    /**
     * Fetches all JWKs (JSON Web Keys) for a client.
     *
     * @param clientId - The ID of the client whose JWKs will be fetched.
     * @returns {Promise<any>} A promise that resolves to an array of JWKs.
     */
    deleteJwk(clientId: string, kid: string) {
        return this.apiClient.deleteJwk(clientId, kid);
    }

    /**
     * Fetches all JWKs (JSON Web Keys) for a client.
     *
     * @param clientId - The ID of the client whose JWKs will be fetched.
     * @returns {Promise<any>} A promise that resolves to an array of JWKs.
     */
    async addScope(clientId: string, scopes: string[]) {
        const { data, error } = await this.apiClient.getClient(clientId)

        if (error) {
            return { error };
        }

        data.scopes = [...(data.scopes || []), ...scopes];

        return this.apiClient.updateScopesOnClient(data)
    }

    /**
     * Removes a scope from a client.
     *
     * @param clientId - The ID of the client from which the scope will be removed.
     * @param scopeToRemove - The scope to remove.
     * @returns {Promise<any>} A promise that resolves when the scope is removed.
     */
    async removeScope(clientId: string, scopeToRemove: string) {
        const { data, error } = await this.apiClient.getClient(clientId)

        if (error) {
            return { error };
        }

        data.scopes = data.scopes?.filter((scope: string) => scope !== scopeToRemove)

        return this.apiClient.updateScopesOnClient(data)
    }

    /**
     * Fetches all scopes for a client.
     *
     * @param clientId - The ID of the client whose scopes will be fetched.
     * @returns {Promise<any>} A promise that resolves to an array of scopes.
     */
    addOnBehalfOf(clientId: string, onBehalfOf: ClientOnBehalfOf) {
        return this.apiClient.addOnBehalfOf(clientId, onBehalfOf);
    }

    /**
     * Edits an existing "on behalf of" entity for a client.
     *
     * @param clientId - The ID of the client for which the "on behalf of" entity will be edited.
     * @param onBehalfOf - The updated "on behalf of" entity.
     */
    editOnBehalfOf(clientId: string, onBehalfOf: ClientOnBehalfOf) {
        return this.apiClient.editOnBehalfOf(clientId, onBehalfOf);
    }

    /**
     * Fetches all "on behalf of" entities for a client.
     *
     * @param clientId - The ID of the client whose "on behalf of" entities will be fetched.
     * @returns {Promise<ClientOnBehalfOf[]>} A promise that resolves to an array of "on behalf of" entities.
     */
    removeOnBehalfOf(clientId: string, onBehalfOfId: string) {
        return this.apiClient.deleteOnBehalfOf(clientId, onBehalfOfId);
    }

    /**
     * Generates a new client secret for a given client ID.
     *
     * @param clientId - The ID of the client for which to generate a new secret.
     */
    generateClientSecret(clientId: string) {
        return this.apiClient.generateClientSecret(clientId);
    }
}

/**
 * Enum representing the different application types for clients.
 */
const baseSchema = z.object({
    client_name: z.string(({ message: 'validation.title_required' })),
    description: z.string(({ message: 'validation.client_description_required' })),
    integration_type: z.enum([IntegrationType.ANSATTPORTEN, IntegrationType.IDPORTEN, IntegrationType.MASKINPORTEN, IntegrationType.KRR, IntegrationType.API_KLIENT, IntegrationType.IDPORTEN_SAML2]),
    client_orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' })).optional(),
    scope: z.array(z.string()).optional()
});

/**
 * Schema for Idporten clients, extending the base schema with additional fields specific to Idporten.
 */
const idportenGrantTypes = z.enum(['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'implicit']);

/**
 * Schema for Idporten clients, extending the base schema with additional fields specific to Idporten.
 */
export const idportenSchema = baseSchema.extend({
    application_type: z.enum([ApplicationType.WEB, ApplicationType.NATIVE, ApplicationType.BROWSER]),
    token_endpoint_auth_method: z.enum([
        TokenAuthenticationMethod.NONE,
        TokenAuthenticationMethod.PRIVATE_KEY_JWT,
        TokenAuthenticationMethod.CLIENT_SECRET_POST,
        TokenAuthenticationMethod.CLIENT_SECRET_BASIC]),
    grant_types: z.union([z.array(idportenGrantTypes), idportenGrantTypes]),
    client_redirect: z.string().optional(),
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

/**
 * Schema for Maskinporten clients, extending the base schema with additional fields specific to Maskinporten.
 */
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

/**
 * Schema for the "on behalf of" form, used to validate the input for adding or editing an "on behalf of" entity.
 */
export const onBehalfOfSchema = z.object({
    onbehalfof: z.string(({ message: 'validation.onbehalfof_required' })),
    name: z.string(({ message: 'validation.customer_name_required' })),
    orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' })),
    description: z.string(({ message: 'validation.description_required' })),
});

/**
 * Dynamic schema generator for redirect and post logout URIs.
 *
 * @param redirectUris - An array of redirect URIs, each with an `id` and `uri`.
 * @param postLogoutUris - An array of post logout URIs, each with an `id` and `uri`.
 */
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

/**
 * Combines the base schema with the dynamic schema for redirect and post logout URIs,
 *
 * @param redirectUris - An array of redirect URIs, each with an `id` and `uri`.
 * @param postLogoutUris - An array of post logout URIs, each with an `id` and `uri`.
 * @param applicationType - The application type, which can be WEB, NATIVE, or BROWSER.
 */
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

/**
 * Base schema for clients, used when no specific integration type is selected.
 */
export type BaseSchema = z.infer<typeof baseSchema>;

/**
 * Schema for Idporten clients, used when the integration type is Idporten.
 */
export type IdportenSchema = z.infer<typeof idportenSchema>;

/**
 * Schema for Maskinporten clients, used when the integration type is Maskinporten or KRR.
 */
export type MaskinportenSchema = z.infer<typeof maskinportenSchema>;


/**
 * Function to get the appropriate schema based on the selected service.
 *
 * @param selectedService - The selected integration type for the client.
 */
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

/**
 * Converts form data to a Client object based on the integration type.
 *
 * @param integrationType - The integration type of the client (e.g., Maskinporten, KRR, Idporten).
 * @param formData - The form data containing client information.
 */
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

/**
 * Validates the client form data against the appropriate schema based on the integration type.
 *
 * @param formData - The form data containing client information.
 * @param uris - The URIs for redirect and post logout, used for validation.
 * @param setUriValidationError - A function to set the URI validation error state.
 */
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
