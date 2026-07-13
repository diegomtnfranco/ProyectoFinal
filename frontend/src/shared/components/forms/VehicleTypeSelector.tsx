import { Car, Truck, Bike } from 'lucide-react';

interface VehicleTypeSelectorProps {
  value: 'car' | 'truck' | 'bike';
  onChange: (value: 'car' | 'truck' | 'bike') => void;
}

const options = [
  { value: 'car' as const, label: 'Auto', icon: <Car size={18} /> },
  { value: 'truck' as const, label: 'Camión', icon: <Truck size={18} /> },
  { value: 'bike' as const, label: 'Moto', icon: <Bike size={18} /> }
];

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({ value, onChange }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded-3xl border px-4 py-4 text-sm font-semibold transition ${
          value === option.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-700 hover:border-primary-500'
        }`}
      >
        <div className="flex items-center justify-center gap-2">{option.icon} {option.label}</div>
      </button>
    ))}
  </div>
);

export default VehicleTypeSelector;
