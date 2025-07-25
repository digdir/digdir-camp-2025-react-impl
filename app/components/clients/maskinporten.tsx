import { FormMetadata } from '@conform-to/react';
import { Card, Checkbox, Field, Fieldset, Label, Paragraph, Select } from '@digdir/designsystemet-react';

import { useTranslation } from '~/lib/i18n';
import { MaskinportenSchema } from '~/lib/clients';
import { Client, Scope } from '~/lib/models';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { ApiResponse } from '~/lib/api_client';

import { HelpText } from '../util/HelpText';
import { Textfield } from '../util/TextField';


const MaskinportenClient = (props: {
    form: FormMetadata<MaskinportenSchema>;
    client?: Client;
    scopesAccessibleForAll?: Promise<ApiResponse<Scope[]>>;
    scopesWithDelegationSource?: Promise<ApiResponse<Scope[]>>;
}) => {
    const { form, client } = props;
    const { t } = useTranslation();
    const fields = form.getFieldset();

    return (
        <>
            <Card
                className={'shadow space-y-5 border-none rounded-lg col-span-12 flex flex-col p-6 bg-white'}
                data-color='accent'
            >
                <HeadingWrapper level={4} heading={t('general')} className='w-full lg:w-1/2'/>
                {client && (
                    <div className='flex flex-wrap gap-5'>
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
                    </div>
                )}
                <Textfield
                    className={'w-full lg:w-1/2'}
                    label={t('client_page.display_name')}
                    helpText={t('client_page.display_name_help_text')}
                    id={fields.client_name.key}
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
                    counter={255}
                    maxLength={255}
                    defaultValue={client?.description}
                    error={t(fields.description.errors || '')}
                />
            </Card>

            <Card
                className={`bg-white space-y-5 shadow border-none rounded-lg flex flex-col col-span-12 md:col-span-6 p-6 ${!client ? 'hidden' : ''}`}
                data-color='accent'
            >
                <HeadingWrapper level={4} heading={t('client_page.properties')}/>
                <Field>
                    <div className='flex items-center gap-2'>
                        <Label>{t('client_page.application_type')}</Label>
                        <HelpText aria-label={t('client_page.application_type_description')}>{t('client_page.application_type_description')}</HelpText>
                    </div>
                    <Select
                        readOnly
                        className={` ${client ? 'w-full xl:w-1/2' : 'w-full lg:w-1/4'} `}
                        id={fields.application_type.key}
                        name={fields.application_type.name}
                        defaultValue={client?.application_type || 'web'}>
                        <Select.Option value="web">web</Select.Option>
                    </Select>
                </Field>
                <Fieldset id={fields.token_endpoint_auth_method.key}>
                    <div className='flex items-center gap-2'>
                        <Label>{t('client_page.token_endpoint_auth_method')}</Label>
                        <HelpText aria-label={t('client_page.token_endpoint_auth_method_description')}>
                            {t('client_page.token_endpoint_auth_method_description')}
                        </HelpText>
                    </div>
                    <Checkbox defaultChecked readOnly label='private_key_jwt' value='private_key_jwt' name={fields.token_endpoint_auth_method.name}/>
                </Fieldset>

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
                        label="urn:ietf:params:oauth:grant-type:jwt-bearer"
                        value="urn:ietf:params:oauth:grant-type:jwt-bearer"
                        name={fields.grant_types.name}
                    />
                </Fieldset>
            </Card>

            <Card
                className={`shadow space-y-5 border-none rounded-lg col-span-12 bg-white ${client ? 'md:col-span-6' : ''} p-6`}
            >
                <HeadingWrapper level={4} heading={t('client_page.lifetime_token')}/>
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
                        data-field-type="access_token_lifetime"
                    />
                </div>
            </Card>
        </>
    );
};

export default MaskinportenClient;
