import { Button } from '@digdir/designsystemet-react';
import { MonitorIcon, MoonIcon, SunIcon } from '@navikt/aksel-icons';

import { useTranslation} from '~/lib/i18n';
import { ColorMode, useColorMode } from '~/lib/settings';

export default function ColorModeSelector() {
    const [colorMode, setColorMode] = useColorMode();

    const { t } = useTranslation();

    const colorModes = [ColorMode.Auto, ColorMode.Light, ColorMode.Dark];
    const colorModeIndex = colorModes.indexOf(colorMode);

    const changeColorMode = () => {
        const nextColorMode = colorModes[(colorModeIndex + 1) % colorModes.length];
        setColorMode(nextColorMode);
    };

    const colorModeText = () => {
        switch (colorMode) {
        case 'auto':
            return (
                <>
                    <MonitorIcon aria-hidden className='text-2xl' /> {t('system')}
                </>
            );
        case 'light':
            return (
                <>
                    <SunIcon aria-hidden className='text-2xl' /> {t('light')}
                </>
            );
        case 'dark':
            return (
                <>
                    <MoonIcon aria-hidden className='text-2xl' /> {t('dark')}
                </>
            );
        }
    };

    return (
        <Button variant="tertiary" className='font-normal rounded-none border-0 border-l-[3px] hover:bg-white hover:border-subtle text-neutral whitespace-nowrap border-transparent hover:border-subtle' onClick={changeColorMode}>
            {colorModeText()}
        </Button>

    );
}
