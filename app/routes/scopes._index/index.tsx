import { Link, Outlet, useLoaderData } from 'react-router';
import { Button, Dropdown, Paragraph, Search, Table } from '@digdir/designsystemet-react';
import { useEffect, useState } from 'react';
import { ChevronDownIcon, PlusIcon } from '@navikt/aksel-icons';

import { useTranslation } from '~/lib/i18n';
import { ApiClient } from '~/lib/api_client';
import { formatDateTimeCompact } from '~/lib/utils';
import { Scope } from '~/lib/models';
import AlertWrapper from '~/components/util/AlertWrapper';
import { isErrorResponse } from '~/lib/errors';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import PersonFishing from '~/components/art/PersonFishing';
import { HelpText } from '~/components/util/HelpText';
import { Authorization } from '~/lib/auth';
import { ContextBuilder } from '~/lib/context-builder';
import AiAssistant, { useAiAssistantContext } from '~/components/ai/AiAssistant';

/**
 * Function to load the client data for scopes.
 */
export async function clientLoader() {
    await Authorization.requireAuthenticatedUser();
    const apiClient = await ApiClient.create();

    const [scopesResult, scopePrefixesResult] = await Promise.all([
        apiClient.getScopes(),
        apiClient.getScopePrefixes()
    ]);

    const { data: scopes, error: scopesError } = scopesResult;
    const { data: scopePrefixes, error: scopePrefixesError } = scopePrefixesResult;

    const error = scopesError || scopePrefixesError;

    return error ? error.toErrorResponse() : { scopes, scopePrefixes };
}

/**
 * Enum representing the fields by which scopes can be sorted.
 */
enum SortField {
    Name = 'name',
    Description = 'description',
    Created = 'created',
}

/**
 * Component for displaying and managing scopes.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Scopes() {
    const { t } = useTranslation();
    const { setContext } = useAiAssistantContext();

    const [prefixDropdownOpen, setPrefixDropdownOpen] = useState(false);
    const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);

    // Set initial sorting by "created" in ascending order
    const [sortField, setSortField] = useState<SortField>(SortField.Created);
    const [sortAscending, setSortAscending] = useState(false);

    const data = useLoaderData<typeof clientLoader>();

    useEffect(() => {
        if (isErrorResponse(data)) {
            return;
        }

        const { scopes, scopePrefixes } = data;
        const loadContext = async () => {
            const builtContext = await ContextBuilder.buildScopesContext(scopes ?? [], scopePrefixes ?? []);
            setContext({
                ...builtContext,
                page: 'scopes',
                info: 'Dette er selvbetjening scopesiden'
            });
        };
        void loadContext();
    }, [data, setContext]);

    if (isErrorResponse(data)) {
        return <AlertWrapper message={data.error} type="error"/>;
    }

    const { scopes, scopePrefixes } = data;

    const compareScopes = (a: Scope, b: Scope, sortField: SortField) => {
        const result = a[sortField]!.localeCompare(b[sortField]!);
        return sortAscending ? result : -result;
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAscending(!sortAscending);
        } else {
            setSortField(field);
            setSortAscending(true);
        }
    };

    const sortedScopes = scopes ? [...scopes].sort((a, b) => compareScopes(a, b, sortField)) : [];

    const filteredScopes = sortedScopes;

    const nameSortOrder = sortField === SortField.Name ? (sortAscending ? 'ascending' : 'descending') : 'none';
    const createdSortOrder = sortField === SortField.Created ? (sortAscending ? 'ascending' : 'descending') : 'none';

    const rows = filteredScopes.map(scope => (
        <Table.Row key={scope.name}>
            <Table.Cell>
                <div className="text-base font-semibold break-all py-2">
                    <Link to={`/scopes/${encodeURIComponent(scope.name as string)}`} key={scope.name} tabIndex={0} className="no-underline text-accent"> {scope.name} </Link>
                </div>
            </Table.Cell>
            <Table.Cell>
                <div className="break-all line-clamp-3">
                    {scope.description}
                </div>
            </Table.Cell>
            <Table.Cell>
                {scope.created ? formatDateTimeCompact(new Date(scope.created)) : 'N/A'}
            </Table.Cell>
        </Table.Row>
    ));

    if (scopePrefixes.length <= 0) {
        return (
            <>
                <div className="flex items-baseline self-auto pt-6 mb-2">
                    <HeadingWrapper level={2} heading={t('scope', { count: 0 })} className="mb-6 pe-3"/>
                    <HelpText aria-label={t('scopes_helptext_aria')}> {t('scopes_helptext')} </HelpText>
                </div>
                <div className="px-6 mx-auto text-center bg-white shadow rounded-lg">
                    <PersonFishing width="240px" height="240px"/>
                    <HeadingWrapper level={4} heading={t('scope_page.could_not_find_prefixes_heading')} className="mb-6"/>
                    <Paragraph className="mb-6">{t('scope_page.could_not_find_prefixes_body')}</Paragraph>
                    <Link to="/clients" className="no-underline text-inherit inline-block rounded-3xl mb-20">
                        <Button className="mx-auto shadow">
                            {t('scope_page.to_my_clients')}
                        </Button>
                    </Link>
                </div>
            </>
        )
    }

    if (scopes.length <= 0) {
        return (
            <>
                <div className="flex items-baseline self-auto pt-6 mb-2">
                    <HeadingWrapper level={2} heading={t('scope', { count: 0 })} className="mb-6 pe-3"/>
                    <HelpText aria-label={t('scopes_helptext_aria')}> {t('scopes_helptext')} </HelpText>
                </div>
                <div className="px-6 mx-auto text-center bg-white shadow rounded-lg">
                    <PersonFishing width="240px" height="240px"/>
                    <Paragraph className="mb-2">{t('scope_page.no_scopes_created')}</Paragraph>
                    <Link to="/scopes/add" className="no-underline text-inherit inline-block rounded-3xl mb-20 mt-2">
                        <Button className="mx-auto shadow">
                            <PlusIcon/>
                            {t('scope_page.create_scope')}
                        </Button>
                    </Link>
                </div>
            </>
        )
    }

    /**
     * Renders the scopes page with a list of scopes, search functionality, and sorting options.
     */
    return (
        <div>
            <div className="flex items-center self-auto pt-6 mb-2">
                <AiAssistant />
                <Outlet />
                <HeadingWrapper className={'pe-3'} level={2} heading={t('scope', { count: 0 })}/>
                <HelpText aria-label={t('scopes_helptext_aria')}> {t('scopes_helptext')} </HelpText>
                {scopePrefixes.length > 0 && <Button variant='primary' asChild className="px-6 shadow h-full ml-auto">
                    <Link to="/scopes/add" className="no-underline text-accent-contrast">
                        <PlusIcon/>
                        {t('add')}
                    </Link>
                </Button>}
            </div>

            <div className="py-2 grid grid-cols-12 sticky top-0 z-10 bg-gray">
                {scopes.length > 3 && (
                    <div className='col-span-12 grid grid-cols-12 gap-4 '>
                        <Search className='shadow col-span-6 md:col-span-5 max-w'>
                            <Search.Input
                                placeholder={t('scope_page.scope_search')}
                                aria-label={t('scope_page.scope_search')}
                                className='border-none bg-white'
                            />
                            <Search.Clear/>
                        </Search>
                        {scopePrefixes.length > 0 && (
                            <div className='col-span-6 md:col-span-7'>
                                <Dropdown.TriggerContext>
                                    <Dropdown.Trigger
                                        variant={'tertiary'}
                                        onClick={() => setPrefixDropdownOpen(!prefixDropdownOpen)}>
                                        <ChevronDownIcon/>
                                        <div className='line-clamp-1 break-all'>
                                            {selectedPrefix || t('scope_page.all_prefixes')}
                                        </div>
                                    </Dropdown.Trigger>
                                    <Dropdown open={prefixDropdownOpen} onClose={() => setPrefixDropdownOpen(false)} className='col-span-7 bg-white'>
                                        <Dropdown.List className='gap-3'>
                                            <Dropdown.Button
                                                onClick={() => {
                                                    setSelectedPrefix(null);
                                                    setPrefixDropdownOpen(false);
                                                }}
                                            >
                                                {t('scope_page.all_prefixes')}
                                            </Dropdown.Button>

                                            {scopePrefixes.map(scopePrefix => (
                                                <Dropdown.Button
                                                    key={scopePrefix.prefix}
                                                    onClick={() => {
                                                        setSelectedPrefix(scopePrefix.prefix!);
                                                        setPrefixDropdownOpen(false);
                                                    }}
                                                    className='whitespace-nowrap'
                                                >
                                                    {scopePrefix.prefix}
                                                </Dropdown.Button>
                                            ))}
                                        </Dropdown.List>
                                    </Dropdown>
                                </Dropdown.TriggerContext>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {scopes.length > 0 && (
                <div className="w-full overflow-x-auto rounded-lg mt-2">
                    <Table border style={{ tableLayout: 'fixed' }} className='overflow-hidden min-w-[50rem] border-none'>
                        <Table.Head>
                            <Table.Row>
                                <Table.HeaderCell sort={nameSortOrder} onClick={() => handleSort(SortField.Name)}>
                                    <div className='inline-flex items-center  overflow-hidden'>
                                        <Paragraph className='py-2 pe-1'>
                                            {t('name')}
                                        </Paragraph>
                                    </div>
                                </Table.HeaderCell>
                                <Table.HeaderCell>
                                    <Paragraph>
                                        {t('description')}
                                    </Paragraph>
                                </Table.HeaderCell>
                                <Table.HeaderCell sort={createdSortOrder} onClick={() => handleSort(SortField.Created)}>
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
            )}
        </div>
    );
}
