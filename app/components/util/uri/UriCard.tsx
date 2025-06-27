import { FormMetadata } from '@conform-to/react';
import { Card, Checkbox } from '@digdir/designsystemet-react';
import { RefObject, useEffect, useState } from 'react';

import { Client } from '~/lib/models';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { HelpText } from '~/components/util/HelpText';
import { useTranslation } from '~/lib/i18n';
import { usePostLogoutUris, useRedirectUris } from '~/components/context/UriContext';
import { ApplicationType, IdportenSchema } from '~/lib/clients';
import { UriList } from '~/components/util/uri/UriList';
import { Textfield } from '~/components/util/TextField';


type Props = {
    form: FormMetadata<IdportenSchema>;
    client?: Client;
    ssoDisabled: boolean | undefined;
    uriCardRef: RefObject<HTMLDivElement | null>;
    applicationType: ApplicationType;
}

export const UriCard = ({ form, client, ssoDisabled, uriCardRef, applicationType }: Props) => {
    const { t } = useTranslation();
    const fields = form.getFieldset();

    const [newRedirectUri, setNewRedirectUri] = useState('');
    const [newPostLogoutUri, setNewPostLogoutUri] = useState('');

    const { redirectUris, setRedirectUris } = useRedirectUris();
    const { postLogoutUris, setPostLogoutUris } = usePostLogoutUris();

    const [uriRequiredError, setUriRequiredError] = useState<string>('');

    useEffect(() => {
        const error = fields.client_redirect?.errors?.[0] || '';
        setUriRequiredError(error);
    }, [fields.client_redirect?.errors]);

    return (
        <Card
            ref={uriCardRef}
            className={'bg-white shadow border-none rounded-lg flex flex-col col-span-12 p-6'}
            data-color='accent'
        >
            <HeadingWrapper level={4} heading='URI' className="mb-2"/>

            <UriList
                translationBase={'client_page.client_redirect'}
                value={newRedirectUri}
                setValue={setNewRedirectUri}
                uris={redirectUris}
                setUris={setRedirectUris}
                applicationType={applicationType}
                onChange={(e) => setNewRedirectUri(e.target.value)}
                uriRequiredError={uriRequiredError}
                setUriRequiredError={setUriRequiredError}
            />

            <UriList
                translationBase={'client_page.client_logout_redirect'}
                value={newPostLogoutUri}
                setValue={setNewPostLogoutUri}
                uris={postLogoutUris}
                setUris={setPostLogoutUris}
                applicationType={applicationType}
                onChange={(e) => setNewPostLogoutUri(e.target.value)}
            />

            {(!ssoDisabled) && (
                <div className="space-y-6">
                    <Textfield
                        className='w-full lg:w-1/2'
                        label={t('client_page.frontchannel_logout_uri')}
                        helpText={t('client_page.frontchannel_logout_uri_helptext')}
                        id={fields.frontchannel_logout_uri.key}
                        description={client ? '' : t('client_page.frontchannel_logout_uri_description')}
                        name={fields.frontchannel_logout_uri.name}
                        defaultValue={client?.frontchannel_logout_uri}
                        error={t(fields.frontchannel_logout_uri.errors || '')}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                label={t('client_page.frontchannel_logout_session_required')}
                                id={fields.frontchannel_logout_session_required.key}
                                name={fields.frontchannel_logout_session_required.name}
                                defaultChecked={client?.frontchannel_logout_session_required}
                            />
                            <HelpText aria-label={t('client_page.frontchannel_logout_session_required_description')}>
                                {t('client_page.frontchannel_logout_session_required_description')}
                            </HelpText>
                        </div>
                    </div>
                </div>)}
        </Card>
    )
}