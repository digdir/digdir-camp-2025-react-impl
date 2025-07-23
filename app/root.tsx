import { isRouteErrorResponse, Links, LinksFunction, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import '@digdir/designsystemet-theme';
import '@digdir/designsystemet-css';
import './styles/designsystemet.css';
import './styles/layers.css';
import { Paragraph } from '@digdir/designsystemet-react';
import {useMemo} from 'react';

import Notification from '~/components/util/Notification';
import { StatusMessage } from '~/lib/status';
import Navbar from '~/components/navbar/Navbar';
import { Authorization } from '~/lib/auth';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import PeopleWithBuildingBlocks from '~/components/art/PeopleWithBuildingBlocks';
import { AuthenticatedOrganization } from '~/lib/models';
import { AiAssistantProvider } from '~/components/ai/AiAssistant';

import Footer from './components/Footer';
import { getSetting, Setting, UserSettingsContext } from './lib/settings';
import { fetchTranslations } from './lib/i18n';
import { ConfigContext, fetchAppConfig } from './lib/config';
import { Route } from './+types/root';


export const links: LinksFunction = () => [
    { rel: 'stylesheet', href: 'https://altinncdn.no/fonts/inter/inter.css' },
    { rel: 'icon', href: '/favicon.png', type: 'image/png' },
];

export async function clientLoader() {
    const colorMode = getSetting(Setting.ColorMode);
    const language = getSetting(Setting.Language);
    const appConfig = await fetchAppConfig();
    const status = StatusMessage.get();
    await fetchTranslations(language);
    const userInfo = await Authorization.fetchUserInfo();

    // We want to integrate Tailwind's dark mode feature with Designsystemet's
    // color mode feature (dark, light, contrast). Users should be able to
    // choose between auto/system, light, and dark modes. We set dark mode if
    // the user explicitly chooses dark, or if they choose auto/system and their
    // system prefers dark mode. This logic must run on the client side to check
    // the system's color preference.
    const darkMode = colorMode === 'dark'
        || (colorMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
        colorMode,
        darkMode,
        language,
        appConfig,
        status,
        userInfo
    };
}

export function Layout({ children }: { children: React.ReactNode }) {
    const data = useLoaderData<typeof clientLoader>();

    return (
        <html lang={data?.language} data-color-scheme={data?.colorMode} className={data?.darkMode ? 'dark' : 'light'}>
            <head>
                <meta charSet="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <Meta/>
                <Links/>
            </head>
            <body>
                {children}
                <ScrollRestoration/>
                <Scripts/>
            </body>
        </html>
    )
}

export default function App() {
    const { language, colorMode, appConfig, status, userInfo } = useLoaderData<typeof clientLoader>();

    const memoizedAppConfig = useMemo(() => appConfig, [appConfig]);

    return (
        <ConfigContext.Provider value={memoizedAppConfig}>
            <UserSettingsContext.Provider value={{ language, colorMode }}>
                <AiAssistantProvider>
                    <div className="flex flex-col min-h-screen m-0 bg-gray">
                        <Navbar organization={userInfo as AuthenticatedOrganization}/>
                        <Notification status={status}/>
                        <div data-size="sm" className="container mx-auto flex-1">
                            <div className='px-3 lg:px-20'>
                                <div className='py-10'>
                                    <Outlet/>
                                </div>
                            </div>
                        </div>
                        <Footer/>
                    </div>
                </AiAssistantProvider>
            </UserSettingsContext.Provider>
        </ConfigContext.Provider>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const data = useLoaderData<typeof clientLoader>();
    const userInfo = data?.userInfo ?? null;

    let message = 'An unknown error occurred';

    if (isRouteErrorResponse(error)) {
        message = error.statusText;
    } else if (error instanceof Error) {
        message = error.message;
    }

    return (
        <div>
            <div className="flex flex-col min-h-screen m-0 bg-gray">
                <Navbar organization={userInfo as AuthenticatedOrganization} isError={true}/>
                <div data-size="sm" className="container mx-auto flex-1 flex justify-center items-center">
                    <div className="py-10 flex flex-col items-center text-center w-1/3">
                        <HeadingWrapper heading="Error occurred!" level={2}/>
                        <PeopleWithBuildingBlocks/>
                        <Paragraph>
                            <strong>Error message:</strong> {message}
                        </Paragraph>
                    </div>
                </div>
                <Footer/>
            </div>
        </div>
    );
}
