import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { api } from '../../../services/api';

function TotemCheckIn() {
  const { parkingId } = useParams();
  const [qrImageBase64, setQrImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const response = await api.get(`/parking-lots/${parkingId}/qr-codes`);
        setQrImageBase64(response.data?.checkIn?.qrUrl || null);
      } catch (err) {
        console.error('Error al traer el QR:', err);
        setError('No se pudo cargar el código QR.');
      }
    };

    if (parkingId) fetchQR();
  }, [parkingId]);

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl w-full flex flex-col items-center">
        <div className="bg-blue-100 p-6 rounded-full mb-8 text-blue-600 animate-pulse">
          <ScanLine className="w-20 h-20" strokeWidth={1.5} />
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">¡Bienvenido!</h1>
        <p className="text-2xl md:text-3xl text-gray-600 mb-12 leading-relaxed">
          Para ingresar, abrí la cámara de tu celular y <br/> <strong>escaneá este código QR</strong>.
        </p>

        <div className="bg-white p-8 rounded-3xl shadow-lg border-4 border-gray-50 flex items-center justify-center min-h-[350px] min-w-[350px]">
          {error ? (
            <p className="text-red-500 font-bold text-xl">{error}</p>
          ) : qrImageBase64 ? (
            <img src={qrImageBase64} alt="QR de Entrada" className="w-80 h-80 object-contain" />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-gray-500 font-medium text-2xl">Conectando con el servidor...</p>
            </div>
          )}
        </div>

        <div className="mt-16 w-full pt-8 border-t border-gray-100">
          <p className="text-gray-400 text-xl font-bold tracking-widest uppercase">Estacionapp Totem</p>
        </div>
      </div>
    </div>
  );
}

export default TotemCheckIn;