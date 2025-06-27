import { Button, Dialog, Paragraph } from '@digdir/designsystemet-react';
import { TrashIcon } from '@navikt/aksel-icons';
import { useEffect, useRef } from 'react';

import { useTranslation } from '~/lib/i18n';
import HeadingWrapper from '~/components/util/HeadingWrapper';

type Props = {
    heading: string,
    body: string,
    isVisible: boolean,
    onCancel: () => void,
    onDelete: () => void,
}

const ConfirmDeleteModal = ({ heading, body, isVisible, onCancel, onDelete }: Props) => {
    const { t } = useTranslation();
    const modalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (isVisible) {
            modalRef.current?.showModal();
        } else {
            modalRef.current?.close();
        }
    }, [isVisible]);

    return (
        <Dialog
            className='rounded-lg bg-white'
            ref={modalRef}
            closedby='any'
            onClose={onCancel}
        >
            <HeadingWrapper level={4} heading={heading} className='mb-2'/>
            <Paragraph className='mb-2'>{body}</Paragraph>
            <div className='flex pt-2 gap-2 justify-start'>
                <Button
                    variant="primary"
                    data-color='danger'
                    onClick={onDelete}>
                    <TrashIcon aria-hidden/>
                    {t('delete')}
                </Button>
                <Button
                    variant="tertiary"
                    data-color='neutral'
                    onClick={onCancel}>
                    {t('cancel')}
                </Button>
            </div>
        </Dialog>
    )
};

export default ConfirmDeleteModal;
