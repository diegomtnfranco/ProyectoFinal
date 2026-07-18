import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Download, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export const DownloadTicketModal = ({
  isOpen,
  onClose,
  onDownload,
}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900">
              Ticket de salida
            </DialogTitle>

            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">
              El check-out se realizó correctamente.
            </p>

            <p className="text-gray-600">
              ¿Desea descargar el ticket de pago y salida?
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              No, gracias
            </button>

            <button
              onClick={onDownload}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Download size={16} />
              Descargar PDF
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};