import { TimelineExport } from '@/types/timeline';
import { X } from 'lucide-react';

interface JsonExportModalProps {
  data: TimelineExport;
  isOpen: boolean;
  onClose: () => void;
}

export function JsonExportModal({ data, isOpen, onClose }: JsonExportModalProps) {
  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative card-elevated w-full max-w-2xl max-h-[80vh] m-4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Timeline JSON Export</h3>
          <button
            onClick={onClose}
            className="btn-ghost p-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-secondary rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
            {jsonString}
          </pre>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button onClick={handleCopy} className="btn-primary">
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
