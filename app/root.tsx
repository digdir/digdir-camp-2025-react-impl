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

/**
 * Meta component to set the page title and description for the application.
 */
export const links: LinksFunction = () => [
    { rel: 'stylesheet', href: 'https://altinncdn.no/fonts/inter/inter.css' },
    { rel: 'icon', href: '/favicon.png', type: 'image/png' },
];

/**
 * Loader function to fetch initial data for the application.
 */
export async function clientLoader() {
    const colorMode = getSetting(Setting.ColorMode);
    const language = getSetting(Setting.Language);
    const appConfig = await fetchAppConfig();
    const status = StatusMessage.get();
    await fetchTranslations(language);
    const userInfo = await Authorization.fetchUserInfo();

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

/**
 * Layout component that serves as the root layout for the application.
 *
 * @param children - The child components to be rendered within the layout.
 * @constructor - This component sets up the HTML structure, including the head and body elements, and applies the appropriate color scheme based on user settings.
 */
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

/**
 * Main application component that serves as the entry point for the application.
 *
 * @constructor - This component sets up the main layout, provides context for configuration and user settings, and renders the main content of the application.
 */
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

/**
 * ErrorBoundary component that handles errors in the application routes.
 *
 * @param error - The error object containing information about the error that occurred.
 * @constructor - This component displays an error message and provides a fallback UI when an error occurs in the application.
 */
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
