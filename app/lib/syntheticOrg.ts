import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';

import { ApiClient } from '~/lib/api_client';

export const syntheticOrgSchema = z.object({
    synthetic_orgno: z.string(({ message: 'validation.orgno_required' })).regex(/^\d{9}$/, ({ message: 'validation.orgno_must_be_9_digits' }))
});

export class SyntheticOrgService {
    constructor(private readonly apiClient: ApiClient) {}

    static async create() {
        const apiClient = await ApiClient.create();
        return new SyntheticOrgService(apiClient);
    }

    changeSyntheticOrgno(formData: FormData) {
        const parsed = parseWithZod(formData, { schema: syntheticOrgSchema });
        return this.apiClient.updateSyntheticOrgno(parsed.payload.synthetic_orgno as string)
    }
}