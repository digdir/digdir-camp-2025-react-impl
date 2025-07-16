import { Card, Paragraph } from '@digdir/designsystemet-react';
import { Link, MetaFunction, redirect } from 'react-router';

import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { ApiClient } from '~/lib/api_client';
import { Authorization } from '~/lib/auth';
import AiAssistant from '~/components/ai/AiAssistant';

export const meta: MetaFunction = () => {
    return [
        { title: 'Digdir Selvbetjening' },
        { name: 'description', content: 'Digdir Selvbetjening' },
    ];
};

export async function clientLoader() {
    await Authorization.requireAuthenticatedUser();

    const apiClient = await ApiClient.create();
    const { data, error } = await apiClient.getPrefixesForOrgno();

    if (error) {
        return error.toErrorResponse();
    }

    if (data.length === 0) {
        throw redirect('/clients');
    }

    return {};
}

export default function Home() {
    const { t } = useTranslation();
    return (
        <div className='py-16'>
            <HeadingWrapper level={1} heading={t('home_page.heading')} className="font-medium"/>

            <div className='min-h-[700px] md:min-h-[650px] lg:min-h-[400px]'>
                <div className="grid grid-cols-1 pt-10 ">
                    <Paragraph className="py-5 text-lg">
                        {t('home_page.what_to_administer')}
                    </Paragraph>
                </div>
                <div className="grid grid-cols-12 gap-4">
                    <Card asChild data-color='neutral' className="z-20 shadow w-full p-6 text-inherit col-span-12 lg:col-span-5 bg-white hover:bg-accent-light">
                        <Link to="/clients" className="lg:text-3xl text-2xl no-underline rounded-lg grid cols-12  justify-start">
                            <div className='flex justify-between items-center col-span-12 text-accent pb-2'>
                                <span>{t('client_configuration')}</span>
                            </div>
                            <div className='col-span-12'>
                                <Paragraph className='text-base'> {t('client_configuration_description')} </Paragraph>
                            </div>
                        </Link>
                    </Card>
                    <Card asChild data-color='neutral' className="z-20 shadow w-full p-6 text-inherit col-span-12 lg:col-span-5 bg-white hover:bg-accent-light">
                        <Link to="/scopes" className="lg:text-3xl text-2xl no-underline rounded-lg grid grid cols-12 justify-start">
                            <div className='flex justify-between items-center col-span-12 text-accent pb-2'>
                                <span>{t('scope_configuration')}</span>
                            </div>
                            <div className='col-span-12'>
                                <Paragraph className='text-base'>{t('scope_configuration_description')}</Paragraph>
                            </div>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
}
