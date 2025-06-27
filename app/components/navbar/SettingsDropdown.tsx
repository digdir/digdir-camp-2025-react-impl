import { Button, Dropdown, DropdownHeading } from '@digdir/designsystemet-react';
import { CogIcon, MenuGridIcon } from '@navikt/aksel-icons';
import { Link } from 'react-router';

import LanguageSelector from '~/components/navbar/LanguageSelector';
import ColorModeSelector from '~/components/navbar/ColorModeSelector';
import { useTranslation } from '~/lib/i18n';

type Props = {
    isAuthenticated: boolean;
    isActiveRoute: (route: string) => boolean;
    isExactActiveRoute: (route: string) => boolean;
}

const SettingsDropdown = ({ isAuthenticated, isActiveRoute, isExactActiveRoute }: Props) => {
    const { t } = useTranslation();

    return (
        <>
            <Button variant='tertiary' popoverTarget="settings-dropdown" className='text-neutral whitespace-nowrap font-medium rounded-none border-0 border-b-[3px] bg-white border-transparent hover:border-subtle'>
                <div className='hidden lg:flex gap-2 font-medium items-center'>
                    <CogIcon aria-hidden className='text-2xl'/> {t('settings')}
                </div>
                <div className='flex lg:hidden font-medium items-center'>
                    <MenuGridIcon aria-hidden className='text-2xl'/>
                </div>
            </Button>

            <Dropdown id="settings-dropdown" className='p-3 bg-white' data-size='sm'>
                <Dropdown.List>
                    {/* phone-sized screens */}
                    <div className="block lg:hidden space-y-1 pt-1">
                        {isAuthenticated && !isExactActiveRoute('/') && (
                            <>
                                <Dropdown.Item>
                                    <Button
                                        asChild
                                        variant='tertiary'
                                        className={(isActiveRoute('/clients') || isActiveRoute('/client')) ? 'font-normal rounded-none border-0 border-l-[3px] hover:bg-white border-active' : 'text-neutral whitespace-nowrap rounded-none bg-white border-0 border-l-[3px] hover:bg-white border-transparent hover:border-subtle'}
                                    >
                                        <Link to="/clients" className={(isActiveRoute('/clients') || isActiveRoute('/client')) ? 'no-underline' : 'no-underline'}>
                                            {t('client', { count: 0 })}
                                        </Link>
                                    </Button>
                                </Dropdown.Item>
                                <Dropdown.Item>
                                    <Button
                                        asChild
                                        variant='tertiary'
                                        className={isActiveRoute('/scopes') ? 'font-normal rounded-none border-0 border-l-[3px] hover:bg-white border-active' : 'text-neutral whitespace-nowrap rounded-none bg-white border-0 border-l-[3px] hover:bg-white border-transparent hover:border-subtle'}
                                    >
                                        <Link to="/scopes" className={isActiveRoute('/scopes') ? 'no-underline' : 'no-underline'}>
                                            {t('scope', { count: 0 })}
                                        </Link>
                                    </Button>
                                </Dropdown.Item>
                            </>
                        )}
                    </div>
                    <div className='px-4 py-2 text-neutral'>
                        <DropdownHeading> {t('language')} </DropdownHeading>
                    </div>
                    <Dropdown.Item>
                        <LanguageSelector/>
                    </Dropdown.Item>
                    <div className='px-4 pt-4 pb-2 text-neutral'>
                        <DropdownHeading> {t('color_mode')} </DropdownHeading>
                    </div>
                    <Dropdown.Item>
                        <ColorModeSelector/>
                    </Dropdown.Item>
                </Dropdown.List>
            </Dropdown>
        </>
    )
}

export default SettingsDropdown;