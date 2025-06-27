import { Button, Paragraph } from '@digdir/designsystemet-react';
import { Link, useLocation } from 'react-router';
import { useContext } from 'react';

import { useTranslation } from '~/lib/i18n';
import { Authorization } from '~/lib/auth';
import { AuthenticatedOrganization } from '~/lib/models';
import { ConfigContext, Environment } from '~/lib/config';

import LogoWithText from '../art/LogoWithText';
import Logo from '../art/Logo';

import SettingsDropdown from './SettingsDropdown';
import UserDropdown from './UserDropdown';

type Props = {
    organization?: AuthenticatedOrganization;
    isError?: boolean;
}

export default function Navbar({ organization, isError }: Props) {
    const { t } = useTranslation();
    const location = useLocation();
    const environment = useContext(ConfigContext)?.environment;

    const isActiveRoute = (route: string) => location.pathname.startsWith(route);
    const isExactActiveRoute = (route: string) => location.pathname === route;

    const isAuthenticated = Authorization.accessToken !== null && Authorization.accessToken !== undefined;

    return (
        <div className="py-1 px-4 flex items-center justify-between bg-white" data-size='sm'>
            <Button asChild variant='tertiary' className='hidden md:flex min-w-48 whitespace-nowrap me-6 pt-3 text-neutral font-normal rounded-none border-0 border-b-[3px] bg-white border-transparent hover:border-subtle'>
                <Link to="/" className="no-underline text-inherit">
                    <LogoWithText width='190' height='34'/>
                </Link>
            </Button>
            <Button asChild variant='tertiary' className='flex md:hidden whitespace-nowrap me-4 pt-3 text-neutral font-normal rounded-none border-0 border-b-[3px] bg-white border-transparent hover:border-subtle'>
                <Link to="/" className="no-underline text-inherit">
                    <Logo width='30' height='30'/>
                </Link>
            </Button>
            {((environment === Environment.Dev)) && (
                <Paragraph className="test-pill font-semibold px-4 py-1 w-fit rounded-sm">{t('login_page.systest_environment')}</Paragraph>
            )}
            {((environment === Environment.Test)) && (
                <Paragraph className="test-pill font-semibold px-4 py-1 w-fit rounded-sm">{t('login_page.test_environment')}</Paragraph>
            )}
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-4 ml-auto mr-2">
                    <div className="hidden lg:flex items-center space-x-2">
                        {(isAuthenticated && !isExactActiveRoute('/')) && (
                            <>
                                <Button
                                    asChild
                                    variant='tertiary'
                                    className={(isActiveRoute('/clients') || isActiveRoute('/client')) ? 'bg-white px-4 whitespace-nowrap font-medium text-neutral rounded-none border-active border-0 border-b-[3px]' : 'border-0 border-b-[3px] bg-white border-transparent hover:border-subtle text-neutral px-4 whitespace-nowrap font-normal rounded-none bg-white'}
                                >
                                    <Link to="/clients" className={(isActiveRoute('/clients') || isActiveRoute('/client')) ? 'no-underline' : 'no-underline'}>
                                        {t('client', { count: 0 })}
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant='tertiary'
                                    className={isActiveRoute('/scopes') ? 'bg-white px-4 whitespace-nowrap font-medium text-neutral rounded-none border-active border-0 border-b-[3px]' : 'border-0 border-b-[3px] bg-white border-transparent hover:border-subtle text-neutral px-4 whitespace-nowrap font-normal rounded-none bg-white'}
                                >
                                    <Link to="/scopes" className={isActiveRoute('/scopes') ? 'no-underline' : 'no-underline'}>
                                        {t('scope', { count: 0 })}
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <SettingsDropdown isAuthenticated={isAuthenticated} isActiveRoute={isActiveRoute} isExactActiveRoute={isExactActiveRoute}/>
                    <UserDropdown
                        isAuthenticated={isAuthenticated}
                        isError={isError}
                        orgno={organization?.authenticated_organization_number}
                        orgname={organization?.authenticated_organization_name}
                        isSyntheticOrg={organization?.is_synthetic_organization_number}
                    />
                </div>
            </div>
        </div>
    );
}
