import React from 'react';

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, value, onChange }) => (
  <label className="space-y-2 text-sm text-slate-700">
    {label}
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
    />
  </label>
);

export default DateTimePicker;
