import { FormMetadata } from '@conform-to/react';
import { Button, Card, Checkbox, Field, Fieldset, Label, Paragraph, Select } from '@digdir/designsystemet-react';
import { RefObject, useState } from 'react';

import { ApplicationType, IdportenSchema, IntegrationType, TokenAuthenticationMethod } from '~/lib/clients';
import { useTranslation } from '~/lib/i18n';
import { Client } from '~/lib/models';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { UriCard } from '~/components/util/uri/UriCard';

import { HelpText } from '../util/HelpText';
import { Textfield } from '../util/TextField';

type Props = {
    form: FormMetadata<IdportenSchema>;
    client?: Client;
    onGenerateSecretClick: () => void;
    uriCardRef: RefObject<HTMLDivElement | null>;
}

const IdportenClient = ({ form, client, onGenerateSecretClick, uriCardRef }: Props) => {
    const { t } = useTranslation();
    const fields = form.getFieldset();

    const [actAsSupplier, setActAsSupplier] = useState((client?.supplier_orgno !== undefined) || false);

    const handleActAsSupplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setActAsSupplier(e.target.checked);
    };

    // Available token_endpoint_auth_method values depend on the selected application_type.
    // https://docs.digdir.no/docs/idporten/oidc/oidc_func_clientreg#klient-typer
    const [applicationType, setApplicationType] = useState<string>(client?.application_type || 'web');
    const [sso_disabled, setSso_disabled] = useState<boolean | undefined>(client?.sso_disabled);
    const [tokenAuthMethod, setTokenAuthMethod] = useState<string | undefined>(client?.token_endpoint_auth_method);

    return (
        <>
            <Card
                className={'shadow space-y-5 border-none rounded-lg col-span-12 flex flex-col p-6 bg-white'}
                data-color='accent'
            >
                <HeadingWrapper level={4} heading={t('general')} className="w-full lg:w-1/2"/>
                {client && (
                    <div className="flex flex-wrap gap-7">
                        <Field className='flex flex-col'>
                            <div className='flex items-center gap-2'>
                                <Label>{t('service')}</Label>
                                <HelpText aria-label={t('helptext_for') + t('service')}>{t('client_page.service_helptext')}</HelpText>
                            </div>
                            <Paragraph>{client?.integration_type}</Paragraph>
                        </Field>
                        <Field className='flex flex-col'>
                            <div className='flex items-center gap-2'>
                                <Label>{t('client_id')}</Label>
                            </div>
                            <Paragraph>{client?.client_id}</Paragraph>
                        </Field>
                        {actAsSupplier && (
                            <>
                                <Field className='flex flex-col'>
                                    <div className='flex items-center gap-2'>
                                        <Label>{t('client_page.owner_organization_number')}</Label>
                                    </div>
                                    <Paragraph>{client?.client_orgno}</Paragraph>
                                </Field>
                                {client.supplier_orgno && (
                                    <Field className='flex flex-col'>
                                        <div className='flex items-center gap-2'>
                                            <Label>{t('client_page.supplier_organization_number')}</Label>
                                        </div>
                                        <Paragraph>{client?.supplier_orgno}</Paragraph>
                                    </Field>
                                )}
                            </>
                        )}
                    </div>
                )}
                <Checkbox
                    className={`${(fields.integration_type.value === IntegrationType.MASKINPORTEN) || client ? 'hidden' : ''} col-span-12`}
                    label={t('client_page.create_client_for_customer')}
                    defaultChecked={(client?.supplier_orgno !== undefined) || false}
                    onChange={handleActAsSupplierChange}
                />
                {(actAsSupplier) && (
                    <Textfield
                        className={client ? 'hidden' : '' + 'w-full lg:w-1/4'}
                        label={t('client_page.customer_organization_number')}
                        helpText={t('client_page.customer_organization_number')}
                        id={fields.client_orgno.key}
                        maxLength={9}
                        name={fields.client_orgno.name}
                        error={t(fields.client_orgno.errors || '')}
                        defaultValue={client?.client_orgno}
                    />
                )}
                <Textfield
                    className={'w-full lg:w-1/2'}
                    label={t('client_page.display_name')}
                    helpText={t('client_page.display_name_help_text')}
                    id={fields.client_name.key}
                    description={client ? '' : t('client_page.display_name_should_contain_user')}
                    name={fields.client_name.name}
                    defaultValue={client?.client_name}
                    error={t(fields.client_name.errors || '')}
                />
                <Textfield
                    className='w-full lg:w-2/4'
                    multiline
                    label={t('client_page.description')}
                    helpText={t('client_page.description_help_text')}
                    id={fields.description.key}
                    name={fields.description.name}
                    maxLength={255}
                    counter={255}
                    defaultValue={client?.description}
                    error={t(fields.description.errors || '')}
                />
            </Card>
            <Card
                className={`bg-white space-y-5 shadow border-none rounded-lg flex flex-col col-span-12  ${client ? 'md:col-span-6' : ''}  p-6`}
                data-color='accent'
            >
                <HeadingWrapper level={4} heading={t('client_page.properties')}/>
                <Field className='col-span-12 lg:col-span-6'>
                    <div className="flex items-center gap-2">
                        <Label>
                            {t('client_page.application_type')}
                        </Label>
                        <HelpText aria-label={t('client_page.application_type_description')}>
                            {t('client_page.application_type_description')}
                        </HelpText>
                    </div>
                    <Select
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        id={fields.application_type.key}
                        name={fields.application_type.name}
                        defaultValue={client?.application_type}
                        onChange={(e) => setApplicationType(e.target.value)}
                    >
                        <Select.Option value={ApplicationType.WEB}>{ApplicationType.WEB}</Select.Option>
                        <Select.Option value={ApplicationType.BROWSER}>{ApplicationType.BROWSER}</Select.Option>
                        <Select.Option value={ApplicationType.NATIVE}>{ApplicationType.NATIVE}</Select.Option>
                    </Select>
                </Field>

                <Field>
                    <div className="flex items-center gap-2">
                        <Label>
                            {t('client_page.token_endpoint_auth_method')}
                        </Label>
                        <HelpText aria-label={t('client_page.token_endpoint_auth_method_description')}>
                            {t('client_page.token_endpoint_auth_method_description')}
                        </HelpText>
                    </div>
                    <Select
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        id={fields.token_endpoint_auth_method.key}
                        name={fields.token_endpoint_auth_method.name}
                        defaultValue={client?.token_endpoint_auth_method}
                        onChange={(e) => setTokenAuthMethod(e.target.value)}
                        readOnly={applicationType !== ApplicationType.WEB}
                    >
                        {applicationType !== ApplicationType.WEB && <Select.Option value={TokenAuthenticationMethod.NONE}>{TokenAuthenticationMethod.NONE}</Select.Option>}
                        {applicationType === ApplicationType.WEB && (<>
                            <Select.Option value={TokenAuthenticationMethod.PRIVATE_KEY_JWT}>{TokenAuthenticationMethod.PRIVATE_KEY_JWT}</Select.Option>
                            <Select.Option value={TokenAuthenticationMethod.CLIENT_SECRET_POST}>{TokenAuthenticationMethod.CLIENT_SECRET_POST}</Select.Option>
                            <Select.Option value={TokenAuthenticationMethod.CLIENT_SECRET_BASIC}>{TokenAuthenticationMethod.CLIENT_SECRET_BASIC}</Select.Option>
                        </>)}
                    </Select>

                    {(tokenAuthMethod === TokenAuthenticationMethod.CLIENT_SECRET_BASIC || tokenAuthMethod === TokenAuthenticationMethod.CLIENT_SECRET_POST) &&
                        (
                            <div>
                                <Button
                                    variant='secondary'
                                    className="bg-gray hover:bg-white mt-2"
                                    onClick={onGenerateSecretClick}>
                                    {t('client_page.generate_secret')}
                                </Button>
                            </div>
                        )
                    }
                </Field>
                <Fieldset id={fields.grant_types.key}>
                    <div className="flex items-center gap-2">
                        <Label>
                            {t('client_page.allowed_grant_types')}
                        </Label>
                        <HelpText aria-label={t('client_page.token_endpoint_auth_method_description')}>
                            {t('client_page.allowed_grant_types_description')}
                        </HelpText>
                    </div>
                    <Checkbox
                        defaultChecked
                        readOnly
                        label="authorization_code"
                        value="authorization_code"
                        name={fields.grant_types.name}
                    />
                    <div className="flex items-center gap-2">
                        <Checkbox
                            label="Refresh token"
                            value="refresh_token"
                            name={fields.grant_types.name}
                            defaultChecked={client ? client.grant_types?.includes('refresh_token') : false}
                        />
                        <HelpText aria-label={t('helptext_for') + 'refresh token'}>{t('client_page.refresh_token_helptext')}</HelpText>
                    </div>

                </Fieldset>
                <div className="items-center gap-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>
                            SSO
                        </Label>
                        <HelpText aria-label={t('client_page.sso_disabled_description')}>
                            {t('client_page.sso_disabled_description')}
                        </HelpText>
                    </div>
                    <Checkbox
                        label={t('client_page.sso_disabled')}
                        id={fields.sso_disabled.key}
                        onChange={(e) => setSso_disabled(e.target.checked)}
                        name={fields.sso_disabled.name}
                        defaultChecked={client?.sso_disabled}
                    />
                </div>
            </Card>

            <Card
                className={`bg-white space-y-5 shadow border-none rounded-lg flex flex-col col-span-12 ${client ? 'md:col-span-6' : ''} p-6`}
                data-color='accent'
            >
                <HeadingWrapper level={4} heading={t('client_page.lifetime_token')}/>
                <Field>
                    <div className="flex items-center gap-2">
                        <Label>
                            {t('client_page.code_challenge_method')}
                        </Label>
                        <HelpText aria-label={t('client_page.code_challenge_method_description')}>
                            <Paragraph> {t('client_page.code_challenge_method_description')} </Paragraph>
                        </HelpText>
                    </div>
                    <Select
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        id={fields.code_challenge_method.key}
                        name={fields.code_challenge_method.name}
                        defaultValue={client?.code_challenge_method}
                    >
                        <Select.Option value="S256">{t('s256')}</Select.Option>
                        <Select.Option value="none">{t('none')}</Select.Option>
                    </Select>
                </Field>
                <Field>
                    <div className="flex items-center gap-2">
                        <Label>
                            {t('client_page.refresh_token_usage')}
                        </Label>
                        <HelpText aria-label={t('client_page.refresh_token_usage_description')}>
                            {t('client_page.refresh_token_usage_description')}
                        </HelpText>
                    </div>
                    <Select
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        id={fields.refresh_token_usage.key}
                        name={fields.refresh_token_usage.name}
                        defaultValue={client?.refresh_token_usage}
                    >
                        <Select.Option value="ONETIME">{t('onetime')}</Select.Option>
                        <Select.Option value="REUSE">{t('reusable')}</Select.Option>
                    </Select>
                </Field>

                <div className={`flex ${client ? 'flex-col' : 'flex-col md:flex-row'} gap-4`}>
                    <Textfield
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        label={t('client_page.lifetime_access_token')}
                        helpText={t('client_page.lifetime_access_token_description')}
                        suffix={t('seconds')}
                        id={fields.access_token_lifetime.key}
                        name={fields.access_token_lifetime.name}
                        defaultValue={client?.access_token_lifetime || 120}
                        error={t(fields.access_token_lifetime.errors || '')}
                    />
                    <Textfield
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        label={t('client_page.lifetime_refresh_token')}
                        helpText={t('client_page.lifetime_refresh_token_description')}
                        suffix={t('seconds')}
                        id={fields.refresh_token_lifetime.key}
                        name={fields.refresh_token_lifetime.name}
                        defaultValue={client?.refresh_token_lifetime || 600}
                        error={t(fields.refresh_token_lifetime.errors || '')}
                    />
                    <Textfield
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        label={t('client_page.lifetime_authorization')}
                        helpText={t('client_page.lifetime_authorization_description')}
                        suffix={t('seconds')}
                        id={fields.authorization_lifetime.key}
                        name={fields.authorization_lifetime.name}
                        defaultValue={client?.authorization_lifetime || 7200}
                        error={t(fields.authorization_lifetime.errors || '')}
                    />
                </div>
            </Card>

            <UriCard form={form} client={client} ssoDisabled={sso_disabled} uriCardRef={uriCardRef} applicationType={applicationType as ApplicationType}/>
        </>
    );
};

export default IdportenClient;
