import { Button, Card, Dialog, Field, Label, Paragraph, Search, Table, Textfield } from '@digdir/designsystemet-react';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@navikt/aksel-icons';

import { useTranslation } from '~/lib/i18n';
import { ScopeAccess as Access } from '~/lib/models';
import { ActionIntent } from '~/routes/scopes.$name/route';
import ConfirmDeleteModal from '~/components/util/ConfirmDeleteModal';
import { filterFunc, formatDateTimeCompact } from '~/lib/utils';
import AlertWrapper from '~/components/util/AlertWrapper';
import { ErrorMessage } from '~/lib/errors';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { orgnoSchema } from '~/lib/scopes';

const AddScopeAccessModal = ({ closeModal }: { closeModal: () => void }) => {
    const [form, fields] = useForm<z.infer<typeof orgnoSchema>>({
        onValidate({ formData }) {
            return parseWithZod(formData, { schema: orgnoSchema });
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
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
            setOrganizationName(null);
            setOrganizationNameNotFound(fetcher.data.error);
            return;
        }

        setOrganizationNameNotFound(null);

        if (fetcher.data.error) {
            setOrganizationName(null);
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
        if (z.object({ orgno: orgnoSchema.shape.consumer_orgno }).safeParse({ orgno: value }).success) {
            fetchOrganizationName(value)
        }
    }

    const fetchOrganizationName = async (orgno: string) => {
        await fetcher.load(`/organization/${orgno}`)
    }

    return (
        <Dialog
            open
            closedby='any'
            onClose={closeModal}
            className="rounded-lg bg-white">
            <div className=" mb-2">
                <Label data-size="sm">{t('')}</Label>
                <div className="space-y-2">
                    <HeadingWrapper level={3} heading={t('scope_page.add_access_for_org')}/>
                </div>
            </div>

            <div>
                <fetcher.Form
                    method="post"
                    id={form.id}
                    onSubmit={form.onSubmit}
                    className="mt-6 space-y-2"
                >
                    <div className="pb-2">
                        <div className="grid grid-cols-12 pt-2 gap-2 justify-between w-full mb-3">
                            <Textfield
                                label={t('organization_number')}
                                id={fields.consumer_orgno.key}
                                name={fields.consumer_orgno.name}
                                error={t(fields.consumer_orgno.errors || '')}
                                onChange={handleOrganizationNumberChange}
                                maxLength={9}
                                className="col-span-8"
                            />
                            {!organizationNameNotFound && (
                                <Field className='col-span-12 mt-1'>
                                    <Paragraph>{organizationName}</Paragraph>
                                </Field>
                            )}
                        </div>
                        {organizationNameNotFound && <Paragraph>{t(organizationNameNotFound)}</Paragraph>}
                    </div>

                    <div className="mt-8">
                        {errorMessage && <AlertWrapper type='error' message={errorMessage}/>}
                    </div>
                    <div className="flex pt-2 gap-2 justify-start">
                        <div className="flex justify-self-end gap-2">
                            <Button
                                type="submit"
                                variant="primary"
                                name="intent"
                                value={ActionIntent.AddScopeAccess}
                                className="justify-self-end"
                            >
                                {t('add')}
                            </Button>
                            <Button
                                variant="tertiary"
                                className="justify-self-end"
                                onClick={closeModal}
                            >
                                {t('cancel')}
                            </Button>
                        </div>
                    </div>
                </fetcher.Form>
            </div>
        </Dialog>
    )
}

const ScopeAccess = ({ scopesWithAccess }: {
    scopesWithAccess?: Access[],
}) => {
    const { t } = useTranslation();
    const fetcher = useFetcher();

    const [search, setSearch] = useState('');
    const searchTerms = search.toLowerCase().split(' ');
    const fieldsToSearch = ['consumer_orgno'];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [orgnoToRemove, setOrgnoToRemove] = useState<string | null>(null);

    const removeScopeAccessForConsumerOrgno = async () => {
        try {
            await fetcher.submit({ intent: ActionIntent.DeleteScopeAccess, consumer_orgno: orgnoToRemove }, { method: 'DELETE' });
            setOrgnoToRemove(null);
        } catch (error) {
            console.error('Failed to remove scope from client:', error);
        }
    }

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const rows = (scopesWithAccess: Access[]) => {
        if (scopesWithAccess.length === 0) {
            return (
                <Paragraph>{t('scope_page.could_not_find_access')}</Paragraph>
            )
        }

        return (
            <div>
                {/*Only show searchbar if there are more than 10 scope accesses*/}
                {scopesWithAccess.length > 10 && <div className="grid grid-cols-12 mb-4">
                    <Search className='col-span-4 max-w shadow'>
                        <Search.Input
                            placeholder={t('scope_page.scope_search')}
                            aria-label={t('scope_page.scope_search')}
                            className='border-none bg-white'
                            onChange={e => setSearch(e.target.value)}
                        />
                        <Search.Clear/>
                    </Search>
                </div>}
                <div className="w-full overflow-x-auto rounded-lg mt-4">
                    <Table border style={{ tableLayout: 'fixed' }} className='min-w-[50rem] border-none'>
                        <Table.Head>
                            <Table.Row>
                                <Table.HeaderCell>
                                    {t('consumer')}
                                </Table.HeaderCell>
                                <Table.HeaderCell>
                                    {t('organization_number')}
                                </Table.HeaderCell>
                                <Table.HeaderCell>
                                    {t('scope_page.date_granted')}
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
                            {scopesWithAccess
                                .filter(scope => filterFunc(scope, fieldsToSearch, searchTerms)) // Apply filter here
                                .map(scope => (
                                    <Table.Row key={scope.consumer_orgno}>
                                        <Table.Cell className='truncate'>
                                            {scope.consumer_organization_name ?? 'N/A'}
                                        </Table.Cell>
                                        <Table.Cell className='truncate'>
                                            {scope.consumer_orgno}
                                        </Table.Cell>
                                        <Table.Cell className='truncate'>
                                            {scope.created ? formatDateTimeCompact(new Date(scope.created)) : 'N/A'}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Button
                                                data-color='accent'
                                                variant="tertiary"
                                                className='ml-auto'
                                                onClick={() => setOrgnoToRemove(scope.consumer_orgno ?? null)}
                                            >
                                                <TrashIcon className='text-2xl'/>
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>

                                ))}
                        </Table.Body>
                    </Table>
                </div>
            </div>
        )
    }

    return (
        <div>
            {!(scopesWithAccess!.length > 0) && (
                <Card
                    data-color="accent"
                    className={`rounded-lg mt-4 border-none flex flex-col items-center bg-white shadow ml-auto p-24 space-y-4 ${(scopesWithAccess!.length > 0) ? 'hidden' : ' '}`}>
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
            {(scopesWithAccess!.length > 0) && (
                <>
                    <div className="pt-6 flex items-center self-auto mb-6">
                        <Button
                            variant="primary"
                            className="px-6 shadow h-full"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <PlusIcon/>
                            {t('scope_page.add_access')}
                        </Button>
                    </div>

                    {rows(scopesWithAccess!)}
                </>
            )}

            {isModalOpen && <AddScopeAccessModal closeModal={handleModalClose}/>}

            <ConfirmDeleteModal
                heading={t('client_page.confirm_delete_scope_from_client_heading')}
                body={t('client_page.confirm_delete_scope_from_client_body')}
                isVisible={orgnoToRemove !== null}
                onCancel={() => setOrgnoToRemove(null)}
                onDelete={removeScopeAccessForConsumerOrgno}
            />
        </div>
    )
}

export default ScopeAccess;
