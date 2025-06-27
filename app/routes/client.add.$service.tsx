import { useEffect, useRef, useState } from 'react';
import { Button, Textfield } from '@digdir/designsystemet-react';
import { ClientActionFunctionArgs, ClientLoaderFunctionArgs, Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import { FormMetadata, useForm } from '@conform-to/react';
import { ChevronRightIcon } from '@navikt/aksel-icons';

import { useTranslation } from '~/lib/i18n';
import IdportenClient from '~/components/clients/idporten';
import MaskinportenClient from '~/components/clients/maskinporten';
import { BaseSchema, ClientService, IdportenSchema, IntegrationType, MaskinportenSchema, validateClientForm } from '~/lib/clients';
import AlertWrapper from '~/components/util/AlertWrapper';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { Authorization } from '~/lib/auth';
import { ApiClient } from '~/lib/api_client';
import { StatusColor, StatusMessage } from '~/lib/status';
import ScopesCard from '~/components/clients/scopes';
import { UriContext, UriTypes } from '~/components/context/UriContext';

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
    await Authorization.requireAuthenticatedUser();
    const apiClient = await ApiClient.create();

    const actualService = params.service === 'idporten' ? 'api_client' : params.service;

    const scopesAccessibleForAll = apiClient.getAccessibleForAllScopes(actualService!);
    const scopesWithDelegationSource = apiClient.getScopesWithDelegationSource(actualService!);
    const scopesAvailableToOrganization = apiClient.getScopesAccessibleToUsersOrganization();

    return {
        service: params.service,
        scopesAccessibleForAll,
        scopesWithDelegationSource,
        scopesAvailableToOrganization
    };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
    const formData = await request.formData();
    const clientService = await ClientService.create();
    const { error } = await clientService.addClient(formData);

    if (error) {
        return { error: error.userMessage };
    }

    StatusMessage.set('client_page.successful_create', StatusColor.success);
    return redirect('/clients');
}

export default function AddClient() {
    const { t } = useTranslation();
    const { service: initialService, scopesAccessibleForAll, scopesWithDelegationSource, scopesAvailableToOrganization } = useLoaderData<typeof clientLoader>();
    const actionData = useActionData<typeof clientAction>();
    const navigation = useNavigation();
    const isSubmitting = navigation.formAction !== undefined;

    // When wizard is added these can likely be removed as no scrolling will be needed
    const uriCardRef = useRef<HTMLDivElement | null>(null);

    const [service, setService] = useState(initialService);
    const [uriValidationError, setUriValidationError] = useState<boolean>(false);

    const [uris, setUris] = useState<UriTypes>({
        redirectUris: [],
        postLogoutUris: [],
    });

    const [form, fields] = useForm({
        onValidate({ formData }) {
            return validateClientForm(formData, uris, setUriValidationError);
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });

    useEffect(() => {
        if (!uriValidationError) return;

        if (uriCardRef.current) {
            uriCardRef.current.scrollIntoView({ block: 'center' });
            uriCardRef.current.focus?.();
        }
    })

    const handleServiceChange = (newService: string) => {
        setService(newService);
    };

    return (
        <div>
            <HeadingWrapper level={2} heading={t(`client_page.add_client_${service}`)} className="pb-4 col-span-12" />
            <Link to="/client/add" className="text-accent no-underline inline-flex items-center space-x-2 font-medium">
                <ChevronRightIcon className='text-2xl' />
                {t('reselect_service')}
            </Link>

            <Form method="post" id={form.id} onSubmit={form.onSubmit} className="py-6">
                <div className="grid grid-cols-12 gap-4 space-x-1">
                    <Textfield label='sd' className='hidden' readOnly name={fields.integration_type.name} value={service} />
                    {service === IntegrationType.MASKINPORTEN && (
                        <MaskinportenClient form={form as FormMetadata<MaskinportenSchema>} />
                    )}
                    {service !== IntegrationType.MASKINPORTEN && (
                        <UriContext.Provider value={{ uris, setUris }}>
                            <IdportenClient form={form as FormMetadata<IdportenSchema>} uriCardRef={uriCardRef} onGenerateSecretClick={() => { }} />
                        </UriContext.Provider>
                    )}

                    <ScopesCard
                        form={form as FormMetadata<BaseSchema>}
                        service={service}
                        onServiceChange={handleServiceChange}
                        scopesAccessibleForAll={scopesAccessibleForAll}
                        scopesWithDelegationSource={scopesWithDelegationSource}
                        scopesAvailableToOrganization={scopesAvailableToOrganization}
                    />

                    <Button type="submit" disabled={isSubmitting} className="col-span-4 lg:col-span-2 shadow my-2 py-3">
                        {t('create')}
                    </Button>
                </div>
            </Form>

            {actionData?.error && <AlertWrapper type="error" message={actionData.error} />}
        </div>
    );
}
