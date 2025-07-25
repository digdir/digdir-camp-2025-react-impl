import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { Button, Card, Dialog, Divider, Field, Paragraph, Table } from '@digdir/designsystemet-react';
import { PlusIcon, TrashIcon, WrenchIcon } from '@navikt/aksel-icons';
import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { useTranslation } from '~/lib/i18n';
import AlertWrapper from '~/components/util/AlertWrapper';
import HeadingWrapper from '~/components/util/HeadingWrapper'
import { ClientOnBehalfOf } from '~/lib/models';
import ConfirmDeleteModal from '~/components/util/ConfirmDeleteModal';
import { formatDateTimeCompact } from '~/lib/utils';
import { onBehalfOfSchema } from '~/lib/clients';
import { ErrorMessage } from '~/lib/errors';
import { Textfield } from '~/components/util/TextField';
import { useAiAssistantContext } from '~/components/ai/AiAssistant';

import { ActionIntent } from './actions';


const AddOnBehalfOfModal = ({ closeModal, existingOnBehalfOf }: { closeModal: () => void, existingOnBehalfOf?: ClientOnBehalfOf | null }) => {
    const [form, fields] = useForm({
        onValidate({ formData }) {
            return parseWithZod(formData, { schema: onBehalfOfSchema });
        },
        shouldValidate: 'onSubmit',
        shouldRevalidate: 'onBlur',
    });

    const { t } = useTranslation();
    const fetcher = useFetcher();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [organizationNameNotFound, setOrganizationNameNotFound] = useState<string | null>(null);
    const [organizationName, setOrganizationName] = useState<string | null>(null);

    useEffect(() => {
        if (!fetcher.data) {
            return;
        }

        if (fetcher.data.error === ErrorMessage.OrganizationNameNotFound) {
            setOrganizationName(null)
            setOrganizationNameNotFound('scope_page.org_not_found_please_add_manually');
            return;
        }

        setOrganizationNameNotFound(null);

        if (fetcher.data.error) {
            setErrorMessage(fetcher.data.error);
            return;
        }

        setErrorMessage(null);

        if (fetcher.data.organizationName) {
            setOrganizationName(fetcher.data.organizationName)
            return;
        }

        closeModal();
    }, [fetcher.data, closeModal])

    const handleOrganizationNumberChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = e.target.value
        setOrganizationName(null);
        setOrganizationNameNotFound(null);
        if (z.object({ orgno: onBehalfOfSchema.shape.orgno }).safeParse({ orgno: value }).success) {
            fetchOrganizationName(value)
        }
    }

    const fetchOrganizationName = async (orgno: string) => {
        await fetcher.load(`/organization/${orgno}`)
    }

    return (
        <Dialog open closedby='any' onClose={closeModal} className='rounded-lg bg-white'>
            <HeadingWrapper level={3} heading={t(existingOnBehalfOf ? 'client_page.onbehalfof.edit_onbehalfof' : 'client_page.onbehalfof.add_onbehalfof')}/>
            <fetcher.Form method={existingOnBehalfOf ? 'put' : 'post'} id={form.id} onSubmit={form.onSubmit} className='mt-6 space-y-2'>
                <div className="">
                    <div className="grid grid-cols-12 pt-2 gap-2 w-full mb-3 break-words">
                        <Textfield
                            label={t('client_page.onbehalfof.organization_number')}
                            id={fields.orgno.key}
                            name={fields.orgno.name}
                            error={t(fields.orgno.errors || '')}
                            maxLength={9}
                            defaultValue={existingOnBehalfOf?.orgno ?? ''}
                            onChange={handleOrganizationNumberChange}
                            readOnly={!!existingOnBehalfOf?.orgno}
                            className="col-span-8"
                        />
                        {!organizationNameNotFound && (
                            <Field className='col-span-12 mt-1'>
                                <Paragraph>{existingOnBehalfOf?.name ?? organizationName ?? ''}</Paragraph>
                            </Field>
                        )}
                        <Textfield
                            label={t('client_page.onbehalfof.organization_name')}
                            id={fields.name.key}
                            name={fields.name.name}
                            error={t(fields.name.errors ?? organizationNameNotFound ?? '')}
                            defaultValue={existingOnBehalfOf?.name ?? organizationName ?? ''}
                            className={`col-span-8 ${!organizationNameNotFound ? 'hidden' : ''}`}
                        />
                        <Divider className='col-span-12 mt-3'/>
                        <Textfield
                            className='col-span-8'
                            label={t('client_page.onbehalfof.customer_unique_id')}
                            helpText={t('client_page.onbehalfof.customer_unique_id_helptext')}
                            id={fields.onbehalfof.key}
                            name={fields.onbehalfof.name}
                            error={t(fields.onbehalfof.errors || '')}
                            defaultValue={existingOnBehalfOf?.onbehalfof ?? ''}
                            readOnly={!!existingOnBehalfOf?.onbehalfof}
                        />
                        <Textfield
                            className='col-span-12'
                            multiline
                            label={t('description')}
                            helpText={t('client_page.onbehalfof.description_helptext')}
                            id={fields.description.key}
                            name={fields.description.name}
                            error={t(fields.description.errors || '')}
                            defaultValue={existingOnBehalfOf?.description ?? ''}
                            maxLength={255}
                        />
                    </div>
                </div>

                <div className="mt-8">
                    {errorMessage && <AlertWrapper type="error" message={fetcher.data.error}/>}
                </div>
                <div className='flex pt-2 gap-2 justify-start'>
                    <Button
                        variant="primary"
                        type="submit"
                        name="intent"
                        value={existingOnBehalfOf ? ActionIntent.EditOnBehalfOf : ActionIntent.AddOnBehalfOf}>
                        {t('save')}
                    </Button>
                    <Button
                        variant="tertiary"
                        className="justify-self-end"
                        onClick={closeModal}
                    >
                        {t('cancel')}
                    </Button>
                </div>
            </fetcher.Form>
        </Dialog>
    );
};


const OnBehalfOf = ({ onBehalfOfs }: { onBehalfOfs: ClientOnBehalfOf[] }) => {
    const { t } = useTranslation();
    const { setContext } = useAiAssistantContext();

    const [onBehalfOfToDelete, setOnBehalfOfToDelete] = useState<ClientOnBehalfOf | null>(null);
    const [editingOnBehalfOf, setEditingOnBehalfOf] = useState<ClientOnBehalfOf | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetcher = useFetcher();

    // Set context back to client-details when this component is rendered
    useEffect(() => {
        setContext((prevContext: any) => ({
            ...prevContext,
            page: 'client-details',
            info: 'Dette er klient-detaljer og on-behalf-of siden'
        }));
    }, [setContext]);

    const deleteOnBehalfOf = async () => {
        if (!onBehalfOfToDelete || !onBehalfOfToDelete.onbehalfof || !onBehalfOfToDelete.name) return;
        try {
            await fetcher.submit(
                {
                    intent: ActionIntent.DeleteOnBehalfOf,
                    onBehalfOf: onBehalfOfToDelete.onbehalfof,
                    name: onBehalfOfToDelete.name
                },
                {
                    method: 'DELETE',
                    encType: 'application/x-www-form-urlencoded', // Add this for clarity if needed
                }
            );
            setOnBehalfOfToDelete(null);
        } catch (error) {
            console.error('Failed to delete onBehalfOf:', error);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingOnBehalfOf(null)
    };

    return (
        <>
            {(onBehalfOfs.length > 0) && (

                <div>
                    <div className="pt-6 flex items-center self-auto">
                        <div className={` ${!(onBehalfOfs.length > 0) ? 'hidden' : ' '}`}>
                            <Button
                                variant="primary"
                                className="px-6 shadow h-full"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <PlusIcon/>
                                {t('client_page.add_onbehalfof')}
                            </Button>
                        </div>
                    </div>
                    <div className="pt-1 mt-3 w-full overflow-x-auto rounded-lg mt-4">
                        <Table border style={{ tableLayout: 'fixed' }} className='min-w-[60rem] border-none'>
                            <Table.Head>
                                <Table.Row>
                                    <Table.HeaderCell>
                                        {t('client_page.onbehalfof.organization_name')}
                                    </Table.HeaderCell>
                                    <Table.HeaderCell>
                                        {t('client_page.onbehalfof.organization_number')}
                                    </Table.HeaderCell>
                                    <Table.HeaderCell>
                                        ID
                                    </Table.HeaderCell>
                                    <Table.HeaderCell>
                                        {t('created')}
                                    </Table.HeaderCell>
                                    <Table.HeaderCell>
                                        <div className='p-2 flex'>
                                            <div className='ml-auto'>
                                                {t('actions')}
                                            </div>
                                        </div>
                                    </Table.HeaderCell>
                                </Table.Row>
                            </Table.Head>
                            <Table.Body>
                                {
                                    onBehalfOfs.map(onBehalfOf => (
                                        <Table.Row key={'' + onBehalfOf.orgno + onBehalfOf.onbehalfof}>
                                            <Table.Cell className='truncate'>
                                                {onBehalfOf.name}
                                            </Table.Cell>
                                            <Table.Cell className='truncate'>
                                                {onBehalfOf.orgno}
                                            </Table.Cell>
                                            <Table.Cell className='truncate'>
                                                {onBehalfOf.onbehalfof}
                                            </Table.Cell>
                                            <Table.Cell className='truncate'>
                                                {onBehalfOf.created ? formatDateTimeCompact(new Date(onBehalfOf.created)) : 'N/A'}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex">
                                                    <Button
                                                        data-color='accent' variant="tertiary" className='ml-auto'
                                                        onClick={() => {
                                                            setEditingOnBehalfOf(onBehalfOf);
                                                            setIsModalOpen(true);
                                                        }}>
                                                        <WrenchIcon className='text-2xl'/>
                                                    </Button>
                                                    <Button data-color='accent' variant="tertiary" onClick={() => setOnBehalfOfToDelete(onBehalfOf)}>
                                                        <TrashIcon className='text-2xl'/>
                                                    </Button>
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                            </Table.Body>
                        </Table>
                    </div>
                </div>
            )}
            {!(onBehalfOfs.length > 0) && (
                <Card
                    data-color="accent"
                    className={`rounded-lg mt-6 border-none flex flex-col items-center bg-white shadow ml-auto p-24 space-y-4 ${(onBehalfOfs.length > 0) ? 'hidden' : ' '}`}>
                    <div className="text-center">
                        {t('client_page.onbehalfof.no_access_granted')}
                    </div>
                    <Button
                        variant="primary"
                        className="px-6 shadow h-full"
                        onClick={() => {
                            setIsModalOpen(true)
                        }}
                    >
                        <PlusIcon/>
                        {t('add')}
                    </Button>

                </Card>
            )}

            {isModalOpen && <AddOnBehalfOfModal closeModal={handleModalClose} existingOnBehalfOf={editingOnBehalfOf}/>}

            <ConfirmDeleteModal
                heading={t('client_page.onbehalfof.confirm_delete_onbehalfof_from_client_heading')}
                body={t('client_page.onbehalfof.confirm_delete_onbehalfof_from_client_body')}
                isVisible={onBehalfOfToDelete !== null}
                onCancel={() => setOnBehalfOfToDelete(null)}
                onDelete={deleteOnBehalfOf}/>
        </>
    )
}

export default OnBehalfOf;
