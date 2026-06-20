import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useToast } from '../../shared/hooks/useToast';
import { api } from '../../services/api';
import { NoParkingMessage } from '../../shared/components/common/NoParkingMessage';
import { 
  Loader2, 
  Download, 
  RefreshCw,   
  QrCode, 
  Printer, 
  Monitor, 
  Copy,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface QRData {
  checkIn: { qrUrl: string; token: string } | null;
  checkOut: { qrUrl: string; token: string } | null;
}

function QRManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentParkingLot, 
    fetchMyParkingLot, 
    isLoading: parkingLoading,
    error: parkingError,
    hasFetchedOnce,
    clearError,
  } = useParkingLotsStore();
  const { showSuccess, showError } = useToast();
  
  const [qrData, setQrData] = useState<QRData>({ checkIn: null, checkOut: null });
  const [isLoadingQr, setIsLoadingQr] = useState(true);
  const [regeneratingType, setRegeneratingType] = useState<'check-in' | 'check-out' | null>(null);
  const fetchAttempted = useRef(false);

  // ✅ Verificar rol y cargar estacionamiento solo una vez
  useEffect(() => {
    if (user?.role !== 'parking_owner') {
      navigate('/login');
      return;
    }
    
    if (fetchAttempted.current) return;
    if (currentParkingLot) return;
    if (hasFetchedOnce) return;
    
    if (!parkingLoading) {
      fetchAttempted.current = true;
      console.log('📡 QRManagementPage: Cargando estacionamiento...');
      fetchMyParkingLot();
    }
  }, [user, navigate, currentParkingLot, parkingLoading, hasFetchedOnce, fetchMyParkingLot]);

  // ✅ Cargar QR solo si hay parking
  useEffect(() => {
    if (currentParkingLot?.id) {
      console.log('📡 QRManagementPage: Cargando QR...');
      fetchQRCodes(currentParkingLot.id);
    }
  }, [currentParkingLot]);

  const fetchQRCodes = async (id: string) => {
    setIsLoadingQr(true);
    try {
      const response = await api.get(`/parking-lots/${id}/qr-codes`);
      setQrData({
        checkIn: response.data.checkIn || null,
        checkOut: response.data.checkOut || null,
      });
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      showError('Error al cargar los códigos QR');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const regenerateQR = async (type: 'check-in' | 'check-out') => {
    setRegeneratingType(type);
    try {
      const id = currentParkingLot?.id;
      if (!id) {
        showError('No hay estacionamiento registrado');
        return;
      }
      
      const response = await api.post(`/parking-lots/${id}/generate-qr/${type === 'check-in' ? 'check-in' : 'check-out'}`);
      
      if (type === 'check-in' && response.data.checkInQrUrl) {
        setQrData(prev => ({
          ...prev,
          checkIn: { qrUrl: response.data.checkInQrUrl, token: response.data.checkInToken }
        }));
      } else if (type === 'check-out' && response.data.checkOutQrUrl) {
        setQrData(prev => ({
          ...prev,
          checkOut: { qrUrl: response.data.checkOutQrUrl, token: response.data.checkOutToken }
        }));
      }
      showSuccess(`QR de ${type === 'check-in' ? 'entrada' : 'salida'} regenerado exitosamente`);
    } catch (error) {
      showError(`Error al regenerar el QR de ${type === 'check-in' ? 'entrada' : 'salida'}`);
    } finally {
      setRegeneratingType(null);
    }
  };

  const downloadQR = (qrUrl: string, type: string) => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${type}-${currentParkingLot?.name || 'parking'}.png`;
    link.click();
    showSuccess('QR descargado');
  };

  const printQR = (qrUrl: string, name: string, type: string) => {
    if (!qrUrl) return;
    const title = type === 'check-in' ? 'ESCANEE PARA ENTRAR' : 'ESCANEE PARA SALIR';
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>QR ${type === 'check-in' ? 'Entrada' : 'Salida'} - ${currentParkingLot?.name || 'Estacionamiento'}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
            }
            img {
              width: 300px;
              height: 300px;
            }
            h1 {
              margin-top: 20px;
              font-size: 24px;
            }
            p {
              color: #666;
              margin-top: 10px;
            }
            .title {
              color: ${type === 'check-in' ? '#22c55e' : '#ef4444'};
              font-size: 18px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${qrUrl}" alt="QR ${type === 'check-in' ? 'Entrada' : 'Salida'}" />
            <h1>${currentParkingLot?.name || 'Estacionamiento'}</h1>
            <p class="title">${title}</p>
            <p>Escanee este código QR con su celular</p>
          </div>
        </body>
      </html>
    `);
    printWindow?.print();
    printWindow?.close();
  };

  const copyQRUrl = (token: string, type: string) => {
    const id = currentParkingLot?.id;
    if (!token) return;
    const url = `${window.location.origin}/public/qr/${id}/${type === 'check-in' ? 'checkin' : 'checkout'}`;
    navigator.clipboard.writeText(url);
    showSuccess('URL copiada al portapapeles');
  };

  const openPublicDisplay = (type: string) => {
    const id = currentParkingLot?.id;
    if (!id) {
      showError('No hay estacionamiento registrado');
      return;
    }
    window.open(`/public/qr/${id}/${type === 'check-in' ? 'checkin' : 'checkout'}`, '_blank');
  };

  const parkingName = currentParkingLot?.name || 'Estacionamiento';

  // ✅ Estados de error y carga usando NoParkingMessage

  // 1️⃣ Error al cargar el estacionamiento
  if (parkingError && hasFetchedOnce && !currentParkingLot) {
    return (
      <NoParkingMessage
        variant="info"
        title="Error al cargar el estacionamiento"
        message={parkingError}
        buttonText="Reintentar"
        buttonAction={() => {
          clearError();
          fetchAttempted.current = false;
          useParkingLotsStore.setState({ hasFetchedOnce: false });
          fetchMyParkingLot();
        }}
      />
    );
  }

  // 2️⃣ Cargando inicial
  if ((parkingLoading || isLoadingQr) && !currentParkingLot && !hasFetchedOnce) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  // 3️⃣ No hay estacionamiento registrado
  if (!currentParkingLot && hasFetchedOnce) {
    return (
      <NoParkingMessage
        variant="warning"
        title="No hay estacionamiento registrado"
        message="Para gestionar códigos QR, primero debes tener un estacionamiento registrado y activo."
        buttonText="Registrar estacionamiento"
      />
    );
  }

  // 4️⃣ Cargando QR (cuando ya hay parking pero los QR se están cargando)
  if (isLoadingQr && !qrData.checkIn && !qrData.checkOut && currentParkingLot) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  // ✅ Renderizado principal con los QR
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">         
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Códigos QR</h1>
            <p className="text-gray-500 mt-1">{parkingName}</p>
            <p className="text-sm text-blue-600 mt-2 font-medium">Administre los códigos QR de entrada y salida</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Check-in QR */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className={`p-4 ${qrData.checkIn ? 'bg-green-50' : 'bg-gray-50'} border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <h2 className="text-xl font-semibold">Check-in (Entrada)</h2>
                </div>
                {qrData.checkIn ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} /> Activo
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
                    <XCircle size={12} /> Sin QR
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6 text-center">
              {qrData.checkIn ? (
                <>
                  <img
                    src={qrData.checkIn.qrUrl}
                    alt="QR Check-in"
                    className="w-48 h-48 mx-auto mb-4 border rounded-2xl p-3 shadow-md"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadQR(qrData.checkIn!.qrUrl, 'checkin')}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download size={14} /> Descargar
                    </button>
                    <button
                      onClick={() => printQR(qrData.checkIn!.qrUrl, parkingName, 'check-in')}
                      className="py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button
                      onClick={() => copyQRUrl(qrData.checkIn!.token, 'check-in')}
                      className="py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Copy size={14} /> Copiar URL
                    </button>
                    <button
                      onClick={() => openPublicDisplay('check-in')}
                      className="py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Monitor size={14} /> Pantalla
                    </button>
                    <button
                      onClick={() => regenerateQR('check-in')}
                      disabled={regeneratingType === 'check-in'}
                      className="col-span-2 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {regeneratingType === 'check-in' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Regenerar QR
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <p className="text-gray-500 mb-4">No hay código QR generado</p>
                  <button
                    onClick={() => regenerateQR('check-in')}
                    disabled={regeneratingType === 'check-in'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Generar QR
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Check-out QR */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className={`p-4 ${qrData.checkOut ? 'bg-red-50' : 'bg-gray-50'} border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h2 className="text-xl font-semibold">Check-out (Salida)</h2>
                </div>
                {qrData.checkOut ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} /> Activo
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
                    <XCircle size={12} /> Sin QR
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6 text-center">
              {qrData.checkOut ? (
                <>
                  <img
                    src={qrData.checkOut.qrUrl}
                    alt="QR Check-out"
                    className="w-48 h-48 mx-auto mb-4 border rounded-2xl p-3 shadow-md"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadQR(qrData.checkOut!.qrUrl, 'checkout')}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download size={14} /> Descargar
                    </button>
                    <button
                      onClick={() => printQR(qrData.checkOut!.qrUrl, parkingName, 'check-out')}
                      className="py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button
                      onClick={() => copyQRUrl(qrData.checkOut!.token, 'check-out')}
                      className="py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Copy size={14} /> Copiar URL
                    </button>
                    <button
                      onClick={() => openPublicDisplay('check-out')}
                      className="py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Monitor size={14} /> Pantalla
                    </button>
                    <button
                      onClick={() => regenerateQR('check-out')}
                      disabled={regeneratingType === 'check-out'}
                      className="col-span-2 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {regeneratingType === 'check-out' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Regenerar QR
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <p className="text-gray-500 mb-4">No hay código QR generado</p>
                  <button
                    onClick={() => regenerateQR('check-out')}
                    disabled={regeneratingType === 'check-out'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Generar QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-2">📌 Instrucciones</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <p className="font-medium text-green-600">Check-in (Entrada)</p>
              <ul className="space-y-1 ml-4">
                <li>• Coloque este QR en la entrada del estacionamiento</li>
                <li>• Los clientes escanean al ingresar</li>
                <li>• Seleccionan tipo de vehículo y confirman</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-red-600">Check-out (Salida)</p>
              <ul className="space-y-1 ml-4">
                <li>• Coloque este QR en la salida del estacionamiento</li>
                <li>• Los clientes escanean al retirar su vehículo</li>
                <li>• El sistema calcula el monto automáticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRManagementPage;