interface PriceCalculatorProps {
  price: number;
}

const PriceCalculator: React.FC<PriceCalculatorProps> = ({ price }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700">
    <p className="text-sm">Costo estimado</p>
    <p className="mt-2 text-3xl font-semibold text-slate-900">${price}</p>
  </div>
);

export default PriceCalculator;
