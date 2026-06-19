import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { Loader2, ArrowRight } from 'lucide-react';

interface Parking {
  id: string;
  name: string;
}

function TotemSelector() {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // endpoint
    api.get('/parking-lots')
      .then(res => {
        setParkings(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando parkings", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Seleccionar Estacionamiento</h1>
      <div className="max-w-2xl mx-auto space-y-4">
        {parkings.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
            <span className="font-semibold text-lg">{p.name}</span>
            <div className="flex gap-3">
              <button onClick={() => navigate(`/totem/${p.id}/checkin`)} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700">Entrada</button>
              <button onClick={() => navigate(`/totem/${p.id}/checkout`)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-emerald-700">Salida</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TotemSelector;