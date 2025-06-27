import { Button, Dialog, Divider, Dropdown, DropdownHeading, Label, Paragraph, Textfield } from '@digdir/designsystemet-react';
import { Buildings3Icon, LeaveIcon, PencilIcon } from '@navikt/aksel-icons';
import { Link, useFetcher, useNavigate } from 'react-router';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { useEffect, useState } from 'react';

import { syntheticOrgSchema } from '~/lib/syntheticOrg';
import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';
import AlertWrapper from '~/components/util/AlertWrapper';

type Props = {
    isAuthenticated: boolean;
    orgno?: string,
    orgname?: string,
    isSyntheticOrg?: boolean,
    isError?: boolean,
}

const UserDropdown = ({ isAuthenticated, orgno, orgname, isSyntheticOrg, isError }: Props) => {
    const [form, fields] = useForm({
        onValidate({ formData }) {
            return parseWithZod(formData, { schema: syntheticOrgSchema });
        },
        shouldValidate: 'onSubmit',
        shouldRevalidate: 'onBlur',
    });

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fetcher = useFetcher();

    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!fetcher.data) {
            return;
        }

        if (fetcher.data.error) {
            setErrorMessage(fetcher.data.error);
            return;
        }

        setErrorMessage(null);
        handleModalClose();
        navigate('/');
    }, [fetcher.state, fetcher.data, navigate]);

    const handleModalOpen = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            {(isAuthenticated && orgno) && <>
                <Button variant='tertiary' popoverTarget="user-dropdown" className='text-neutral whitespace-nowrap font-medium me-6 rounded-none border-0 border-b-[3px] bg-white border-transparent hover:border-subtle'>
                    <div className='hidden lg:flex gap-2 items-center'>
                        <Buildings3Icon aria-hidden className='text-2xl'/> {orgno}
                    </div>
                    <div className='flex lg:hidden items-center'>
                        <Buildings3Icon aria-hidden className='text-2xl'/>
                    </div>
                </Button>

                <Dropdown id="user-dropdown" className='p-2 bg-white' data-size='sm'>
                    <Dropdown.List>
                        <div className='text-neutral px-[1px]'>
                            <DropdownHeading> {t('you_represent')} </DropdownHeading>
                        </div>
                        <Dropdown.Item>
                            <Paragraph className="text-xl font-medium px-4 pb-4 text-neutral">{orgno}</Paragraph>
                        </Dropdown.Item>
                        {orgname &&
                            <Dropdown.Item>
                                <Paragraph className="text-sm text-neutral">{orgname}</Paragraph>
                            </Dropdown.Item>}

                        {isSyntheticOrg &&
                            <Dropdown.Item>
                                <Button variant='tertiary' className='text-normal text-neutral whitespace-nowrap rounded-none border-0 border-l-[3px] bg-white border-transparent hover:border-subtle' onClick={handleModalOpen}>
                                    <PencilIcon aria-hidden className='text-2xl'/>Endre syntetisk org</Button>
                            </Dropdown.Item>}

                        {isAuthenticated && (
                            <>
                                <Divider/>
                                <Dropdown.Item>
                                    <Button asChild variant='tertiary' className='flex items-center text-normal text-neutral whitespace-nowrap rounded-none border-0 border-l-[3px] bg-white border-transparent hover:border-subtle'>
                                        <Link to="/auth/logout" className="no-underline text-neutral font-medium">
                                            <LeaveIcon aria-hidden className='text-2xl'/>
                                            <span>{t('logout')}</span>
                                        </Link>
                                    </Button>
                                </Dropdown.Item>
                            </>
                        )}
                    </Dropdown.List>
                </Dropdown>

                {isModalOpen && (
                    <Dialog
                        open
                        closedby='any'
                        onClose={handleModalClose}
                        className="rounded-lg bg-white max-w-xl">
                        <div className=" mb-2">
                            <Label data-size="sm">{t('')}</Label>
                            <div className="space-y-2">
                                <HeadingWrapper level={3} heading={t('change_synthetic_org_heading')}/>
                            </div>
                            <div className="space-y-2">
                                <Paragraph>{t('change_synthetic_org_body')}</Paragraph>
                                <Paragraph className="text-danger font-medium">{t('warning_irreversible_action')}</Paragraph>
                            </div>
                        </div>

                        <div>
                            <fetcher.Form
                                method="post"
                                action={`/organization/${fields.synthetic_orgno.value}`}
                                id={form.id}
                                onSubmit={form.onSubmit}
                                className="mt-6 space-y-2"
                            >
                                <Textfield
                                    label={t('new_synthetic_org_number')}
                                    id={fields.synthetic_orgno.key}
                                    name={fields.synthetic_orgno.name}
                                    error={t(fields.synthetic_orgno.errors || '')}
                                    maxLength={9}
                                    className="w-96"
                                />

                                {errorMessage && <AlertWrapper message={errorMessage} type="error"/>}

                                <div className='flex pt-2 gap-2 justify-start'>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        name="intent"
                                        className="justify-self-end"
                                    >
                                        {t('save')}
                                    </Button>
                                    <Button
                                        variant="tertiary"
                                        className="justify-self-end"
                                        onClick={handleModalClose}
                                    >
                                        {t('cancel')}
                                    </Button>
                                </div>
                            </fetcher.Form>
                        </div>
                    </Dialog>
                )}
            </>}

            {((!orgno && isAuthenticated) || isError) && <Button asChild variant='tertiary' className='flex items-center'>
                <Link to="/auth/logout" className='text-neutral whitespace-nowrap font-medium me-6 rounded-none border-0 border-b-[3px] bg-white border-transparent hover:border-subtle'>
                    <LeaveIcon aria-hidden className='text-2xl'/>
                    <span>{t('logout')}</span>
                </Link>
            </Button>}
        </>
    )
}

export default UserDropdown;