import React from 'react';

interface CardProps {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
);

export default Card;
