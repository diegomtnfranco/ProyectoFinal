import React from 'react';

interface TimeSlotPickerProps {
  slots: string[];
  value: string;
  onChange: (value: string) => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ slots, value, onChange }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="mb-3 text-sm font-semibold text-slate-700">Selecciona un horario</h3>
    <div className="grid gap-2 sm:grid-cols-3">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          className={`rounded-2xl border px-3 py-3 text-sm transition ${value === slot ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary-500'}`}
        >
          {slot}
        </button>
      ))}
    </div>
  </div>
);

export default TimeSlotPicker;
