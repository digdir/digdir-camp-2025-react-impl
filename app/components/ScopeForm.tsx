import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { Button, Card, Checkbox, Field, Fieldset, Label, Paragraph, Radio, Select } from '@digdir/designsystemet-react';
import { CheckmarkIcon, TrashIcon } from '@navikt/aksel-icons';
import { useState } from 'react';
import { Form, useFetcher } from 'react-router';
import { z } from 'zod';
import { createPortal } from 'react-dom';

import { useTranslation } from '~/lib/i18n';
import { ActionIntent } from '~/routes/scopes.$name/route';
import { DelegationSource, ExtendedScope, ScopePrefix } from '~/lib/models';
import { ScopeSchema, scopeSchema } from '~/lib/scopes';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { IntegrationType } from '~/lib/clients';

import ConfirmDeleteModal from './util/ConfirmDeleteModal';
import { HelpText, LabelWithHelpText } from './util/HelpText';
import AlertWrapper from './util/AlertWrapper';
import { Textfield } from './util/TextField';

type ScopeFormProps = {
    scope?: ExtendedScope;
    delegationSources: DelegationSource[];
    scopePrefixes?: ScopePrefix[];
    error?: string;
};

export const ScopeForm = ({ scope, delegationSources, scopePrefixes, error }: ScopeFormProps) => {
    const [requiresUserConsentChecked, setRequiresUserConsentChecked] = useState(scope?.requires_user_consent || false);
    const [idportenChecked, setIdportenChecked] = useState(scope?.allowed_integration_types?.includes(IntegrationType.API_KLIENT) || false);
    const [ansattportenChecked, setAnsattportenChecked] = useState(scope?.allowed_integration_types?.includes(IntegrationType.ANSATTPORTEN) || false);
    const [maskinportenChecked, setMaskinportenChecked] = useState(scope?.allowed_integration_types?.includes(IntegrationType.MASKINPORTEN) || false);

    const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRequiresUserConsentChecked(e.target.checked);
    };

    const handleIdportenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIdportenChecked(e.target.checked);
    };

    const handleAnsattportenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAnsattportenChecked(e.target.checked);
    };

    const handleMaskinportenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMaskinportenChecked(e.target.checked);
    };

    const { t } = useTranslation();

    const languageOptions = ['nn', 'en', 'se'];

    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
        if (!scope) return [];
        return languageOptions.filter(
            (lang) =>
                scope[`description#${lang}`]?.trim() ||
                scope[`long_description#${lang}`]?.trim()
        );
    });

    const userConsentInput = z.string(({ message: 'validation.description_required' }))
        .regex(
            /^[A-Za-zÆØÅæøåÉéÜüÑñÇç0-9\s.,\-_:;!?'"()/*[\]#\r\n]*$/,
            'validation.consent_form_error'
        );

    const [form, fields] = useForm<ScopeSchema>({
        onValidate({ formData }) {
            const dynamicSchema = scopeSchema.extend(
                Object.fromEntries(
                    selectedLanguages.flatMap((lang) => [
                        [`description#${lang}`, userConsentInput],
                        [`long_description#${lang}`, userConsentInput],
                    ])
                )
            );

            const result = parseWithZod(formData, { schema: dynamicSchema });

            return result.status === 'success' ? { ...result, value: result.value as unknown as ScopeSchema } : result;
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });

    const visibilityOptions = scopeSchema.shape.visibility.unwrap().options;
    const tokenTypeOptions = scopeSchema.shape.token_type.unwrap().options;

    const fetcher = useFetcher();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const deleteScope = async () => {
        try {
            await fetcher.submit({ intent: ActionIntent.DeleteScope }, { method: 'DELETE' });
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Failed to delete scope:', error);
        }
    }

    const getFieldError = (key: string) => {
        return t((fields as Record<string, any>)?.[key]?.errors || '');
    };

    return (
        <Form method="post" id={form.id} onSubmit={form.onSubmit}>
            <div className="grid-cols-12 gap-4">
                <Card className={'shadow border-none rounded-lg bg-white grid grid-cols-12 gap-2 col-span-12 p-6 mt-4 space-y-2'}>
                    <HeadingWrapper level={4} heading={t('general')}/>
                    <div className="col-span-12 grid grid-cols-12 gap-4">
                        {scope ? (
                            <div className="flex flex-wrap gap-7 col-span-12">
                                <Textfield
                                    className="col-span-12 md:col-span-4 hidden"
                                    label="Prefix"
                                    helpText={t('scope_page.prefix_description')}
                                    id={fields.prefix.key}
                                    name={fields.prefix.name}
                                    error={t(fields.prefix.errors || '')}
                                    defaultValue={scope?.prefix}
                                    readOnly
                                />
                                <Field className='flex flex-col'>
                                    <div className='flex items-center gap-2'>
                                        <LabelWithHelpText label="Prefix" helpText={t('scope_page.prefix_description')}/>
                                    </div>
                                    <Paragraph>{scope?.prefix}</Paragraph>
                                </Field>
                                <Field className='flex flex-col'>
                                    <div className='flex items-center gap-2'>
                                        <LabelWithHelpText label="Subscope" helpText={t('scope_page.subscope_description')}/>
                                    </div>
                                    <Paragraph>{scope?.subscope}</Paragraph>
                                </Field>
                            </div>
                        ) : (
                            <div className='col-span-12 md:col-span-3 grid grid-cols-12 self-start space-y-1'>
                                <div className="flex items-start gap-2 col-span-12 mb-[3px]">
                                    <Label>{t('prefix')}</Label>
                                    <HelpText aria-label={t('scope_page.prefix_description')}>
                                        {t('scope_page.prefix_description')}
                                    </HelpText>
                                </div>
                                <Select
                                    className="col-span-12"
                                    id={fields.prefix.key}
                                    name={fields.prefix.name}
                                >
                                    {scopePrefixes?.map(({ prefix }) => (
                                        <Select.Option key={prefix} value={prefix}>
                                            {prefix}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className='col-span-12 grid grid-cols-12'>
                        <Textfield
                            className={`col-span-12 md:col-span-6 ${scope ? 'hidden' : ''}`}
                            label={'Subscope'}
                            helpText={t('scope_page.subscope_description')}
                            id={fields.subscope.key}
                            name={fields.subscope.name}
                            error={t(fields.subscope.errors || '')}
                            defaultValue={scope?.subscope}
                            readOnly={!!scope}
                        />
                    </div>
                    <Textfield
                        className="col-span-12 hidden"
                        label="Name"
                        id={fields.name.key}
                        name={fields.name.name}
                        error={t(fields.name.errors || '')}
                        defaultValue={scope?.name}
                        readOnly={!!scope}
                    />
                    <Textfield
                        multiline
                        className="col-span-12 md:col-span-9"
                        label={t('scope_page.scope_description')}
                        helpText={t('scope_page.description_description')}
                        id={fields.description.key}
                        maxLength={255}
                        counter={255}
                        name={fields.description.name}
                        error={t(fields.description.errors || '')}
                        defaultValue={scope?.description}
                    />
                </Card>
                <Card data-color='accent' className={'shadow border-none rounded-lg grid grid-cols-12 gap-4 col-span-12 p-6 mt-4 space-y-2 bg-white'}>
                    <HeadingWrapper level={4} heading={t('scope_page.properties')} className='col-span-12'/>
                    <Fieldset
                        className="col-span-12">
                        <div className="flex items-center gap-2 col-span-12">
                            <Label>
                                {t('scope_page.client_types')}
                            </Label>
                            <HelpText aria-label={t('scope_page.allowed_integration_types_description')}>
                                {t('scope_page.allowed_integration_types_description')}
                            </HelpText>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                label="Ansattporten"
                                value="ansattporten"
                                id={fields.allowed_integration_types.key}
                                name={fields.allowed_integration_types.name}
                                defaultChecked={scope?.allowed_integration_types?.includes(IntegrationType.ANSATTPORTEN)}
                                onChange={handleAnsattportenChange}
                            />
                            <HelpText aria-label={t('helptext_for') + 'ansattporten'}>{t('scope_page.ansattporten_helptext')}</HelpText>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                label="API-klient"
                                value="api_klient"
                                id={fields.allowed_integration_types.key}
                                name={fields.allowed_integration_types.name}
                                defaultChecked={scope?.allowed_integration_types?.includes(IntegrationType.API_KLIENT)}
                                onChange={handleIdportenChange}
                            />
                            <HelpText aria-label={t('helptext_for') + 'idporten'}>{t('scope_page.idporten_helptext')}</HelpText>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                label="Maskinporten"
                                value="maskinporten"
                                id={fields.allowed_integration_types.key}
                                name={fields.allowed_integration_types.name}
                                defaultChecked={scope?.allowed_integration_types?.includes(IntegrationType.MASKINPORTEN)}
                                onChange={handleMaskinportenChange}
                            />
                            <HelpText aria-label={t('helptext_for') + 'maskinporten'}>{t('scope_page.maskinporten_helptext')}</HelpText>
                        </div>
                    </Fieldset>
                    <Fieldset className="col-span-12">
                        <div className="flex items-center gap-2 col-span-12">
                            <Label>
                                {t('scope_page.visibility')}
                            </Label>
                            <HelpText aria-label={t('client_page.visibility_description')}>
                                {t('scope_page.visibility_description')}
                            </HelpText>
                        </div>
                        {visibilityOptions.map((option, index) => (
                            <div className='flex items-center gap-2 col-span-12' key={option}>
                                <Radio
                                    label={option}
                                    name={fields.visibility.name}
                                    value={option}
                                    defaultChecked={scope ? scope.visibility === option : index === 0}/>
                            </div>
                        ))}
                    </Fieldset>
                    <Fieldset className='col-span-12'>
                        <div className="flex items-center gap-2 col-span-12">
                            <Label>
                                {t('scope_page.access_control')}
                            </Label>
                            <HelpText aria-label={t('helptext_for') + t('scope_page.access_control')}>
                                {t('scope_page.access_control_helptext')}
                            </HelpText>
                        </div>
                        <Checkbox
                            className="col-span-12"
                            label={t('scope_page.accessible_for_all')}
                            id={fields.accessible_for_all.key}
                            name={fields.accessible_for_all.name}
                            defaultChecked={scope?.accessible_for_all || false}
                        />
                    </Fieldset>
                    <Fieldset className='col-span-12'>
                        <div className="flex items-center gap-2 col-span-12">
                            <Label>
                                {t('scope_page.delegation_source')}
                            </Label>
                            <HelpText aria-label={t('client_page.delegation_source_description')}>
                                {t('scope_page.delegation_source_description')}
                            </HelpText>
                        </div>
                        {delegationSources.map(option => (
                            <Checkbox
                                label={option.name}
                                name={fields.delegation_source.name}
                                key={option.issuer}
                                value={option.issuer}
                                defaultChecked={scope && (scope.delegation_source === option.issuer)}/>
                        ))}
                    </Fieldset>
                </Card>
                <Card className={'shadow space-y-2 border-none rounded-lg grid grid-cols-12 gap-4 col-span-12 p-6 mt-4 bg-white'} data-color='accent'>
                    <HeadingWrapper level={4} heading={t('scope_page.token_type_and_access_control')} className="col-span-12"/>
                    <div className='col-span-12'>
                        <div className="flex items-center gap-2 w-full">
                            <Label>
                                {t('scope_page.token_type')}
                            </Label>
                            <HelpText aria-label={t('scope_page.token_type_description')}>
                                {t('scope_page.token_type_description')}
                            </HelpText>
                        </div>
                        <Fieldset
                            className="w-full pt-3"
                        >
                            {tokenTypeOptions.map((option, index) => (
                                <div className='flex items-center gap-2 col-span-12' key={option}>
                                    <Radio
                                        label={option}
                                        name={fields.token_type.name}
                                        value={option}
                                        defaultChecked={scope ? scope.token_type === option : index === 0}/>
                                    <HelpText aria-label={t('helptext_for') + option}>
                                        {t(`scope_page.${option}_helptext`)}
                                    </HelpText>
                                </div>
                            ))}

                        </Fieldset>
                    </div>

                    <div className='col-span-12 xl:col-span-6 grid grid-cols-12 gap-4'>
                        <Textfield
                            className="col-span-6"
                            label={t('scope_page.at_max_age')}
                            helpText={t('scope_page.at_max_age_description')}
                            suffix={t('seconds')}
                            id={fields.at_max_age.key}
                            name={fields.at_max_age.name}
                            error={t(fields.at_max_age.errors || '')}
                            defaultValue={scope?.at_max_age || 0}
                        />
                        <Textfield
                            className="col-span-6"
                            label={t('scope_page.authorization_max_lifetime')}
                            helpText={t('scope_page.authorization_max_lifetime_description')}
                            suffix={t('seconds')}
                            id={fields.authorization_max_lifetime.key}
                            name={fields.authorization_max_lifetime.name}
                            error={t(fields.authorization_max_lifetime.errors || '')}
                            defaultValue={scope?.authorization_max_lifetime || 0}
                        />
                    </div>
                    {((idportenChecked || ansattportenChecked) || (!idportenChecked && !ansattportenChecked && !maskinportenChecked)) && (
                        <Fieldset className='col-span-12'>
                            <div className="flex items-center gap-2 w-full">
                                <Label>
                                    {t('scope_page.pseudonymized_login')}
                                </Label>
                                <HelpText aria-label={t('helptext_for') + ' ' + t('scope_page.pseudonymized_login')}>
                                    {t('scope_page.pseudonymized_login_helptext')}
                                </HelpText>
                            </div>
                            <div className='grid grid-cols-12 w-full gap-4'>
                                <Checkbox
                                    className='col-span-12'
                                    label={t('scope_page.requires_pseudonymous_tokens')}
                                    id={fields.requires_pseudonymous_tokens.key}
                                    name={fields.requires_pseudonymous_tokens.name}
                                    defaultChecked={scope?.requires_pseudonymous_tokens || false}
                                />

                            </div>
                        </Fieldset>
                    )}
                </Card>
                {((idportenChecked || ansattportenChecked) || (!idportenChecked && !ansattportenChecked && !maskinportenChecked)) && (
                    <Card className={'shadow border-none space-y-2 rounded-lg grid grid-cols-12 gap-4 col-span-12 p-6 mt-4 bg-white'} data-color='accent'>
                        <HeadingWrapper level={4} heading={t('scope_page.user_involvement')} className="col-span-12"/>
                        <div className="items-center gap-4 col-span-12 grid grid-cols-12">
                            <Label className='col-span-12'>
                                {t('scope_page.user_data_sharing_method')}
                            </Label>
                            <div className="flex items-center gap-2 col-span-12">
                                <Checkbox
                                    className='col-span-12'
                                    label={t('scope_page.requires_user_authentication')}
                                    id={fields.requires_user_authentication.key}
                                    name={fields.requires_user_authentication.name}
                                    defaultChecked={scope?.requires_user_authentication || false}
                                />
                                <HelpText aria-label={t('helptext_for') + t('scope_page.requires_user_authentication')}>{t('scope_page.requires_user_authentication_helptext')}</HelpText>
                            </div>
                            <div className="flex items-center gap-2 col-span-12">
                                <Checkbox
                                    className='col-span-12'
                                    label={t('scope_page.requires_user_approval')}
                                    id={fields.requires_user_consent.key}
                                    name={fields.requires_user_consent.name}
                                    defaultChecked={scope?.requires_user_consent || false}
                                    onChange={handleConsentChange}
                                />
                                <HelpText aria-label={t('helptext_for') + t('scope_page.requires_user_approval')}>{t('scope_page.requires_user_approval_helptext')}</HelpText>
                            </div>

                            {requiresUserConsentChecked && (
                                <div className="col-span-12 space-y-4 grid grid-cols-12">
                                    <Textfield
                                        multiline
                                        className="col-span-12 md:col-span-8"
                                        label={t('scope_page.long_description')}
                                        maxLength={1023}
                                        counter={1023}
                                        id={fields.long_description.key}
                                        name={fields.long_description.name}
                                        error={t(fields.long_description.errors || '')}
                                        defaultValue={scope?.long_description}
                                    />
                                    <HeadingWrapper className={'col-span-12'} heading={t('scope_page.add_multiple_languages')} level={5}/>
                                    <div className="flex flex-wrap gap-4 col-span-12">
                                        {languageOptions.map((lang) => (
                                            <Checkbox
                                                key={lang}
                                                defaultChecked={selectedLanguages.includes(lang)}
                                                label={t(`language_values.${lang}`)}
                                                onChange={(e) => {
                                                    setSelectedLanguages((prev) =>
                                                        e.target.checked
                                                            ? [...prev, lang]
                                                            : prev.filter((l) => l !== lang)
                                                    );
                                                }}
                                            />
                                        ))}
                                    </div>
                                    {selectedLanguages.map((lang) => {
                                        const descKey = `description#${lang}`;
                                        const longDescKey = `long_description#${lang}`;
                                        return (
                                            <div key={lang} className='md:col-span-8 col-span-12'>
                                                <Textfield
                                                    className='pt-4'
                                                    multiline
                                                    label={`${t('scope_page.scope_description')} (${lang.toUpperCase()})`}
                                                    id={`${fields.description.key}#${lang}`}
                                                    name={`${fields.description.name}#${lang}`}
                                                    maxLength={255}
                                                    error={getFieldError(descKey)}
                                                    defaultValue={scope?.[`description#${lang}`]}
                                                />
                                                <Textfield
                                                    className='pt-2'
                                                    multiline
                                                    label={`${t('scope_page.long_description')} (${lang.toUpperCase()})`}
                                                    id={`${fields.long_description.key}#${lang}`}
                                                    name={`${fields.long_description.name}#${lang}`}
                                                    maxLength={1023}
                                                    error={getFieldError(longDescKey)}
                                                    defaultValue={scope?.[`long_description#${lang}`]}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {error && <AlertWrapper message={error} type="error"/>}

            {scope && (
                <div className={'grid grid-cols-12 gap-4 col-span-12 mt-4'}>
                    <Button name="intent" value={ActionIntent.UpdateScope} type="submit" className="col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-2">
                        <CheckmarkIcon aria-hidden/>
                        {t('save')}
                    </Button>
                    <Button name="intent" value={ActionIntent.DeleteScope} className='col-span-6 sm:col-span-4 xl:col-span-2 shadow my-2 py-2' variant="secondary" onClick={() => setShowDeleteModal(true)}>
                        <TrashIcon aria-hidden/>
                        {t('delete')}
                    </Button>
                    {
                        createPortal(
                            <ConfirmDeleteModal
                                heading={t('scope_page.confirm_delete_scope_heading')}
                                body={t('scope_page.confirm_delete_scope_body')}
                                isVisible={showDeleteModal}
                                onCancel={() => setShowDeleteModal(false)}
                                onDelete={deleteScope}
                            />, document.body
                        )}

                </div>
            )}
            {!scope && (
                <div className={'grid grid-cols-12 gap-4 col-span-12 mt-4'}>
                    <Button type="submit" className="col-span-4 lg:col-span-2 shadow my-2 py-2">
                        {t('create')}
                    </Button>
                </div>
            )}
        </Form>
    )
}
