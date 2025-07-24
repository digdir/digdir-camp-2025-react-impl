import { Button, Dialog, Paragraph } from '@digdir/designsystemet-react';
import { useEffect, useRef, useState } from 'react';
import { Form, useActionData, useFetcher, useNavigation } from 'react-router';
import { FormMetadata, useForm } from '@conform-to/react';

import { useTranslation } from '~/lib/i18n';
import IdportenClient from '~/components/clients/idporten';
import { IdportenSchema, MaskinportenSchema, validateClientForm } from '~/lib/clients';
import ConfirmDeleteModal from '~/components/util/ConfirmDeleteModal';
import MaskinportenClient from '~/components/clients/maskinporten';
import AlertWrapper from '~/components/util/AlertWrapper';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { UriContext, UriTypes } from '~/components/context/UriContext';
import { useAiAssistantContext } from '~/components/ai/AiAssistant';

import { clientAction } from './route';
import { ActionIntent } from './actions';

import type { components } from '~/lib/api';

const Details = ({ client }: { client: components['schemas']['ClientResponse'] }) => {
    const { t } = useTranslation();
    const fetcher = useFetcher();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showNewSecretModal, setShowNewSecretModal] = useState(false);
    const actionData = useActionData<typeof clientAction>();
    const navigation = useNavigation();
    const isUpdatingClient = navigation.formAction !== undefined;
    const { setContext } = useAiAssistantContext();

    const uriCardRef = useRef<HTMLDivElement | null>(null);

    const [uriValidationError, setUriValidationError] = useState<boolean>(false);
    const [uris, setUris] = useState<UriTypes>({
        redirectUris: (client.redirect_uris ?? []).map((uri, index) => ({
            id: `redirect_uri#${index}`,
            uri,
        })),
        postLogoutUris: (client.post_logout_redirect_uris ?? []).map((uri, index) => ({
            id: `post_logout_redirect_uri#${index}`,
            uri,
        })),
    });

    // Set context back to client-details when this component is rendered
    useEffect(() => {
        setContext((prevContext: any) => ({
            ...prevContext,
            page: 'client-details',
            info: 'Dette er klient-detaljsiden'
        }));
    }, [setContext]);

    useEffect(() => {
        if (!uriValidationError) return;

        if (uriCardRef.current) {
            uriCardRef.current.scrollIntoView({ block: 'center' });
            uriCardRef.current.focus?.();
        }
    })

    const deleteClient = async () => {
        try {
            await fetcher.submit({ intent: ActionIntent.DeleteClient }, { method: 'DELETE' });
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Failed to delete client:', error);
        }
    }

    const [form, fields] = useForm({
        onValidate({ formData }) {
            return validateClientForm(formData, uris, setUriValidationError);
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });
    
    const clientCard = () => {
        switch (client.integration_type) {
        case 'ansattporten':
        case 'api_klient':
        case 'idporten':
            return (
                <UriContext.Provider value={{ uris, setUris }}>
                    <IdportenClient client={client} form={form as FormMetadata<IdportenSchema>} onGenerateSecretClick={() => setShowNewSecretModal(true)} uriCardRef={uriCardRef}/>
                </UriContext.Provider>
            )
        case 'maskinporten':
        case 'krr':
            return <MaskinportenClient client={client} form={form as FormMetadata<MaskinportenSchema>}/>;
        }
    }

    return (
        <div>
            <Form method="put" id={form.id} onSubmit={form.onSubmit}>
                <div className='grid grid-cols-12 gap-4 text-md py-4'>
                    <input type='hidden' name={fields.integration_type.name} value={client.integration_type}/>

                    {clientCard()}

                    <Button
                        disabled={isUpdatingClient}
                        type="submit"
                        name="intent"
                        value={ActionIntent.UpdateClient}
                        className="col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-3"
                    >
                        {t('save_changes')}
                    </Button>
                    <Button className="col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-3" variant="secondary" onClick={() => setShowDeleteModal(true)}>
                        {t('delete')}
                    </Button>

                </div>
            </Form>

            <ConfirmDeleteModal
                heading={t('client_page.confirm_delete_client_heading')}
                body={t('client_page.confirm_delete_client_body')}
                isVisible={showDeleteModal}
                onCancel={() => setShowDeleteModal(false)}
                onDelete={deleteClient}
            />

            {showNewSecretModal && <ConfirmNewSecretModal onClose={() => setShowNewSecretModal(false)}/>}

            {actionData?.error && <AlertWrapper type="error" message={actionData.error}/>}
        </div>
    );
};

const ConfirmNewSecretModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const fetcher = useFetcher();

    const message = t('client_page.generere_secret_confirm')
        .split('\n')
        .map((line, i) => <Paragraph key={i}>{line}</Paragraph>);

    return (
        <Dialog open closedby='any' onClose={onClose} className='rounded-lg bg-white'>
            <HeadingWrapper level={3} heading={t('client_page.generate_secret')}/>

            {message}

            {fetcher.data?.client_secret && <div className="mt-4"><AlertWrapper type="success" heading={t('client_page.generate_secret_success')} message={fetcher.data?.client_secret}/></div>}
            <Button
                className="justify-self-end mt-4 self-end"
                onClick={() => fetcher.submit({ intent: ActionIntent.GenerateSecret }, { method: 'POST' })}
            >
                {t('client_page.generate_secret')}
            </Button>
        </Dialog>
    );
};


export default Details;
