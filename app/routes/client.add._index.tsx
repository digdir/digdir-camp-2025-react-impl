import { Card, Field, Fieldset } from '@digdir/designsystemet-react';
import { Link } from 'react-router';

import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import MaskinportenCircle from '~/components/art/MaskinportenCircle';
import IDportenCircle from '~/components/art/IDportenCircle';
import AnsattportenCircle from '~/components/art/AnsattportenCircle';

export default function AddClient() {
    const { t } = useTranslation();

    return (
        <div>
            <div className="grid grid-cols-12">
                <HeadingWrapper level={2} heading={t('client_page.add_client')} className="pb-4 col-span-12"/>
                <Field className="col-span-12">
                    <div className='p-1'>
                        <Fieldset.Legend>{t('service')}</Fieldset.Legend>
                        <Field.Description>{t('client_page.integration_type_description')}</Field.Description>
                    </div>
                    <div data-color='neutral' className="grid grid-cols-12 gap-4 p-1">
                        <Card asChild className="rounded-lg shadow w-full p-8 text-inherit col-span-12 lg:col-span-4 bg-white hover:bg-accent-light">
                            <Link to={'/client/add/idporten'} className="flex flex-col h-full p-6">
                                <div className="flex flex-col items-center p-5">
                                    <div className='w-[120px] h-[120px]'>
                                        <IDportenCircle/>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xl text-left font-medium">{t('services.idporten')}</div>
                                    <div className="text-base text-left font-light">& API-{t('client')}</div>
                                </div>
                                <div className="pt-2">{t('services.idporten_description')}</div>
                            </Link>
                        </Card>

                        <Card asChild className="rounded-lg shadow w-full p-8 text-inherit col-span-12 lg:col-span-4 bg-white hover:bg-accent-light">
                            <Link to={'/client/add/maskinporten'} className="flex flex-col h-full p-6">
                                <div className="flex flex-col items-center p-5">
                                    <div className='w-[120px] h-[120px]'>
                                        <MaskinportenCircle/>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xl text-left font-medium">{t('services.maskinporten')}</div>
                                    <div className="text-base text-left font-light">& KRR</div>
                                </div>
                                <div className="pt-2">{t('services.maskinporten_description')}</div>
                            </Link>
                        </Card>

                        <Card asChild className="rounded-lg shadow w-full p-8 text-inherit col-span-12 lg:col-span-4 bg-white hover:bg-accent-light">
                            <Link to={'/client/add/ansattporten'} className="flex flex-col h-full p-6">
                                <div className="flex flex-col items-center p-5">
                                    <div className='w-[120px] h-[120px]'>
                                        <AnsattportenCircle/>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xl text-left font-medium">{t('services.ansattporten')}</div>
                                    <div></div>
                                </div>
                                <div className="mb-auto pt-2">{t('services.ansattporten_description')}</div>
                            </Link>
                        </Card>
                    </div>
                </Field>
            </div>
        </div>
    );
}
