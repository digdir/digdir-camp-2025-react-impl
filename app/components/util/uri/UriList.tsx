import { Alert, Button, Divider, Label, List, Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import React from 'react';

import { SingleUriType } from '~/components/context/UriContext';
import { useTranslation } from '~/lib/i18n';
import { validateUri } from '~/lib/uriValidator';
import { ApplicationType } from '~/lib/clients';
import { Textfield } from '~/components/util/TextField';

interface Props {
    translationBase: string,
    value: string,
    setValue: (value: string) => void,
    uris: SingleUriType[],
    setUris: React.Dispatch<React.SetStateAction<SingleUriType[]>>,
    applicationType: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    uriRequiredError?: string,
    setUriRequiredError?: (value: (((prevState: (string)) => (string)) | string)) => void
}

export const UriList = ({ translationBase, value, onChange, uris, setValue, setUris, applicationType, uriRequiredError, setUriRequiredError }: Props) => {
    const { t } = useTranslation();

    const addUri = () => {
        const uriList = value
            .split(',')
            .map(uri => uri.trim())
            .filter(uri => uri);

        setUris(prev => {
            const uniqueUris = uriList.filter(uri => !prev.some(entry => entry.uri === uri));
            const newEntries = uniqueUris.map(uri => {
                const validationError = validateUri(uri, applicationType as ApplicationType);

                return {
                    id: crypto.randomUUID(),
                    uri,
                    ...(validationError.success ? {} : { error: validationError.message }),
                };
            });

            if (setUriRequiredError && newEntries.length > 0) {
                setUriRequiredError('')
            }
            return [...prev, ...newEntries];
        });

        setValue('');
    };

    const removeUri = (uriToRemove: string) => {
        setUris(prev => prev.filter(entry => entry.uri !== uriToRemove));
    };

    return (
        <div className="space-y-4 flex flex-col col-span-12 mb-12 lg:w-2/3">
            <div>
                <div className="flex items-end gap-2 w-full">
                    <Textfield
                        className="w-full"
                        label={t(translationBase)}
                        helpText={t(translationBase + '_description')}
                        value={value}
                        onChange={onChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addUri();
                            }
                        }}
                    />
                    <Button className="mr-auto shrink-0 whitespace-nowrap" variant="tertiary" onClick={addUri}>
                        <PlusIcon/> {t('client_page.add_uri')}
                    </Button>
                </div>
                {uriRequiredError && (
                    <Alert data-color={'danger'} className="text-danger border-none bg-transparent px-8 py-2"><Paragraph>{t(uriRequiredError)}</Paragraph></Alert>
                )}
            </div>

            {uris.length > 0 && (
                <div className="pt-6">
                    <Label>{t(translationBase + '_uris_to_be_added')}</Label>

                    <div className="mt-2">
                        <List.Unordered style={{ listStyle: 'none', padding: 0 }}>
                            {uris.map(uri => (
                                <div key={uri.uri}>
                                    <List.Item className="flex items-center px-2" id={uri.uri}>
                                        <div className="flex flex-col self-start pt-2">
                                            <Paragraph>{uri.uri}</Paragraph>
                                            {uri.error &&
                                                <Alert data-color={'danger'} className="text-danger border-none bg-transparent px-8 py-2"><Paragraph>{t(uri.error)}</Paragraph></Alert>
                                            }
                                        </div>
                                        <Textfield
                                            className="hidden"
                                            label="Name"
                                            id={uri.id}
                                            name={uri.id}
                                            defaultValue={uri.uri}
                                        />
                                        <Button
                                            className="ml-auto self-start"
                                            variant="tertiary"
                                            onClick={() => removeUri(uri.uri)}
                                        >
                                            <TrashIcon className="text-2xl"/>
                                        </Button>
                                    </List.Item>
                                    <Divider/>
                                </div>
                            ))}
                        </List.Unordered>
                    </div>
                </div>
            )}
        </div>
    )
}