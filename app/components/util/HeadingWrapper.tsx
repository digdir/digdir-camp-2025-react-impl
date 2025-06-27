import { Heading } from '@digdir/designsystemet-react';

import { useTranslation } from '~/lib/i18n';

type Props = {
    heading: string;
    id?: string;
    className?: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    translate?: boolean;
}

export default function HeadingWrapper({ heading, level, className = '', id = '', translate = true }: Props) {
    const { t } = useTranslation();

    const baseClasses: Record<number, string> = {
        1: 'text-3xl sm:text-5xl ',
        2: 'text-4xl ',
        3: 'text-2xl ',
        4: 'text-lg ',
        5: 'text-base ',
        6: 'text-md ',
    };

    return (
        <Heading level={level} className={baseClasses[level] + className} id={id}>
            {translate ? t(heading) : heading}
        </Heading>
    );
}
