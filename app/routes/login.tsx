import {Link, MetaFunction, useNavigate} from 'react-router';
import {Button, Card, Paragraph} from '@digdir/designsystemet-react';
import {useContext, useEffect} from 'react';
import {ChevronRightIcon} from '@navikt/aksel-icons';

import {useTranslation} from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import {ConfigContext, Environment} from '~/lib/config';
import PersonOnComputer from '~/components/art/PersonOnComputer';
import PeopleCarryingBlock from '~/components/art/PeopleCarryingBlock';
import {Authorization} from '~/lib/auth';

export const meta: MetaFunction = () => {
    return [
        { title: 'Digdir Selvbetjening - Logg inn' },
        { name: 'description', content: 'Digdir Selvbetjening' },
    ];
};

export default function Login() {
    const environment = useContext(ConfigContext)?.environment;
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const hasValidToken = await Authorization.requireValidToken();
            if (hasValidToken) {
                navigate('/');
            }
        })();
    }, [navigate]);

    if (environment === Environment.Dev) {
        return (
            <div>
                <SystestLogin/>
            </div>
        )
    }

    if (environment === Environment.Test) {
        return (
            <div>
                <TestLogin/>
            </div>
        )
    }

    return (
        <div>
            <DefaultLogin/>
        </div>
    )
}

const DefaultLogin = () => {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-12 lg:flex-row items-center justify-center">
            <div className="col-span-12 sm:col-span-5 lg:col-span-5">
                <PersonOnComputer/>
            </div>
            <div className="col-span-12 sm:col-span-6 sm:col-start-7 flex flex-col space-y-6">
                <HeadingWrapper level={1} heading={t('login_page.heading')} className="font-medium pt-8"/>
                <div className="my-4 max-w-xl">
                    <Paragraph>
                        {t('login_page.body')}
                    </Paragraph>
                </div>
                <div>
                    <Button
                        asChild
                        className="inline-flex items-center justify-center px-8"
                    >
                        <Link to="/auth/login" className="no-underline inline-block">
                            {t('login')}
                        </Link>
                    </Button>
                </div>
                <div>
                    <Paragraph>
                        {t('login_page.wish_to_go_to_test_environment')}
                    </Paragraph>
                    <Paragraph className='flex items-center mt-2 font-medium text-accent'>
                        <ChevronRightIcon className='text-xl pe-2'/>
                        <a aria-label={t('login_page.go_to_test_environment')} href="https://sjolvbetjening.test.samarbeid.digdir.no" className='text-inherit no-underline'>
                            {t('login_page.go_to_test_environment')}
                        </a>
                    </Paragraph>
                </div>
            </div>
        </div>
    )
}

const TestLogin = () => {
    const { t } = useTranslation();

    return (
        <div>
            <div className="flex flex-col sm:grid sm:grid-cols-12">
                <div className="flex flex-col sm:grid sm:grid-cols-12 col-span-12 2xl:col-span-8">
                    <div className="flex flex-col sm:grid sm:grid-cols-12 col-span-12">
                        <div className="col-span-12 sm:col-span-5 xl:col-span-7 2xl:col-span-12 flex flex-col space-y-6">
                            <HeadingWrapper level={1} heading={t('login_page.heading')} className="font-medium pt-8"/>
                            <Paragraph>
                                {t('login_page.body')}
                            </Paragraph>
                        </div>
                        <div className="col-span-12 sm:col-span-5 xl:col-span-4 sm:col-start-7 xl:col-start-8 hidden sm:block 2xl:hidden">
                            <PeopleCarryingBlock/>
                        </div>
                    </div>

                    <div className='mt-12 text-xl my-4 col-span-12 xl:mt-10'>{t('login_page.kundetest')}</div>
                    <div className='col-span-12 sm:col-span-11 grid grid-cols-12 gap-4'>
                        <Card asChild data-color='neutral' className="bg-white hover:bg-accent-light shadow rounded-lg p-6 col-span-12 sm:col-span-6">
                            <Link to="/auth/login">
                                <HeadingWrapper level={4} heading={t('login_page.kundetest_organization_number_heading')} className='no-underline'/>
                                <Paragraph>{t('login_page.kundetest_organization_number_body')}</Paragraph>
                            </Link>
                        </Card>

                        <Card asChild data-color='neutral' className="bg-white hover:bg-accent-light shadow rounded-lg p-6 col-span-12 sm:col-span-6">
                            <Link to="/auth/login?use_synthetic_user=true">
                                <HeadingWrapper level={4} heading={t('login_page.kundetest_synthetic_organization_heading')} className='no-underline'/>
                                <Paragraph>{t('login_page.kundetest_synthetic_organization_body')}</Paragraph>
                            </Link>
                        </Card>
                    </div>

                    <div className="mt-10 col-span-12">
                        <Paragraph>
                            {t('login_page.wish_to_go_to_prod_environment')}
                        </Paragraph>
                        <Paragraph className='flex items-center mt-2 font-medium text-accent'>
                            <ChevronRightIcon className='text-xl pe-2'/>
                            <a aria-label={t('login_page.go_to_prod_environment')} href="https://sjolvbetjening.samarbeid.digdir.no" className='text-inherit no-underline'>
                                {t('login_page.go_to_prod_environment')}
                            </a>
                        </Paragraph>
                    </div>
                </div>

                <div className="col-span-12 sm:col-span-4 block sm:hidden 2xl:block">
                    <PeopleCarryingBlock/>
                </div>
            </div>
        </div>
    )
}


const SystestLogin = () => {
    const { t } = useTranslation();

    return (
        <div>
            <div className="flex flex-col sm:grid sm:grid-cols-12">
                <div className="flex flex-col sm:grid sm:grid-cols-12 col-span-12 2xl:col-span-8">
                    <div className="flex flex-col sm:grid sm:grid-cols-12 col-span-12">
                        <div className="col-span-12 sm:col-span-5 xl:col-span-7 2xl:col-span-12 flex flex-col space-y-6">
                            <HeadingWrapper level={1} heading={t('login_page.heading')} className="font-medium pt-8"/>
                            <Paragraph>
                                {t('login_page.body')}
                            </Paragraph>
                        </div>
                        <div className="col-span-12 sm:col-span-5 xl:col-span-4 sm:col-start-7 xl:col-start-8 hidden sm:block 2xl:hidden">
                            <PeopleCarryingBlock/>
                        </div>
                    </div>

                    <div className='mt-12 text-xl my-4 col-span-12 xl:mt-10'>{t('login_page.systest')}</div>
                    <div className='col-span-12 sm:col-span-11 grid grid-cols-12 gap-4'>
                        <Card asChild data-color='neutral' className="bg-white hover:bg-accent-light shadow rounded-lg p-6 col-span-12 sm:col-span-6">
                            <Link to="/auth/login?entra=true">
                                <HeadingWrapper level={4} heading={t('login_page.systest_entra_heading')} className='no-underline'/>
                                <Paragraph>{t('login_page.systest_entra_body')}</Paragraph>
                            </Link>
                        </Card>

                        <Card asChild data-color='neutral' className="bg-white hover:bg-accent-light shadow rounded-lg p-6 col-span-12 sm:col-span-6">
                            <Link to="/auth/login?use_synthetic_user=true">
                                <HeadingWrapper level={4} heading={t('login_page.systest_synthetic_organization_heading')} className='no-underline'/>
                                <Paragraph>{t('login_page.systest_synthetic_organization_body')}</Paragraph>
                            </Link>
                        </Card>
                    </div>

                    <div className="mt-10 col-span-12">
                        <Paragraph>
                            {t('login_page.wish_to_go_to_prod_environment')}
                        </Paragraph>
                        <Paragraph className='flex items-center mt-2 font-medium text-accent'>
                            <ChevronRightIcon className='text-xl pe-2'/>
                            <a aria-label={t('login_page.go_to_test_environment')} href="https://sjolvbetjening.test.samarbeid.digdir.no" className='text-inherit no-underline'>
                                {t('login_page.go_to_test_environment')}
                            </a>
                        </Paragraph>
                    </div>
                </div>

                <div className="col-span-12 sm:col-span-4 block sm:hidden 2xl:block">
                    <PeopleCarryingBlock/>
                </div>
            </div>
        </div>
    )
}