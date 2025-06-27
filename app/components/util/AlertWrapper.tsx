import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';

type Props = {
    heading?: string;
    message: string;
    type: 'error' | 'success';
    className?: string;
}

export default function AlertWrapper({ heading, message, type, className }: Props) {
    const { t } = useTranslation();

    const headingTranslationKey = type === 'error' ? 'error' : heading || '';

    return (
        <Alert data-color={type === 'error' ? 'danger' : 'success'} className={'mt-2 ' + className}>
            <HeadingWrapper level={4} heading={t(headingTranslationKey)}/>
            <Paragraph>{message}</Paragraph>
        </Alert>
    );
}
