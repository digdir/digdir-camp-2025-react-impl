import { Button } from '@digdir/designsystemet-react';

import { Language, useLanguage } from '~/lib/settings';

export default function LanguageSelector() {
    const [language, setLanguage] = useLanguage();

    return (
        <div className="flex flex-col gap-1">
            <Button
                className={`whitespace-nowrap ${language === Language.English ? 'font-normal rounded-none border-0 border-l-[3px] bg-white border-active' : 'text-neutral whitespace-nowrap rounded-none bg-white border-0 border-l-[3px] bg-white border-transparent hover:border-subtle'}`}
                variant='tertiary'
                onClick={() => setLanguage(Language.English)}
                aria-label="Switch to English"
            >
                <>
                    <img src="/en.svg" alt="English" className="h-6 w-6 rounded-full object-cover"/>
                    English
                </>
            </Button>
            <Button
                className={`whitespace-nowrap ${language === Language.Norwegian ? 'font-normal rounded-none border-0 border-l-[3px] bg-white border-active' : 'text-neutral whitespace-nowrap rounded-none bg-white border-0 border-l-[3px] bg-white border-transparent hover:border-subtle'}`}
                variant='tertiary'
                onClick={() => setLanguage(Language.Norwegian)}
                aria-label="Switch to Norwegian"
            >
                <>
                    <img src="/no.svg" alt="Norwegian" className="h-6 w-6 rounded-full object-cover"/>
                    Norsk
                </>
            </Button>
        </div>
    );
}
