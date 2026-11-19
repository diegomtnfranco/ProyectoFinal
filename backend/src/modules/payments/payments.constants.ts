export const PaymentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  WALLET: 'WALLET',
  MERCADO_PAGO: 'MERCADO_PAGO',
  /** Cobro registrado por el dueño o un empleado en el estacionamiento (no mueve dinero en la app) */
  PRESENTIAL: 'PRESENTIAL',
} as const;
export type PaymentMethodValue = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ObligationType = {
  RESERVATION: 'RESERVATION',
  OCCUPANCY: 'OCCUPANCY',
} as const;
export type ObligationTypeValue = (typeof ObligationType)[keyof typeof ObligationType];

export const WalletTxType = { CREDIT: 'CREDIT', DEBIT: 'DEBIT' } as const;
export type WalletTxTypeValue = (typeof WalletTxType)[keyof typeof WalletTxType];

export const WalletTxKind = { DEMO_TOPUP: 'DEMO_TOPUP', PAYMENT: 'PAYMENT' } as const;
export type WalletTxKindValue = (typeof WalletTxKind)[keyof typeof WalletTxKind];

export const PAYMENTS_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const WALLET_CURRENCY = 'ARS';

/** Estados que ocupan la obligación (índice único parcial en payments) */
export const ACTIVE_STATUSES: PaymentStatusValue[] = [PaymentStatus.PENDING, PaymentStatus.APPROVED];

export const obligationKey = (type: ObligationTypeValue, id: string) =>
  `${type === ObligationType.RESERVATION ? 'reservation' : 'occupancy'}:${id}`;

export const walletLimits = () => ({
  minTopUpCents: Number(process.env.WALLET_TOPUP_MIN_CENTS || 10_000), // $100
  maxTopUpCents: Number(process.env.WALLET_TOPUP_MAX_CENTS || 50_000_000), // $500.000
});

/** Error con código estable para que el frontend sepa qué ofrecer */
export const PaymentErrorCode = {
  ALREADY_PAID: 'ALREADY_PAID',
  PAYMENT_IN_PROGRESS: 'PAYMENT_IN_PROGRESS',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NOTHING_TO_PAY: 'NOTHING_TO_PAY',
  NOT_PAYABLE: 'NOT_PAYABLE',
  MP_DISABLED: 'MP_DISABLED',
} as const;
