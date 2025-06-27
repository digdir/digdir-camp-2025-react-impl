import { ClientActionFunctionArgs } from 'react-router';

import { setSettings, Setting } from '~/lib/settings';

export async function clientAction({ request }: ClientActionFunctionArgs) {
    const formData = await request.formData();

    const colorMode = formData.get(Setting.ColorMode)?.toString();
    const language = formData.get(Setting.Language)?.toString();

    const updatedSettings: { [key: string]: string } = {};

    if (colorMode) {
        updatedSettings[Setting.ColorMode] = colorMode;
    }

    if (language) {
        updatedSettings[Setting.Language] = language;
    }

    setSettings(updatedSettings);
}
