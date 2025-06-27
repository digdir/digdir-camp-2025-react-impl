import { Link, useLocation } from 'react-router';
import { Button, Paragraph } from '@digdir/designsystemet-react';
import { ChevronRightIcon, EnvelopeClosedIcon } from '@navikt/aksel-icons';
import { useContext } from 'react';

import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { ConfigContext, Environment } from '~/lib/config';

import PersonLeaningOnCircle from './art/PersonLeaningOnCircle';

export default function Footer() {
    const { t } = useTranslation();
    const location = useLocation();
    const environment = useContext(ConfigContext)?.environment;

    const isExactActiveRoute = (route: string) => location.pathname === route;

    return (
        <div className="relative">
            {isExactActiveRoute('/') && (
                <div className="absolute -top-[417px] right-0 h-96 -z-1">
                    <PersonLeaningOnCircle/>
                </div>
            )}
            <footer className="py-16 px-14 grid grid-cols-12 gap-2 gap-y-10 lg:gap-y-0 lg:px-20 footer relative">
                <div className='col-span-12 xl:col-span-2'>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24.69 24.74"
                        className="h-12 pe-2 text-current "
                        fill="currentColor"
                    >
                        <path d="M19.73,7.06H7.56a.5.5,0,0,0-.5.5V31.3a.5.5,0,0,0,.5.5H19.73a12.37,12.37,0,0,0,0-24.73m1.19,21a8.8,8.8,0,1,1,7.18-7.18,8.8,8.8,0,0,1-7.18,7.18" transform="translate(-7.06 -7.06)"/>
                    </svg>
                </div>
                <div className='col-span-12 md:col-span-6 xl:col-span-3 space-y-4'>
                    <HeadingWrapper level={4} heading={t('footer.need_help')}/>
                    <Paragraph className='flex items-center'>
                        <EnvelopeClosedIcon className='text-2xl pe-2'/>
                        <a aria-label='servicedesk@digdir.no' href="mailto:servicedesk@digdir.no" className='text-white no-underline'>
                            servicedesk@digdir.no
                        </a>
                    </Paragraph>
                    <Paragraph className='flex items-center'>
                        <ChevronRightIcon className='text-2xl pe-2'/>
                        <a aria-label={t('footer.availability_statement')} href="https://www.digdir.no/digdir/kontakt-oss/943" className='text-white no-underline'>
                            {t('footer.contact_us')}
                        </a>
                    </Paragraph>
                    <Paragraph className='flex items-center'>
                        {t('footer.opening_hours')}
                    </Paragraph>
                </div>
                <div className='col-span-12 md:col-span-6 xl:col-span-3 space-y-4'>
                    <HeadingWrapper level={4} heading='Om nettsiden'/>
                    <Paragraph className='flex items-center hidden'>
                        <ChevronRightIcon className='text-2xl pe-2'/> {t('footer.privacy_statement')}
                    </Paragraph>
                    <Paragraph className='flex items-center'>
                        <ChevronRightIcon className='text-2xl pe-2'/>
                        <a aria-label={t('footer.availability_statement')} href="https://uustatus.no/nb/erklaringer/publisert/31ddab14-2ba4-4031-89ab-69a2e28ca1ad" className='text-white no-underline'>
                            {t('footer.availability_statement')}
                        </a>
                    </Paragraph>
                    <Paragraph className='flex items-center'>
                        <ChevronRightIcon className='text-2xl pe-2'/>
                        <Link aria-label={t('footer.privacy_statement')} to="/privacy" className='text-white no-underline'>
                            {t('footer.privacy_statement')}
                        </Link>
                    </Paragraph>
                </div>
                <div className='col-span-12 md:col-span-6 md:pt-12 xl:col-span-3 xl:pt-0 space-y-4'>
                    <HeadingWrapper level={4} heading={t('footer.feedback_header')}/>
                    <Paragraph>
                        {t('footer.feedback_body')}
                    </Paragraph>
                    <Button
                        variant="primary"
                        data-size="sm"
                        className="shadow px-4 footer-button"
                        onClick={() => {
                            window.location.href = 'mailto:kundetjenester-tilbak-aaaaprelo7d3ixxndg2tuakee4@digdir.slack.com';
                        }}
                    >
                        {t('footer.feedback_submit')}
                    </Button>

                </div>

                {(environment === Environment.Prod || environment === Environment.Test) && <script
                    async
                    src="https://siteimproveanalytics.com/js/siteanalyze_6255470.js"></script>}
            </footer>
        </div>
    );
}
