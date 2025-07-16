import { ClientActionFunctionArgs, ClientLoaderFunctionArgs, redirect, useActionData, useLoaderData } from 'react-router';
import { Paragraph, Tabs } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';

import { useTranslation } from '~/lib/i18n';
import { ApiClient, ApiResponse } from '~/lib/api_client';
import ScopeAccess from '~/routes/scopes.$name/access';
import { ScopeForm } from '~/components/ScopeForm';
import { ScopeService } from '~/lib/scopes';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import AlertWrapper from '~/components/util/AlertWrapper';
import { isErrorResponse } from '~/lib/errors';
import { Authorization } from '~/lib/auth';
import { StatusColor, StatusMessage } from '~/lib/status';

import { useState } from 'react';
import AiAssistant from '~/components/ai/AiAssistant';

export enum ActionIntent {
    UpdateScope = 'updateScope',
    DeleteScope = 'deleteScope',
    AddScopeAccess = 'addScopeAccess',
    DeleteScopeAccess = 'deleteScopeAccess'
}

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
    await Authorization.requireAuthenticatedUser();
    const apiClient = await ApiClient.create();

    const [scopeResult, scopesWithAccessResult, delegationSourcesResult] = await Promise.all([
        apiClient.getScope(params.name, true),
        apiClient.getScopesWithAccess(params.name!),
        apiClient.getDeletagionSources()
    ]);

    const { data: scope, error: scopeError } = scopeResult;
    const { data: scopesWithAccess, error: scopesWithAccessError } = scopesWithAccessResult;
    const { data: delegationSources, error: delegationSourcesError } = delegationSourcesResult;

    const error = scopeError || scopesWithAccessError || delegationSourcesError;
    return error ? error.toErrorResponse() : { scope, scopesWithAccess, delegationSources };
}

export async function clientAction({ request, params }: ClientActionFunctionArgs) {
    const scopeName = params.name!
    const formData = await request.formData();

    const scopeService = await ScopeService.create();

    let apiResponse: ApiResponse<any> | null = null;
    let statusMessage = ''

    switch (formData.get('intent') as string) {
    case ActionIntent.DeleteScope: {
        apiResponse = await scopeService.deleteScope(scopeName);
        if (!apiResponse.error) {
            StatusMessage.set('scope_page.successful_delete', StatusColor.success)
            return redirect('/scopes');
        }
        break;
    }
    case ActionIntent.UpdateScope: {
        apiResponse = await scopeService.updateScope(formData);
        statusMessage = 'scope_page.successful_update'
        break;
    }
    case ActionIntent.AddScopeAccess: {
        apiResponse = await scopeService.addScopeAccess(scopeName, formData);
        StatusMessage.set('scope_page.successful_add_access', StatusColor.success, formData.get('consumer_orgno') as string)
        break;
    }
    case ActionIntent.DeleteScopeAccess: {
        apiResponse = await scopeService.deleteScopeAccess(scopeName, formData);
        StatusMessage.set('scope_page.successful_delete_access', StatusColor.success, formData.get('consumer_orgno') as string)
        break;
    }
    default:
        return null;
    }

    if (apiResponse?.error) {
        return { error: apiResponse.error.userMessage };
    }

    if (statusMessage !== '') {
        StatusMessage.set(statusMessage, StatusColor.success)
    }

    if (apiResponse?.data) {
        return { data: apiResponse.data };
    }

    return null;
}

export default function ScopePage() {
    const { t } = useTranslation();

    const actionData = useActionData<typeof clientAction>();
    const data = useLoaderData<typeof clientLoader>();

    if (isErrorResponse(data)) {
        return <AlertWrapper message={data.error} type="error"/>;
    }

    const { scope, scopesWithAccess, delegationSources } = data;

    const context = {
        page: 'scope-details',
        info: 'Dette er selvbetjening forsiden'
    };
    
    return (
        <div>
            <AiAssistant context={context} />
            <Tabs defaultValue="accesses">
                <Tabs.List className="top-0 z-10 bg-gray grid grid-cols-12 border-none">
                    <div className='col-span-12'>
                        <HeadingWrapper level={2} heading={scope?.name || ''} translate={false} className="bg-gray truncate block overflow-ellipsis"/>
                    </div>
                    {(scope?.active === false) && (
                        <div className='col-span-12 text-danger text-lg flex'>
                            <Paragraph className='flex items-center gap-2 font-medium'>
                                <ExclamationmarkTriangleIcon className='text-2xl'/> {t('disabled')}
                            </Paragraph>
                        </div>
                    )}
                    <div className='col-span-12 flex'>
                        <Tabs.Tab
                            value="accesses"
                            className="py-4 px-8 border-solid border-b">
                            {t('scope_page.accesses')}
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="details"
                            className="py-4 px-8 border-solid border-b">
                            {t('scope_page.about_scope')}
                        </Tabs.Tab>
                    </div>
                </Tabs.List>

                <Tabs.Panel
                    value="accesses"
                    className="p-0">
                    <ScopeAccess scopesWithAccess={scopesWithAccess}/>
                </Tabs.Panel>
                <Tabs.Panel
                    value="details"
                    className="p-0">
                    <ScopeForm scope={scope} delegationSources={delegationSources} error={actionData?.error}/>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
