import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <label className="space-y-2 text-sm font-medium text-slate-700">
    <span>{label}</span>
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 ${className ?? ''}`}
    />
  </label>
);

export default Input;
