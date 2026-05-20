import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition';
  const styles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100'
  };

  return (
    <button {...props} className={`${base} ${styles[variant]} ${className ?? ''}`}>
      {children}
    </button>
  );
};

export default Button;
