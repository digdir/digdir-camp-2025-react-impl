import { ClientActionFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';

import { ApiClient } from '~/lib/api_client';
import { ErrorMessage } from '~/lib/errors';
import { StatusColor, StatusMessage } from '~/lib/status';
import { SyntheticOrgService } from '~/lib/syntheticOrg';

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
    const apiClient = await ApiClient.create();
    const { data: organization, error } = await apiClient.getOrganizationName(params.orgno!);

    if (error) {
        return error.toErrorResponse();
    }

    if (!organization?.name) {
        return { error: ErrorMessage.OrganizationNameNotFound }
    }

    return { organizationName: organization.name };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
    const formData = await request.formData();
    const syntheticOrgService = await SyntheticOrgService.create();
    const { error } = await syntheticOrgService.changeSyntheticOrgno(formData);

    if (error) {
        return { error: error.userMessage };
    }

    StatusMessage.set('syntehtic_org_successful_change', StatusColor.success);
    return { success: true };
}
