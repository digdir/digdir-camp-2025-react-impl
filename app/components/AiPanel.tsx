import { Button, Textfield } from '@digdir/designsystemet-react';
import { useState } from 'react';
import clsx from 'clsx';

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiPanel({ isOpen, onClose }: AiPanelProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Send:', inputValue);
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <>

      {/* Sidepanel */}
      <div
        className={clsx(
          'fixed right-0 top-[64px] h-[calc(100%-64px)] w-full sm:w-[400px] md:w-[480px] lg:w-[560px]',
          'bg-white shadow-md border-l border-border-default z-50 flex flex-col' // 👈 Endret `bg-background-default` til `bg-white`
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border-default">
          <h2 className="text-heading-medium text-text-default">AI-panel</h2>
          <Button variant="tertiary" onClick={onClose}>
            Lukk
          </Button>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="bg-surface-subtle text-text-default rounded-xl p-4 max-w-[85%]">
            👤 <strong>Du:</strong> Hvordan bruker jeg API-et?
          </div>
          <div className="bg-surface-info-subtle text-text-default rounded-xl p-4 max-w-[85%] self-end ml-auto">
            🤖 <strong>AI:</strong> Du kan sende en `GET`-forespørsel til `/v1/data` med token.
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border-default p-4 flex gap-2 items-end" // 👈 `items-end` gjør at knapp og felt justeres nederst
        >
          <div className="flex-1">
            <Textfield
              label="Skriv en melding..."
              placeholder="Skriv en melding..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <Button variant="primary" type="submit">
            Send
          </Button>
        </form>
      </div>
    </>
  );
}

