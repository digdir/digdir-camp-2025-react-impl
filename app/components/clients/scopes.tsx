import { Button, Card, Checkbox, Dialog, Divider, Fieldset, Label, List, Paragraph, Radio, Search, Textfield } from '@digdir/designsystemet-react';
import { ChangeEvent, use, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import { createPortal } from 'react-dom';
import { FormMetadata } from '@conform-to/react';

import { ApiResponse } from '~/lib/api_client';
import { Scope, ScopeAccess } from '~/lib/models';
import { useTranslation } from '~/lib/i18n';
import { BaseSchema, IntegrationType } from '~/lib/clients';

import HeadingWrapper from '../util/HeadingWrapper';

enum FilterCategory {
    All = 'all',
    AccessibleForAll = 'accessibleForAll',
    DelegationSource = 'delegationSource',
    AvailableToOrganization = 'availableToOrganization'
}

const ScopesCard = (props: {
    scopesAccessibleForAll?: Promise<ApiResponse<Scope[]>>;
    scopesWithDelegationSource?: Promise<ApiResponse<Scope[]>>;
    scopesAvailableToOrganization: Promise<ApiResponse<ScopeAccess[]>>,
    form: FormMetadata<BaseSchema>;
    service?: string;
    onServiceChange: (newService: string) => void;
}) => {
    const { form, service, onServiceChange } = props;
    const { t } = useTranslation();
    const fields = form.getFieldset();

    const NON_REMOVABLE_SCOPES = useMemo(() => ['openid', 'profile'], []);
    const KRR_SCOPES = ['krr:global/kontaktinformasjon.read', 'krr:global/digitalpost.read'];

    const getInitialScopes = (service?: string) => {
        return service === IntegrationType.IDPORTEN || service === IntegrationType.ANSATTPORTEN
            ? [...NON_REMOVABLE_SCOPES]
            : [];
    };

    const [scopes, setScopes] = useState<string[]>(getInitialScopes(service));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSelectedScopes, setModalSelectedScopes] = useState<string[]>([]);

    const scopesAccessibleForAllData = props.scopesAccessibleForAll ? use(props.scopesAccessibleForAll) : undefined;
    const scopesWithDelegationSourceData = props.scopesWithDelegationSource ? use(props.scopesWithDelegationSource) : undefined;
    const scopesAvailableToOrganizationData = props.scopesAvailableToOrganization ? use(props.scopesAvailableToOrganization) : undefined;

    const scopesAccessibleToAll = useMemo(() =>
        scopesAccessibleForAllData?.data?.map(scope => ({
            name: scope.name || '',
            description: scope.description || ''
        })) ?? [],
    [scopesAccessibleForAllData]
    );

    const scopesWithDelegationSource = useMemo(() =>
        scopesWithDelegationSourceData?.data?.map(scope => ({
            name: scope.name || '',
            description: scope.description || ''
        })) ?? [],
    [scopesWithDelegationSourceData]
    );

    const scopesAvailableToOrganization = useMemo(() =>
        scopesAvailableToOrganizationData?.data?.map(scope => ({
            name: scope.scope || '',
            description: ''
        })) ?? [],
    [scopesAvailableToOrganizationData]
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([
        FilterCategory.AvailableToOrganization
    ]);

    const toggleFilter = (filter: FilterCategory) => {
        setFilterCategories((prev) =>
            prev.includes(filter)
                ? prev.filter((f) => f !== filter)
                : [...prev, filter]
        );
    };

    const effectiveScopes = useMemo(() => {
        if (service === IntegrationType.IDPORTEN || service === IntegrationType.ANSATTPORTEN) {
            return [...new Set([...scopes, ...NON_REMOVABLE_SCOPES])];
        }
        return scopes;
    }, [scopes, service, NON_REMOVABLE_SCOPES]);

    const availableScopes = useMemo(() => {
        const map = new Map<string, { name: string; description: string }>();

        const addScopes = (list: { name: string; description: string }[]) => {
            for (const scope of list) {
                if (!scopes.includes(scope.name) && !map.has(scope.name)) {
                    map.set(scope.name, scope);
                }
            }
        };

        if (filterCategories.includes(FilterCategory.AccessibleForAll)) {
            addScopes(scopesAccessibleToAll);
        }
        if (filterCategories.includes(FilterCategory.DelegationSource)) {
            const delegationOnly = scopesWithDelegationSource.filter(
                scope => !scopesAccessibleToAll.find(s => s.name === scope.name)
            );
            addScopes(delegationOnly);
        }
        if (filterCategories.includes(FilterCategory.AvailableToOrganization)) {
            addScopes(scopesAvailableToOrganization);
        }

        return Array.from(map.values());
    }, [
        filterCategories,
        scopesAccessibleToAll,
        scopesWithDelegationSource,
        scopesAvailableToOrganization,
        scopes
    ]);

    const displayedScopes = availableScopes.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Remove a scope from the list
    const removeScope = (scopeToRemove: string) => {
        if (!NON_REMOVABLE_SCOPES.includes(scopeToRemove)) {
            setScopes((prevScopes) => prevScopes.filter((scope) => scope !== scopeToRemove));
        }
    };

    // Add KRR scopes separately to the scopes array
    const handleKRRChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { checked } = event.target;
        if (checked) {
            setScopes((prevScopes) => [
                ...new Set([
                    ...prevScopes,
                    ...KRR_SCOPES,
                ]),
            ]);
        } else {
            setScopes((prevScopes) =>
                prevScopes.filter(
                    (scope) => !KRR_SCOPES.includes(scope)
                )
            );
        }
    };

    const [previousScopes, setPreviousScopes] = useState<string[]>([]);

    // Toggle between idporten client and api_klient but remember selected scopes if user changes their mind :)
    //const handleServiceChange = (event: ChangeEvent<HTMLInputElement>) => {
    //    const isApiClient = event.target.checked;
    //
    //    if (isApiClient) {
    //        setScopes(() => [...new Set([...NON_REMOVABLE_SCOPES,...previousScopes])]);
    //    } else {
    //        setPreviousScopes(scopes.filter(scope => !NON_REMOVABLE_SCOPES.includes(scope)));
    //        setScopes(NON_REMOVABLE_SCOPES);
    //    }
    //
    //    onServiceChange(isApiClient ? IntegrationType.API_KLIENT : IntegrationType.IDPORTEN);
    //};

    // Check if KRR scopes are already added
    const isKRRChecked = KRR_SCOPES.every((scope) => scopes.includes(scope));

    return (
        <Card className='shadow space-y-4 border-none rounded-lg col-span-12 bg-white p-6'>
            <HeadingWrapper level={4} heading={t('scope')}/>
            <Textfield className="hidden" label="Scopes" name={fields.scope.name} id={fields.scope.key} value={scopes} readOnly error={fields.scope.errors}/>

            {(service === IntegrationType.IDPORTEN || service === IntegrationType.API_KLIENT) && (

                <Fieldset>
                    <Fieldset.Legend>
                        {t('client_page.use_external_scope')}
                    </Fieldset.Legend>
                    <Fieldset.Description className='ps-[3px]'>
                        {t('client_page.use_external_scope_description')}
                    </Fieldset.Description>
                    <div className='col-span-12 flex items-center gap-4'>
                        <Radio
                            label="Ja"
                            name="apiClientChoice"
                            value="yes"
                            checked={service === IntegrationType.API_KLIENT}
                            onChange={() => {
                                setScopes(() => [...new Set([...NON_REMOVABLE_SCOPES, ...previousScopes])]);
                                onServiceChange(IntegrationType.API_KLIENT);
                            }}
                        />
                        <Radio
                            label="Nei"
                            name="apiClientChoice"
                            value="no"
                            checked={service === IntegrationType.IDPORTEN}
                            onChange={() => {
                                setPreviousScopes(scopes.filter(scope => !NON_REMOVABLE_SCOPES.includes(scope)));
                                setScopes(NON_REMOVABLE_SCOPES);
                                onServiceChange(IntegrationType.IDPORTEN);
                            }}
                        />
                    </div>
                </Fieldset>
            )}
            {service === IntegrationType.MASKINPORTEN && (
                <Fieldset>
                    <div className='flex items-center gap-2'>
                        <Label>{t('client_page.scope_bundles')}</Label>
                    </div>
                    <Checkbox
                        label='KRR'
                        value={KRR_SCOPES.join(',')}
                        checked={isKRRChecked}
                        onChange={handleKRRChange}
                    />
                </Fieldset>
            )}

            <Fieldset className='w-full xl:w-1/2'>
                <div className='flex items-center gap-2 min-h-12'>
                    <Label>{t('client_page.scopes_to_be_added')}</Label>
                    {(service !== IntegrationType.IDPORTEN) && (
                        <Button
                            className='ml-auto'
                            variant='tertiary'
                            onClick={() => {
                                setModalSelectedScopes([...scopes]);
                                setIsModalOpen(true);
                            }}
                        >
                            <PlusIcon/> {t('scope_page.add_scope')}
                        </Button>
                    )}
                </div>
                {scopes.length > 0 && (
                    <div className='margin-none'>
                        <List.Unordered style={{ listStyle: 'none', padding: 0 }}>
                            {effectiveScopes.map(scope => (
                                <div key={scope}>
                                    <Divider/>
                                    <List.Item className="min-h-10 flex items-center px-2" id={scope}>
                                        {scope}
                                        {!NON_REMOVABLE_SCOPES.includes(scope) && (
                                            <Button className="ml-auto" variant="tertiary" onClick={() => removeScope(scope)}>
                                                <TrashIcon className="text-2xl "/>
                                            </Button>
                                        )}
                                    </List.Item>
                                </div>
                            ))}
                        </List.Unordered>
                    </div>
                )}
                {!(scopes.length > 0) && (
                    <>
                        <Divider className='margin-none pb-2'/>
                        <Paragraph className='py-2 text-subtle'> {t('client_page.no_scopes_added')} </Paragraph>
                    </>
                )}
            </Fieldset>

            {isModalOpen && (
                createPortal(
                    <Dialog data-size={'sm'} className="rounded-lg max-h-fit max-w-[1400px]" open={true} closedby="any" onClose={() => setIsModalOpen(false)}>
                        <Dialog.Block className="space-y-4 p-4 bg-gray">
                            <Label>{t('scope_page.add_scope')}</Label>
                            <div className="space-y-2">

                                <HeadingWrapper level={4} heading={t('client_page.available_scopes')}/>
                                <Search className='shadow col-span-1'>
                                    <Search.Input
                                        placeholder="Søk etter scope"
                                        aria-label="Søk etter scope"
                                        className="border-none shadow bg-white"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}/>
                                    <Search.Clear/>
                                </Search>
                            </div>
                            <Fieldset>
                                <div className="flex flex-wrap gap-6">
                                    <Checkbox
                                        label={t('client_page.granted_to_me')}
                                        checked={filterCategories.includes(FilterCategory.AvailableToOrganization)}
                                        onChange={() => toggleFilter(FilterCategory.AvailableToOrganization)}
                                    />
                                    <Checkbox
                                        label={t('client_page.accessible_for_all')}
                                        checked={filterCategories.includes(FilterCategory.AccessibleForAll)}
                                        onChange={() => toggleFilter(FilterCategory.AccessibleForAll)}
                                    />
                                    <Checkbox
                                        label={t('client_page.delegated')}
                                        checked={filterCategories.includes(FilterCategory.DelegationSource)}
                                        onChange={() => toggleFilter(FilterCategory.DelegationSource)}
                                    />
                                </div>
                            </Fieldset>
                        </Dialog.Block>

                        <Dialog.Block className="bg-white h-[calc(80vh-250px)] overflow-y-auto p-4">
                            <div className="overflow-y-auto">
                                <Fieldset className="space-y-4">
                                    {displayedScopes.length > 0 ? (
                                        displayedScopes.map(scope => (
                                            <div key={scope.name} className="mb-3">
                                                <Checkbox
                                                    label={scope.name}
                                                    value={scope.name}
                                                    checked={modalSelectedScopes.includes(scope.name)}
                                                    onChange={(event) => {
                                                        const { checked, value } = event.target;
                                                        setModalSelectedScopes((prev) =>
                                                            checked ? [...new Set([...prev, value])] : prev.filter((s) => s !== value)
                                                        );
                                                    }}
                                                />
                                                {scope.description && (
                                                    <Paragraph className="ml-7 text-sm text-subtle max-w-[60ch] line-clamp-2">
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
                                    onClick={() => {
                                        setScopes((prevScopes) => [...new Set([...prevScopes, ...modalSelectedScopes])]);
                                        setIsModalOpen(false);
                                        setModalSelectedScopes([]);
                                    }}
                                >
                                    {t('submit')}
                                </Button>
                                <Button variant="tertiary" onClick={() => setIsModalOpen(false)}>
                                    {t('close')}
                                </Button>
                            </div>
                        </Dialog.Block>
                    </Dialog>,
                    document.body
                )
            )}
        </Card>
    )
};

export default ScopesCard;

