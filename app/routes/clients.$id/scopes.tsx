import { Button, Card, Checkbox, Dialog, Fieldset, Label, Paragraph, Search, Table } from '@digdir/designsystemet-react';
import { PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import { Suspense, use, useEffect, useMemo, useState } from 'react';
import { Form, useFetcher } from 'react-router';

import { useTranslation } from '~/lib/i18n';
import { Client, Scope, ScopeAccess } from '~/lib/models'
import ConfirmDeleteModal from '~/components/util/ConfirmDeleteModal';
import { ApiResponse } from '~/lib/api_client';
import AlertWrapper from '~/components/util/AlertWrapper';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { useAiAssistantContext } from '~/components/ai/AiAssistant';

import { ActionIntent } from './actions';

enum FetcherKey {
    AddScope = 'addScope',
    RemoveScope = 'removeScope',
}

enum FilterCategory {
    All = 'all',
    AccessibleForAll = 'accessibleForAll',
    DelegationSource = 'delegationSource',
    AvailableToUser = 'availableToUser',
}

const AddScopeModal = (props: {
    scopes: string[],
    scopesAccessibleForAll: Promise<ApiResponse<Scope[]>>,
    scopesWithDelegationSource: Promise<ApiResponse<Scope[]>>,
    scopesAvailableToOrganization: Promise<ApiResponse<ScopeAccess[]>>,
    closeModal: () => void,
}) => {
    const { t } = useTranslation();
    const fetcher = useFetcher({ key: FetcherKey.AddScope });
    const { scopes, closeModal } = props;

    const scopesAccessibleForAllData = use(props.scopesAccessibleForAll);
    const scopesWithDelegationSourceData = use(props.scopesWithDelegationSource);
    const scopesAccessibleToOrganizationData = use(props.scopesAvailableToOrganization);

    const scopesAccessibleToAll = useMemo(() =>
        scopesAccessibleForAllData.data?.map(scope => ({
            name: scope.name || '',
            description: scope.description || ''
        })) ?? [], [scopesAccessibleForAllData]);

    const scopesWithDelegationSource = useMemo(() =>
        scopesWithDelegationSourceData.data?.map(scope => ({
            name: scope.name || '',
            description: scope.description || ''
        })) ?? [], [scopesWithDelegationSourceData]);

    const scopesAccessibleToOrganization = useMemo(() =>
        scopesAccessibleToOrganizationData.data?.map(scope => ({
            name: scope.scope || '',
            description: ''
        })) ?? [], [scopesAccessibleToOrganizationData]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<FilterCategory[]>([
        FilterCategory.AvailableToUser,
    ]);

    const toggleFilter = (filter: FilterCategory) => {
        setSelectedFilters(prev =>
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        );
    };

    const availableScopes = useMemo(() => {
        const map = new Map<string, { name: string, description: string }>();

        const addScopes = (list: { name: string, description: string }[]) => {
            for (const scope of list) {
                if (!scopes.includes(scope.name) && !map.has(scope.name)) {
                    map.set(scope.name, scope);
                }
            }
        };

        if (selectedFilters.includes(FilterCategory.AccessibleForAll)) {
            addScopes(scopesAccessibleToAll);
        }
        if (selectedFilters.includes(FilterCategory.DelegationSource)) {
            const delegationOnly = scopesWithDelegationSource.filter(
                scope => !scopesAccessibleToAll.find(s => s.name === scope.name)
            );
            addScopes(delegationOnly);
        }
        if (selectedFilters.includes(FilterCategory.AvailableToUser)) {
            addScopes(scopesAccessibleToOrganization);
        }

        return Array.from(map.values());
    }, [
        selectedFilters,
        scopesAccessibleToAll,
        scopesWithDelegationSource,
        scopesAccessibleToOrganization,
        scopes
    ]);

    const displayedScopes = availableScopes.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open closedby='any' onClose={closeModal} className='rounded-lg max-h-fit max-w-[1400px]'>
            <Dialog.Block className="space-y-4 p-4 bg-gray ">
                <Label data-size="sm">{t('client_page.add_new_scope')}</Label>
                <div className="space-y-2">
                    <HeadingWrapper level={4} heading={t('client_page.available_scopes')}/>
                    <Search className='shadow col-span-1'>
                        <Search.Input
                            placeholder={t('scope_page.scope_search')}
                            aria-label={t('scope_page.scope_search')}
                            className='border-none bg-white'
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}/>
                        <Search.Clear/>
                    </Search>
                </div>
                <Fieldset>
                    <div className="flex flex-wrap gap-6">
                        <Checkbox
                            label={t('client_page.granted_to_me')}
                            checked={selectedFilters.includes(FilterCategory.AvailableToUser)}
                            onChange={() => toggleFilter(FilterCategory.AvailableToUser)}
                        />
                        <Checkbox
                            label={t('client_page.accessible_for_all')}
                            checked={selectedFilters.includes(FilterCategory.AccessibleForAll)}
                            onChange={() => toggleFilter(FilterCategory.AccessibleForAll)}
                        />
                        <Checkbox
                            label={t('client_page.delegated')}
                            checked={selectedFilters.includes(FilterCategory.DelegationSource)}
                            onChange={() => toggleFilter(FilterCategory.DelegationSource)}
                        />
                    </div>
                </Fieldset>
            </Dialog.Block>

            <Form
                method="post"
                id={'scope'}
                onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    formData.set('intent', ActionIntent.AddScopeToClient);
                    await fetcher.submit(formData, { method: 'POST' });
                    closeModal();
                }}
            > <Dialog.Block className="bg-white h-[calc(80vh-250px)] overflow-y-auto p-4">

                    <div className="overflow-y-auto">
                        <Fieldset className="space-y-4">
                            {displayedScopes.length > 0 ? (
                                displayedScopes.map(scope => (
                                    <div key={scope.name}>
                                        <Checkbox
                                            label={scope.name}
                                            value={scope.name}
                                            name="scopes"
                                        />
                                        {scope.description && (
                                            <Paragraph className="ml-7 text-md text-subtle line-clamp-2 max-w-[60ch]">
                                                {scope.description}
                                            </Paragraph>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <Paragraph>{t('client_page.no_scopes_found')}</Paragraph>
                            )}
                        </Fieldset>
                    </div>

                </Dialog.Block>
                <Dialog.Block className="p-4 bg-gray">
                    <div className="flex justify-start gap-2">
                        <Button
                            type="submit"
                            variant="primary"
                            className="justify-self-end"
                        >
                            {t('submit')}
                        </Button>
                        <Button
                            variant="tertiary"
                            className="justify-self-end"
                            onClick={closeModal}
                        >
                            {t('cancel')}
                        </Button>
                    </div>
                </Dialog.Block>
            </Form>

        </Dialog>

    );
};

const Scopes = ({ scopes, scopesAccessibleForAll, scopesWithDelegationSource, scopesAvailableToOrganization, clientIntegrationType }: {
    scopes: string[],
    scopesAccessibleForAll: Promise<ApiResponse<Scope[]>>,
    scopesWithDelegationSource: Promise<ApiResponse<Scope[]>>,
    scopesAvailableToOrganization: Promise<ApiResponse<ScopeAccess[]>>
    clientIntegrationType: Client['integration_type'];
}) => {
    const { t } = useTranslation();
    const removeScopeFetcher = useFetcher({ key: FetcherKey.RemoveScope });
    const addScopeFetcher = useFetcher({ key: FetcherKey.AddScope });
    const actionError = removeScopeFetcher.data?.error || addScopeFetcher.data?.error;
    const { setContext } = useAiAssistantContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [scopeToRemove, setScopeToRemove] = useState<string | null>(null);

    // Set context back to client-details when this component is rendered
    useEffect(() => {
        setContext((prevContext: any) => ({
            ...prevContext,
            page: 'client-details',
            info: 'Dette er klient-detaljer og scopes siden'
        }));
    }, [setContext]);

    const removeScopeFromClient = async () => {
        await removeScopeFetcher.submit({ intent: ActionIntent.DeleteScopeFromClient, scope: scopeToRemove }, { method: 'PUT' });
        setScopeToRemove(null);
    }

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    };

    const filteredExistingScopesOnClient = scopes.filter(item =>
        item.toLowerCase().includes(search.toLowerCase())
    );

    const rows = filteredExistingScopesOnClient.map(scope => (
        <Table.Row key={scope} data-scope-name={scope}>
            <Table.Cell className='py-4'>
                {scope}
            </Table.Cell>
            <Table.Cell>
                <div className="flex">
                    {scope !== 'openid' && (scope !== 'profile') && (
                        <Button
                            data-color='accent'
                            variant="tertiary"
                            className='ml-auto'
                            onClick={() => setScopeToRemove(scope)}>
                            <TrashIcon className='text-2xl'/>
                        </Button>
                    )}
                </div>
            </Table.Cell>
        </Table.Row>
    ));

    return (
        <div>
            {clientIntegrationType !== 'idporten' && (
                <div className="flex items-center self-auto pt-6">
                    <div className={` ${!(scopes.length > 0) ? 'hidden' : ' '}`}>
                        <Button
                            variant="primary"
                            className="px-6 shadow h-full"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <PlusIcon/>
                            {t('scope_page.add_scope')}
                        </Button>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-12 ">
                {scopes.length >= 10 && <Search className='shadow col-span-6 mt-4'>
                    <Search.Input
                        placeholder={t('client_page.scope_search')}
                        aria-label={t('client_page.scope_search')}
                        className='border-none bg-white'
                        onChange={handleSearchChange}/>
                    <Search.Clear/>
                </Search>}
                <div className="col-span-12">
                    {(scopes.length === 0 || !scopes) &&
                        <Card
                            data-color="accent"
                            className={`rounded-lg border-none flex flex-col items-center bg-white shadow ml-auto p-24 space-y-4 ${(scopes.length > 0) ? 'hidden' : ' '}`}>
                            <div className="text-center">
                                {t('client_page.no_scopes')}
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
                    }
                    {(scopes && scopes.length > 0) &&
                    <div className="text-base pt-4">
                        <Table border style={{ tableLayout: 'fixed' }} className='border-none'>
                            <Table.Head>
                                <Table.Row>
                                    <Table.HeaderCell className='py-4'>
                                        {t('name')}
                                    </Table.HeaderCell>
                                    <Table.HeaderCell>
                                        <div className='p-2 flex'>
                                            <div className='ml-auto'>
                                                {clientIntegrationType === 'idporten' ? '' : t('actions')}
                                            </div>
                                        </div>
                                    </Table.HeaderCell>
                                </Table.Row>
                            </Table.Head>
                            <Table.Body>
                                {rows}
                            </Table.Body>
                        </Table>
                    </div>}
                </div>
            </div>

            {actionError && <AlertWrapper type="error" message={actionError}/>}

            <Suspense>
                {
                    isModalOpen && <AddScopeModal
                        scopes={scopes}
                        scopesAccessibleForAll={scopesAccessibleForAll}
                        scopesWithDelegationSource={scopesWithDelegationSource}
                        scopesAvailableToOrganization={scopesAvailableToOrganization}
                        closeModal={handleModalClose}
                    />
                }
            </Suspense>

            <ConfirmDeleteModal
                heading={t('client_page.confirm_delete_scope_from_client_heading')}
                body={t('client_page.confirm_delete_scope_from_client_body')}
                isVisible={scopeToRemove !== null}
                onCancel={() => setScopeToRemove(null)}
                onDelete={removeScopeFromClient}
            />
        </div>
    )
};

export default Scopes;
