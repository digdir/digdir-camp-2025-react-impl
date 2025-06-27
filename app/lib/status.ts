import { Color } from '@digdir/designsystemet-react/colors';

import { FlashStorage } from '~/lib/storage';

export type status = {
    message: string;
    subject?: string;
    color: Color;
    timestamp: number;
}

export const StatusColor = {
    success: 'success' as Color,
    warning: 'warning' as Color,
    danger: 'danger' as Color,
} as const;

export class StatusMessage {
    static get(): status | undefined {
        const message = FlashStorage.getItem('statusMessage')

        return message ? JSON.parse(message) : undefined;
    }

    static set(value: string, color: Color, subject?: string) {
        const status: status = {
            message: value,
            color: color,
            timestamp: Date.now(),
        };
    
        if (subject !== undefined) {
            status.subject = subject;
        }
    
        FlashStorage.setItem('statusMessage', JSON.stringify(status));
    }
}
