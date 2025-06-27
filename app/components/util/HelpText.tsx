import { Paragraph, Popover } from '@digdir/designsystemet-react';
import { ButtonHTMLAttributes, forwardRef } from 'react';

import { useTranslation } from '~/lib/i18n';

export type HelpTextProps = {
    /**
     * Required descriptive label for screen readers.
     **/
    'aria-label': string;
    /**
     * Placement of the Popover.
     * @default 'right'
     */
    placement?: 'right' | 'bottom' | 'left' | 'top';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;

interface LabelWithHelpTextProps {
    label: string;
    helpText: string;
}

export const LabelWithHelpText = ({ label, helpText }: LabelWithHelpTextProps) => {
    const { t } = useTranslation();

    return (
        <div className='inline-flex items-center gap-2'>
            {label}
            <HelpText aria-label={t('helptext_for') + ' ' + label}> 
                <Paragraph>{helpText}</Paragraph> 
            </HelpText>
        </div>
    )
}

export const HelpText = forwardRef<HTMLButtonElement, HelpTextProps>(
    function HelpText(
        { placement = 'right', children, ...rest },
        ref
    ) {
        return (
            <Popover.TriggerContext>
                <Popover.Trigger
                    className="ds-helptext"
                    ref={ref}
                    variant="tertiary"
                    data-color="neutral"
                    {...rest}
                />
                <Popover placement={placement} data-color="info">
                    <div className='flex flex-col gap-4'>
                        {children}
                    </div>
                </Popover>
            </Popover.TriggerContext>
        );
    }
);
  