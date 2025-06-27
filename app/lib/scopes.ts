import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';

import { ApiClient } from '~/lib/api_client';

import { IntegrationType } from './clients';
import { Scope } from './models';
import { isChecked } from './utils';

const allowedIntegrationTypes = z.enum([IntegrationType.ANSATTPORTEN, IntegrationType.API_KLIENT, IntegrationType.MASKINPORTEN]);

export const scopeSchema = z.object({
    name: z.string().optional(),
    prefix: z.string(({ message: 'validation.required' })),
    description: z.string(({ message: 'validation.scope_description_required' })),
    subscope: z.string(({ message: 'validation.subscope_required' })),
    active: z.boolean().optional(),
    created: z.string().datetime().optional(),
    last_updated: z.string().datetime().optional(),
    allowed_integration_types: z.union([allowedIntegrationTypes, z.array(allowedIntegrationTypes)]).optional(),
    token_type: z.enum(['SELF_CONTAINED', 'OPAQUE']).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    requires_user_consent: z.boolean().optional(),
    requires_user_authentication: z.boolean().optional(),
    requires_pseudonymous_tokens: z.boolean().optional(),
    delegation_source: z.string().optional(),
    long_description: z.string().regex(
        /^[A-Za-zÆØÅæøåÉéÜüÑñÇç0-9\s.,\-_:;!?'"()/*[\]#\r\n]*$/,
        'validation.consent_form_error'
    ).optional(),
    at_max_age: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(0, { message: 'validation.must_be_positive' }),
    accessible_for_all: z.boolean().optional(),
    authorization_max_lifetime: z
        .number({
            invalid_type_error: 'validation.must_be_number',
            required_error: 'validation.required',
        })
        .min(0, { message: 'validation.must_be_positive' }),
    enforced_aud_for_access_token: z.string().optional(),
});

export const orgnoSchema = z.object({
    consumer_orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' }))
});

export type ScopeSchema = z.infer<typeof scopeSchema>;

const convertScopeFormDataToScope = (data: ScopeSchema): Scope => {
    return {
        ...data,
        name: data.prefix + ':' + data.subscope,
        requires_user_authentication: isChecked(data.requires_user_authentication),
        accessible_for_all: isChecked(data.accessible_for_all),
        requires_user_consent: isChecked(data.requires_user_consent),
        requires_pseudonymous_tokens: isChecked(data.requires_pseudonymous_tokens),
        delegation_source: data.delegation_source ? data.delegation_source as string : undefined,
        active: true,
        allowed_integration_types: (Array.isArray(data.allowed_integration_types)
            ? data.allowed_integration_types.filter(Boolean)
            : [data.allowed_integration_types].filter(Boolean)) as IntegrationType[],
    };
};

export class ScopeService {
    constructor(private readonly apiClient: ApiClient) {}

    static async create() {
        const apiClient = await ApiClient.create();
        return new ScopeService(apiClient);
    }

    getScope(scope: string, inactive: boolean = true) {
        return this.apiClient.getScope(scope, inactive);
    }

    addScope(formData: FormData) {
        const { payload } = parseWithZod(formData, { schema: scopeSchema });
        const scope = convertScopeFormDataToScope(payload as Record<string, any> as ScopeSchema);
        return this.apiClient.addScope(scope);
    };

    updateScope(formData: FormData) {
        const { payload } = parseWithZod(formData, { schema: scopeSchema });
        const scope = convertScopeFormDataToScope(payload as Record<string, any> as ScopeSchema);
        return this.apiClient.updateScope(scope);
    };

    deleteScope(scopeName: string) {
        return this.apiClient.deleteScope(scopeName);
    };

    addScopeAccess(scopeName: string, formData: FormData) {
        const parsed = parseWithZod(formData, { schema: orgnoSchema });
        return this.apiClient.addScopeAccess(parsed.payload.consumer_orgno as string, scopeName)
    }

    deleteScopeAccess(scopeName: string, formData: FormData) {
        const parsed = parseWithZod(formData, { schema: orgnoSchema });
        return this.apiClient.removeScopeAccess(parsed.payload.consumer_orgno as string, scopeName)
    }

    getScopePrefixes() {
        return this.apiClient.getScopePrefixes();
    }
}
