import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Wallet as WalletIcon } from 'lucide-react';
import { walletService } from '../../../services/payments.service';
import { formatCents } from '../../../shared/components/payments/payment.utils';

/** Acceso a "Mi billetera" dentro de Perfil → Información personal (clientes) */
function WalletProfileCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    walletService
      .getMine()
      .then((w) => setBalance(w.balanceCents))
      .catch(() => setFailed(true));
  }, []);

  return (
    <Link
      to="/client/wallet"
      className="mb-6 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
        <WalletIcon size={22} />
      </div>
      <div className="flex-1">
        <p className="flex items-center gap-2 font-semibold text-blue-900">
          Mi billetera <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">DEMO</span>
        </p>
        <p className="text-sm text-blue-700">
          {failed ? 'Saldo, cargas y pagos' : balance == null ? 'Cargando saldo…' : `Saldo disponible: ${formatCents(balance)}`}
        </p>
      </div>
      <ChevronRight className="text-blue-400" />
    </Link>
  );
}

export default WalletProfileCard;
