import { ClientActionFunctionArgs, redirect, useActionData, useLoaderData } from 'react-router';

import { useTranslation } from '~/lib/i18n';
import { ScopeForm } from '~/components/ScopeForm';
import { ScopeService } from '~/lib/scopes';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { isErrorResponse } from '~/lib/errors';
import AlertWrapper from '~/components/util/AlertWrapper';
import { Authorization } from '~/lib/auth';
import { ApiClient } from '~/lib/api_client';
import { StatusColor, StatusMessage } from '~/lib/status';

/**
 * Loader function to fetch the necessary data for the Add Scope page. It requires the user to be authenticated and fetches scope prefixes and delegation sources.
 *
 * @returns An object containing prefixes and delegation sources, or an error response if there was an error.
 */
export async function clientLoader() {
    await Authorization.requireAuthenticatedUser();
    const scopeService = await ScopeService.create();
    const apiClient = await ApiClient.create();

    const [prefixesResult, delegationSourcesResult] = await Promise.all([
        scopeService.getScopePrefixes(),
        apiClient.getDeletagionSources()
    ]);

    const { data: prefixes, error: prefixesError } = prefixesResult;
    const { data: delegationSources, error: delegationSourcesError } = delegationSourcesResult;

    const error = prefixesError || delegationSourcesError;
    return error ? error.toErrorResponse() : { prefixes, delegationSources };
}

/**
 * Function to handle the client action for adding a new scope. It processes the form data submitted from the Add Scope form and returns a redirect or an error message.
 *
 * @param request - The request object containing the form data for adding a new scope.
 */
export async function clientAction({ request }: ClientActionFunctionArgs) {
    const scopeService = await ScopeService.create();
    const formData = await request.formData();

    const { error } = await scopeService.addScope(formData);

    if (error) {
        return { error: error.userMessage }
    }

    StatusMessage.set('scope_page.successful_create', StatusColor.success)
    return redirect('/scopes');
}

/**
 * AddScope component that renders the form for adding a new scope. It uses the loader to fetch necessary data such as scope prefixes and delegation sources, and displays any error messages from the action.
 *
 * @constructor - This component fetches the necessary data for the Add Scope page and renders the ScopeForm component with the fetched data.
 */
export default function AddScope() {
    const { t } = useTranslation();
    const actionData = useActionData<typeof clientAction>();
    const data = useLoaderData<typeof clientLoader>();

    if (isErrorResponse(data)) {
        return <AlertWrapper message={data.error} type="error"/>;
    }

    const { prefixes, delegationSources } = data;

    return (
        <>
            <HeadingWrapper level={2} heading={t('scope_page.add_scope')} className="pb-3"/>
            <ScopeForm delegationSources={delegationSources} scopePrefixes={prefixes} error={actionData?.error}/>
        </>
    )
}
