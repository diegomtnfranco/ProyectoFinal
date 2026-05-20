import RevenueChart from '../../components/charts/RevenueChart';

const Reports: React.FC = () => {
  const data = [{ label: 'Lun', revenue: 320000 }, { label: 'Mar', revenue: 300000 }, { label: 'Mié', revenue: 280000 }, { label: 'Jue', revenue: 290000 }];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
        <p className="mt-2 text-sm text-slate-500">Visualiza el desempeño de tus estacionamientos por ingresos.</p>
      </div>
      <RevenueChart data={data} />
    </div>
  );
};

export default Reports;
