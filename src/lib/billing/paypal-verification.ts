import type { SubscriptionStatus } from '@/types';

export interface PayPalTransactionAmount {
  value?: string;
  currency_code?: string;
}

export interface PayPalTransactionInfo {
  transaction_id?: string;
  transaction_status?: string;
  transaction_initiation_date?: string;
  transaction_updated_date?: string;
  transaction_amount?: PayPalTransactionAmount;
}

export interface PayPalPayerInfo {
  email_address?: string;
}

export interface PayPalTransactionDetail {
  transaction_info: PayPalTransactionInfo;
  payer_info?: PayPalPayerInfo;
}

export interface PayPalConfigStatus {
  clientId: boolean;
  clientSecret: boolean;
  publicClientId: boolean;
  appUrl: boolean;
  baseUrl: string;
  ready: boolean;
}

interface MapPayPalVerificationInput {
  userId: string;
  payerEmail: string;
  transactionId: string;
  transactionTime: string;
}

const SUCCESS_STATUSES = new Set(['S']);

export function getPayPalBaseUrl() {
  return process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';
}

export function getPayPalConfigStatus(): PayPalConfigStatus {
  const status: PayPalConfigStatus = {
    clientId: Boolean(process.env.PAYPAL_CLIENT_ID),
    clientSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    publicClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    baseUrl: getPayPalBaseUrl(),
    ready: false,
  };

  status.ready = status.clientId && status.clientSecret && status.publicClientId && status.appUrl;
  return status;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

function parseAmount(value: string | null | undefined) {
  const amount = Number.parseFloat(value ?? '');
  return Number.isFinite(amount) ? amount : 0;
}

export function findCompletedPayPalTransaction(
  transactions: PayPalTransactionDetail[],
  expectedEmail: string
) {
  const normalizedEmail = normalizeEmail(expectedEmail);

  return transactions.find((transaction) => {
    const payerEmail = normalizeEmail(transaction.payer_info?.email_address);
    const status = transaction.transaction_info.transaction_status ?? '';
    const amount = parseAmount(transaction.transaction_info.transaction_amount?.value);

    return payerEmail === normalizedEmail && SUCCESS_STATUSES.has(status) && amount > 0;
  });
}

export function mapPayPalVerificationToSubscription(input: MapPayPalVerificationInput) {
  return {
    user_id: input.userId,
    billing_provider: 'paypal' as const,
    plan: 'pro' as const,
    status: 'active' as SubscriptionStatus,
    current_period_start: input.transactionTime,
    current_period_end: null,
    paypal_transaction_id: input.transactionId,
    paypal_payer_email: input.payerEmail,
    paypal_verified_at: new Date().toISOString(),
  };
}

export function stripPayPalColumnsForLegacySchema<
  T extends {
    paypal_order_id?: string | null;
    paypal_transaction_id?: string | null;
    paypal_payer_email?: string | null;
    paypal_verified_at?: string | null;
  },
>(payload: T) {
  const rest = { ...payload };
  delete rest.paypal_order_id;
  delete rest.paypal_transaction_id;
  delete rest.paypal_payer_email;
  delete rest.paypal_verified_at;
  return rest;
}

function getRequiredEnv(name: 'PAYPAL_CLIENT_ID' | 'PAYPAL_CLIENT_SECRET') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required PayPal environment variable: ${name}`);
  }

  return value;
}

export async function getPayPalAccessToken() {
  const clientId = getRequiredEnv('PAYPAL_CLIENT_ID');
  const clientSecret = getRequiredEnv('PAYPAL_CLIENT_SECRET');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('PayPal auth succeeded without an access token.');
  }

  return payload.access_token;
}

function getDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export async function fetchPayPalTransactionsById(transactionId: string) {
  const token = await getPayPalAccessToken();
  const { startDate, endDate } = getDateRange();
  const url = new URL(`${getPayPalBaseUrl()}/v1/reporting/transactions`);
  url.searchParams.set('transaction_id', transactionId);
  url.searchParams.set('fields', 'all');
  url.searchParams.set('page_size', '100');
  url.searchParams.set('page', '1');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal transaction lookup failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    transaction_details?: PayPalTransactionDetail[];
  };

  return payload.transaction_details ?? [];
}
