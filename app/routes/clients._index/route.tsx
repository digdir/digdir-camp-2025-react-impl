import { Button, Dropdown, Paragraph, Search, Table } from '@digdir/designsystemet-react';
import {Link, Outlet, useLoaderData} from 'react-router';
import { ChevronDownIcon, PlusIcon } from '@navikt/aksel-icons';
import { useEffect, useState } from 'react';

import { useTranslation } from '~/lib/i18n';
import { Client } from '~/lib/models';
import { filterFunc, formatDateTimeCompact } from '~/lib/utils';
import AlertWrapper from '~/components/util/AlertWrapper';
import { isErrorResponse } from '~/lib/errors';
import PersonReading from '~/components/art/PersonReading';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { HelpText } from '~/components/util/HelpText';
import { Authorization } from '~/lib/auth';
import { ClientService } from '~/lib/clients';
import { ContextBuilder } from '~/lib/context-builder';
import AiAssistant, { useAiAssistantContext } from '~/components/ai/AiAssistant';

/**
 * Enum representing the fields by which clients can be sorted.
 */
enum SortField {
    Name = 'client_name',
    Id = 'client_id',
    Created = 'created',
}

/**
 * Enum representing the different types of integrations for clients.
 */
enum IntegrationType {
    ANSATTPORTEN = 'ansattporten',
    IDPORTEN = 'idporten',
    MASKINPORTEN = 'maskinporten',
    API_KLIENT = 'api_klient',
    KRR = 'krr'
}

/**
 * Loader function to fetch clients data.
 * Requires the user to be authenticated.
 */
export async function clientLoader() {
    await Authorization.requireAuthenticatedUser();
    const clientService = await ClientService.create();

    const { data, error } = await clientService.getClients();

    return error ? error.toErrorResponse() : { clients: data };
}

/**
 * Clients component that displays a list of clients with search and filtering capabilities.
 *
 * @constructor - Displays a list of clients with options to search and filter by integration type.
 */
export default function Clients() {
    const { t } = useTranslation();
    const data = useLoaderData<typeof clientLoader>();
    const { setContext } = useAiAssistantContext();

    const [integrationTypeDropdownOpen, setIntegrationTypeDropdownOpen] = useState(false);
    const [selectedIntegrationType, setSelectedIntegrationType] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const searchTerms = search.toLowerCase().split(' ');
    const fieldsToSearch = ['client_name', 'client_id', 'description'];

    const [sortField, setSortField] = useState<SortField>(SortField.Created);
    const [sortAscending, setSortAscending] = useState(false);

    useEffect(() => {
        if (isErrorResponse(data)) {
            return;
        }

        const { clients } = data;
        const loadContext = async () => {
            const builtContext = await ContextBuilder.buildClientsContext(clients ?? []);
            setContext({
                ...builtContext,
                page: 'clients',
                info: 'Dette er selvbetjening klientsiden'
            });
        };
        void loadContext();
    }, [data, setContext]);

    if (isErrorResponse(data)) {
        return <AlertWrapper message={data.error} type="error"/>;
    }

    const { clients } = data;

    const compareClients = (a: Client, b: Client, sortField: SortField) => {
        const result = a[sortField]!.localeCompare(b[sortField]!);
        return sortAscending ? result : -result;
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAscending(!sortAscending);
        } else {
            // Set new sort field and default to ascending
            setSortField(field);
            setSortAscending(true);
        }
    };

    const sortedClients = sortField
        ? [...clients].sort((a, b) => compareClients(a, b, sortField))
        : clients;

    const rows = sortedClients
        .filter(client => filterFunc(client, fieldsToSearch, searchTerms))
        .filter(client => selectedIntegrationType ? client.integration_type === selectedIntegrationType : true)
        .map(client => (
            <Table.Row key={client.client_id}>
                <Table.Cell>
                    <div className='py-2'>
                        <Link to={`/clients/${client.client_id}`} className="no-underline line-clamp-3 break-all text-accent font-semibold">
                            {client.client_name}
                        </Link>
                        <div>{client.integration_type}</div>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {client.client_id}
                </Table.Cell>
                <Table.Cell>
                    {client.created ? formatDateTimeCompact(new Date(client.created)) : 'N/A'}
                </Table.Cell>
            </Table.Row>
        ));

    if (clients.length <= 0) {
        return (
            <>
                <div className="flex items-baseline self-auto pt-6 mb-2">
                    <HeadingWrapper level={2} heading={t('client', { count: 0 })} className="mb-6 pe-3"/>
                    <HelpText aria-label={t('clients_helptext_aria')}> {t('clients_helptext')} </HelpText>
                </div>
                <div className="px-6 pt-20 pb-24 mx-auto text-center bg-white shadow rounded-lg">
                    <PersonReading width="160px" height="160px"/>
                    <Paragraph className="mb-2">{t('client_page.no_clients_created')}</Paragraph>
                    <Link to="/client/add" className="no-underline text-inherit inline-block">
                        <Button className="mx-auto mt-2 shadow">
                            <PlusIcon/>
                            {t('client_page.create_client')}
                        </Button>
                    </Link>
                </div>
            </>
        )
    }

    /**
     * Renders the clients page with a list of clients, search functionality, and sorting options.
     */
    return (
        <div>
            <div className="flex items-center self-auto pt-6 mb-2">
                <AiAssistant />
                <Outlet />
                <HeadingWrapper className={'pe-3'} level={2} heading={t('client', { count: 0 })}/>
                <HelpText aria-label={t('clients_helptext_aria')}> {t('clients_helptext')} </HelpText>
                <Button variant="primary" asChild className="px-6 shadow h-full ml-auto">
                    <Link to="/client/add" className="no-underline text-accent-contrast rounded-lg">
                        <PlusIcon/>
                        {t('add')}
                    </Link>
                </Button>
            </div>
            <div className="py-2 grid grid-cols-12 gap-4 sticky top-0 z-10 bg-gray">
                <Search className="shadow col-span-6 md:col-span-5 max-w rounded-lg">
                    <Search.Input
                        placeholder={t('client_page.client_search')}
                        aria-label={t('client_page.client_search')}
                        className="border-none rounded-lg bg-white"
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search.Clear/>
                </Search>

                <div className='col-span-6 md:col-span-7'>
                    <Dropdown.TriggerContext>
                        <Dropdown.Trigger
                            variant={'tertiary'}
                            onClick={() => setIntegrationTypeDropdownOpen(!integrationTypeDropdownOpen)}>
                            <ChevronDownIcon/>
                            <div className='line-clamp-1 break-all'>
                                {selectedIntegrationType || t('client_page.all_integration_types')}
                            </div>
                        </Dropdown.Trigger>
                        <Dropdown
                            open={integrationTypeDropdownOpen}
                            onClose={() => setIntegrationTypeDropdownOpen(false)}
                            className='col-span-7 bg-white'>
                            <Dropdown.List className='gap-3'>
                                <Dropdown.Button
                                    onClick={() => {
                                        setSelectedIntegrationType(null);
                                        setIntegrationTypeDropdownOpen(false);
                                    }}
                                >
                                    {t('client_page.all_integration_types')}
                                </Dropdown.Button>
                                {Object.values(IntegrationType).map(integrationType => (
                                    <Dropdown.Button
                                        key={integrationType}
                                        onClick={() => {
                                            setSelectedIntegrationType(integrationType);
                                            setIntegrationTypeDropdownOpen(false);
                                        }}
                                        className='whitespace-nowrap'
                                    >
                                        {integrationType}
                                    </Dropdown.Button>
                                ))}
                            </Dropdown.List>
                        </Dropdown>
                    </Dropdown.TriggerContext>
                </div>
            </div>

            <div className="w-full overflow-x-auto rounded-lg mt-2">
                <Table border style={{ tableLayout: 'fixed' }} className='overflow-hidden min-w-[50rem] border-none'>
                    <Table.Head>
                        <Table.Row>
                            <Table.HeaderCell sort={sortField === SortField.Name ? (sortAscending ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort(SortField.Name)}>
                                <div className='inline-flex items-center  overflow-hidden'>
                                    <Paragraph className='py-2 pe-1'>
                                        {t('name')}
                                    </Paragraph>
                                </div>
                            </Table.HeaderCell>
                            <Table.HeaderCell>
                                <Paragraph>
                                    {t('client_id')}
                                </Paragraph>
                            </Table.HeaderCell>
                            <Table.HeaderCell sort={sortField === SortField.Created ? (sortAscending ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort(SortField.Created)}>
                                <div className='inline-flex items-center'>
                                    <Paragraph className='py-2 pe-1'>
                                        {t('created')}
                                    </Paragraph>
                                </div>
                            </Table.HeaderCell>
                        </Table.Row>
                    </Table.Head>
                    <Table.Body>
                        {rows}
                    </Table.Body>
                </Table>
            </div>
        </div>
    );
}
