import { Button, Card, Paragraph, Tooltip } from '@digdir/designsystemet-react';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { useTranslation } from '~/lib/i18n';
import { status } from '~/lib/status';

type Props = {
    status?: status,
}

export default function Notification({ status }: Props) {
    const { t } = useTranslation();

    const [smoothTransition, setSmoothTransition] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status) {
            setVisible(true);
            setSmoothTransition(false);

            setTimeout(() => setSmoothTransition(true), 100);

            const timeout = setTimeout(() => {
                setVisible(false);
            }, 5000);

            return () => {
                clearTimeout(timeout);
            };
        }
    }, [status]);

    if (!visible || !status?.message) return null;

    return (
        <div className={`fixed top-0 left-1/2 -translate-x-1/2 z-40 transition-transform duration-500 ease-out ${smoothTransition ? 'translate-y-12' : '-translate-y-full'}`}>
            <Card data-color={status.color} className="rounded-lg p-2 border-none">
                <div className="flex z-10 items-center">
                    <Paragraph className="overflow-hidden text-center p-2 max-w-[90vw] sm:w-96"> 
                        {t(status.message)}{status.subject ? ` ${t(status.subject)}` : ''}
                    </Paragraph>
                    <Tooltip content={t('close')}>
                        <Button
                            variant="tertiary"
                            className="justify-center p-0"
                            onClick={() => setVisible(false)}
                        >
                            <XMarkIcon title="a11y-title" fontSize="1.5rem"/>
                        </Button>
                    </Tooltip>
                </div>
            </Card>
        </div>
    );
}
