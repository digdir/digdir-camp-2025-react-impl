import { Field, FieldAffix, FieldAffixes, FieldCounterProps, FieldDescription, Input, InputProps, Label, type LabelRequired, Paragraph, Textarea, TextareaProps, ValidationMessage } from '@digdir/designsystemet-react';
import { DefaultProps } from 'node_modules/@digdir/designsystemet-react/dist/types/types';
import { ForwardedRef, forwardRef, ReactNode } from 'react';

import { useTranslation } from '~/lib/i18n';

import { HelpText } from './HelpText';

type InputProps_ = Omit<
    InputProps,
    'prefix' | 'className' | 'style' | 'data-color' | 'type'
>;
type TextareaProps_ = Omit<TextareaProps, 'prefix' | 'className' | 'style'>;

type SharedTextfieldProps = {
    /**
     * Classname on the wrapper element `Field`
     */
    className?: InputProps['className'];
    /**
     * Style on the wrapper element `Field`
     * @default undefined
     */
    style?: InputProps['style'];
    /**
     * Label
     */
    label?: ReactNode;
    /**
     * Description
     */
    description?: ReactNode;
    /**
     * Prefix
     */
    prefix?: string;
    /**
     * HelpText
     */
    helpText?: string;
    /**
     * Suffix
     */
    suffix?: string;
    /**
     * Error message for field
     */
    error?: ReactNode;
    /**
     * Uses `Field.Counter` to display a character counter
     * Pass a number to set a limit, or an object to configure the counter
     */
    counter?: FieldCounterProps | number;
} & LabelRequired &
    Omit<DefaultProps, 'data-color'>;

type TextfieldTextareaProps = {
    /**
     * Use to render a `Textarea` instead of `Input` for multiline support
     **/
    multiline: true;
} & TextareaProps_;

type TextfieldInputProps = {
    /**
     * Use to render a `Textarea` instead of `Input` for multiline support
     **/
    multiline?: never | false;
    /**
     * Supported `input` types
     *
     * @default 'text'
     * */
    type?: Omit<InputProps['type'], 'radio' | 'checkbox' | 'image'>;
} & InputProps_;

export type TextfieldProps = SharedTextfieldProps &
    (TextfieldTextareaProps | TextfieldInputProps);

/**
 *  Composed text input component using `Field`
 *
 * `classname` & `style` are passed to the wrapper elements.
 *
 * Rest props are passed to the `Input` or `Textarea` component.
 * @example
 * <Textfield label="Textfield label">
 */
export const Textfield = forwardRef<
    HTMLInputElement | HTMLTextAreaElement,
    TextfieldProps
>(function Textfield(
    {
        label,
        description,
        error,
        multiline,
        prefix,
        suffix,
        helpText,
        'data-size': size,
        counter,
        style,
        className,
        ...rest
    },
    ref,
) {
    const { t } = useTranslation();
    
    return (
        <Field className={className} data-size={size} style={style}>
            <div className='inline-flex items-center gap-2'>
                {!!label && <Label>{label}</Label>}
                {!!helpText && (<HelpText aria-label={t('helptext_for') + ' ' + label}>
                    <Paragraph>{helpText}</Paragraph>
                </HelpText>)}
            </div>
            {!!description && <FieldDescription>{description}</FieldDescription>}
            <FieldAffixes>
                {prefix === undefined || <FieldAffix>{prefix}</FieldAffix>}
                {multiline === true ? (
                    <Textarea
                        ref={ref as ForwardedRef<HTMLTextAreaElement>}
                        aria-invalid={Boolean(error) || undefined}
                        {...(rest as TextareaProps_)}
                    />
                ) : (
                    <Input
                        ref={ref as ForwardedRef<HTMLInputElement>}
                        aria-invalid={Boolean(error) || undefined}
                        {...(rest as InputProps_)}
                    />
                )}
                {suffix === undefined || <FieldAffix>{suffix}</FieldAffix>}
            </FieldAffixes>
            {!!error && <ValidationMessage>{error}</ValidationMessage>}
            {!!counter && (
                <Field.Counter
                    {...(typeof counter === 'number' ? { limit: counter } : counter)}
                />
            )}
        </Field>
    );
});