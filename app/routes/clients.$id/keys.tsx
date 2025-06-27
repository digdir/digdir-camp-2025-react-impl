import { Button, Card, Dialog, Paragraph, Tag, Textfield } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleFillIcon, KeyHorizontalIcon, PlusIcon, TasklistIcon, TrashIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useFetcher } from 'react-router'
import { parseWithZod } from '@conform-to/zod';
import { useForm } from '@conform-to/react';

import { useTranslation } from '~/lib/i18n';
import { dateFromEpochSeconds, formatDateTimeCompact, isExpired, isExpiredAfterOneMonth } from '~/lib/utils';
import { JWK } from '~/lib/models';
import ConfirmDeleteModal from '~/components/util/ConfirmDeleteModal';
import AlertWrapper from '~/components/util/AlertWrapper';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import { HelpText } from '~/components/util/HelpText';

import { ActionIntent } from './actions';

const pemCertRegex = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;
const pemPublicKeyRegex = /-----BEGIN (RSA |EC |)?PUBLIC KEY-----[\s\S]+-----END (RSA |EC |)?PUBLIC KEY-----/;
const pemPrivateKeyRegex = /PRIVATE KEY/;

export const schema = z.object({
    jwk: z
        .string({ required_error: 'validation.key_required' })

        .refine((value) => {
            if (pemPrivateKeyRegex.test(value)) return false;

            try {
                const parsed = JSON.parse(value);
                const privateFields = ['d', 'p', 'q', 'dp', 'dq', 'qi'];
                return !privateFields.some((field) => field in parsed);
            } catch {
                return true;
            }
        }, {
            message: 'validation.private_key_not_allowed',
        })

        .refine((value) => {
            try {
                JSON.parse(value);
                return true;
            } catch {
                return pemCertRegex.test(value) || pemPublicKeyRegex.test(value);
            }
        }, {
            message: 'validation.invalid_key_format',
        }),
});


const AddKeyModal = ({ closeModal }: { closeModal: () => void }) => {
    const [form, fields] = useForm({
        onValidate({ formData }) {
            return parseWithZod(formData, { schema: schema });
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });

    const { t } = useTranslation();
    const fetcher = useFetcher();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!fetcher.data) {
            return;
        }

        if (fetcher.data.error) {
            setErrorMessage(fetcher.data.error);
            return;
        }

        setErrorMessage(null)

        closeModal()
    }, [fetcher.data, closeModal, t])

    return (
        <Dialog open closedby='any' onClose={closeModal} className='rounded-lg bg-white'>
            <HeadingWrapper level={3} heading={t('client_page.add_key')}/>
            <fetcher.Form method="post" id={form.id} onSubmit={form.onSubmit}>
                <Textfield
                    multiline
                    className='pt-2'
                    label={t('client_page.jwk_or_pem')}
                    error={t(fields.jwk.errors || '')}
                    id={fields.jwk.key}
                    name={fields.jwk.name}
                />
                <div className="mt-4">
                    {errorMessage && <AlertWrapper type="error" message={errorMessage}/>}
                </div>
                <div className='flex pt-2 gap-2 justify-start'>
                    <Button
                        type="submit"
                        name="intent"
                        value={ActionIntent.AddKey}
                        className='justify-self-end'
                    >
                        {t('save')}
                    </Button>
                    <Button
                        variant="tertiary"
                        className="justify-self-end"
                        onClick={closeModal}
                    >
                        {t('cancel')}
                    </Button>
                </div>
            </fetcher.Form>
        </Dialog>
    )
}


const Keys = ({ jwks }: { jwks: JWK[] }) => {
    const { t } = useTranslation();
    const [kidToDelete, setKidToDelete] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetcher = useFetcher();

    const deleteKey = async () => {
        try {
            await fetcher.submit({ intent: ActionIntent.DeleteKey, kid: kidToDelete }, { method: 'DELETE' });
            setKidToDelete(null);
        } catch (error) {
            console.error('Failed to delete key:', error);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="items-center">
            <div className="pt-6 flex items-center">
                <div className="flex items-baseline gap-2">
                    <HeadingWrapper level={3} heading={t('client_page.keys_on_client', { count: 0 })} className=""/>
                    <HelpText aria-label={t('clients_helptext_aria')}>
                        {t('client_page.keys_on_client_helptext')}
                    </HelpText>
                </div>
                <div className={`flex ${!(jwks.length > 0) ? 'hidden' : ''} mr-auto`}>
                    <Button
                        variant="primary"
                        className="px-6 ms-12 shadow h-full"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <PlusIcon/>
                        {t('client_page.add_key')}
                    </Button>
                </div>
            </div>
            {(!jwks || jwks.length === 0) && (
                <Card
                    data-color="accent"
                    className={`rounded-lg mt-2 border-none flex flex-col items-center bg-white shadow ml-auto p-24 space-y-4 ${(jwks.length > 0) ? 'hidden' : ' '}`}>
                    <div className="text-center">
                        {t('client_page.no_keys')}
                    </div>
                    <Button
                        variant="primary"
                        className="px-6 shadow h-full"
                        onClick={() => {
                            setIsModalOpen(true)
                        }}
                    >
                        <PlusIcon/>
                        {t('add')}
                    </Button>
                </Card>
            )}
            {(jwks && jwks.length !== 0) && (
                <>
                    {jwks.map((jwk) => (
                        <Card
                            key={jwk.kid}
                            data-color="accent"
                            className={'rounded-lg shadow mt-4 border-none flex flex-col items-center bg-white ml-auto p-6'}>
                            <div className="grid grid-cols-12 w-full">
                                <div className="col-span-12 flex">
                                    <HeadingWrapper className=' font-medium' level={3} translate={false} heading={jwk.kid!}/>

                                    <div className="ml-auto flex gap-2 items-center">
                                        <Button className="" variant="tertiary" onClick={() => setKidToDelete(jwk.kid!)}>
                                            <TrashIcon className="text-2xl"/>
                                            {t('delete')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="col-span-12 flex items-center">
                                    {jwk.x5c == null ? (
                                        <div className="flex items-center">
                                            <KeyHorizontalIcon className="pe-3 text-3xl"/> {t('client_page.asymmetric_key')}
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <TasklistIcon className="pe-3 text-3xl"/> {t('certificate')}
                                        </div>
                                    )}
                                </div>
                                <div className='col-span-12 flex items-center'>
                                    {isExpired(dateFromEpochSeconds(jwk.exp!)) ? (
                                        <Tag
                                            className="p-3 mt-2 text-center flex items-center whitespace-nowrap text-ellipsis rounded-lg"
                                            data-color="danger"
                                        >
                                            <>
                                                <XMarkOctagonFillIcon className='me-1'/>
                                                {t('expired')}
                                            </>
                                        </Tag>
                                    ) : isExpiredAfterOneMonth(dateFromEpochSeconds(jwk.exp!)) ? (
                                        <Tag
                                            className="p-3 mt-2 text-center flex items-center whitespace-nowrap text-ellipsis rounded-lg"
                                            data-color="warning"
                                        >
                                            <>
                                                <ExclamationmarkTriangleFillIcon className='me-1'/>
                                                {t('expires_soon')}
                                            </>
                                        </Tag>
                                    ) : null}
                                </div>
                                <div className="col-span-12 lg:col-span-5 grid grid-cols-12">
                                    <div className="col-span-6 pt-4">
                                        <label className="font-medium">{t('algorithm')}</label>
                                        <Paragraph>{jwk.alg}</Paragraph>
                                    </div>
                                    <div className="col-span-6 pt-4">
                                        <label className="font-medium">{t('key_type')}</label>
                                        <Paragraph>{jwk.kty}</Paragraph>
                                    </div>
                                    <div className="col-span-6 pt-4">
                                        <label className="font-medium">{t('created')}</label>
                                        <Paragraph>{jwk.created ? formatDateTimeCompact(new Date(jwk.created)) : 'N/A'}</Paragraph>
                                    </div>
                                    <div className="col-span-6 pt-4">
                                        <label className="font-medium">{t('expires')}</label>
                                        <Paragraph>{formatDateTimeCompact(dateFromEpochSeconds(jwk.exp!))}</Paragraph>
                                    </div>
                                </div>
                                <div className="pt-4 col-span-12 lg:col-span-7">
                                    <div className="break-all">
                                        <label className="font-medium">{t('public_key')}</label>
                                        <Paragraph>{jwk.n}</Paragraph>
                                    </div>
                                </div>

                            </div>
                        </Card>
                    ))}
                </>
            )}

            {isModalOpen && <AddKeyModal closeModal={handleModalClose}/>}

            <ConfirmDeleteModal
                heading={t('client_page.confirm_delete_key_heading')}
                body={t('client_page.confirm_delete_key_body')}
                isVisible={kidToDelete !== null}
                onCancel={() => setKidToDelete(null)}
                onDelete={deleteKey}
            />
        </div>
    );
};

export default Keys;
