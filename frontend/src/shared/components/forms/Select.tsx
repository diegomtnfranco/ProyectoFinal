import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

const Select: React.FC<SelectProps> = ({ label, className, children, ...props }) => (
  <label className="space-y-2 text-sm font-medium text-slate-700">
    <span>{label}</span>
    <select
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 ${className ?? ''}`}
    >
      {children}
    </select>
  </label>
);

export default Select;
