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

/**
 * Details component that displays the details of a client and allows for editing and deleting the client.
 *
 * @param client - The client object containing details such as client ID, name, and integration type.
 * @constructor - This component fetches the client details and renders the appropriate client card based on the integration type.
 */
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

    /**
     * Sets the context for the AI assistant when the component mounts.
     */
    useEffect(() => {
        setContext((prevContext: any) => ({
            ...prevContext,
            page: 'client-details',
            info: 'Dette er klient-detaljsiden'
        }));
    }, [setContext]);

    /**
     * Scrolls to the URI card if there is a validation error.
     */
    useEffect(() => {
        if (!uriValidationError) return;

        if (uriCardRef.current) {
            uriCardRef.current.scrollIntoView({ block: 'center' });
            uriCardRef.current.focus?.();
        }
    })

    /**
     * Deletes the client by submitting a DELETE request to the server.
     */
    const deleteClient = async () => {
        try {
            await fetcher.submit({ intent: ActionIntent.DeleteClient }, { method: 'DELETE' });
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Failed to delete client:', error);
        }
    }

    /**
     * Initializes the form with validation for the client details.
     */
    const [form, fields] = useForm({
        onValidate({ formData }) {
            return validateClientForm(formData, uris, setUriValidationError);
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });

    /**
     * Renders the client card based on the integration type of the client.
     */
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

    /**
     * Renders the details component which includes the form for editing client details, buttons for saving changes and deleting the client, and modals for confirming deletion and generating a new secret.
     */
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

/**
 * ConfirmNewSecretModal component that displays a confirmation dialog for generating a new client secret.
 *
 * @param onClose - Callback function to close the modal.
 * @constructor - This component uses the `useTranslation` hook for internationalization and the `useFetcher` hook to submit a request to generate a new secret.
 */
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

/**
 * Details component that serves as the main page for displaying client details.
 */
export default Details;
