import crypto from 'crypto';

export type BillingCycle = 'monthly' | 'yearly';

interface CreateCheckoutInput {
  productId: string;
  customerEmail?: string;
  requestId?: string;
  successUrl: string;
  metadata?: Record<string, string>;
}

interface CreatePortalInput {
  customerId: string;
}

interface CreemCheckoutResponse {
  id: string;
  checkout_url: string;
  status: string;
}

interface CreemPortalResponse {
  customer_portal_link: string;
}

export interface CreemWebhookEvent {
  id: string;
  eventType: string;
  created_at: number;
  object: Record<string, unknown>;
}

export interface CreemConfigStatus {
  apiKey: boolean;
  webhookSecret: boolean;
  monthlyProduct: boolean;
  yearlyProduct: boolean;
  appUrl: boolean;
  baseUrl: string;
  ready: boolean;
}

function getCreemBaseUrl() {
  return process.env.CREEM_BASE_URL || 'https://api.creem.io';
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getCreemConfigStatus(): CreemConfigStatus {
  const status: CreemConfigStatus = {
    apiKey: Boolean(process.env.CREEM_API_KEY),
    webhookSecret: Boolean(process.env.CREEM_WEBHOOK_SECRET),
    monthlyProduct: Boolean(process.env.CREEM_PRO_MONTHLY_PRODUCT_ID),
    yearlyProduct: Boolean(process.env.CREEM_PRO_YEARLY_PRODUCT_ID),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    baseUrl: getCreemBaseUrl(),
    ready: false,
  };

  status.ready =
    status.apiKey &&
    status.webhookSecret &&
    status.monthlyProduct &&
    status.yearlyProduct &&
    status.appUrl;

  return status;
}

export function getCreemProductId(cycle: BillingCycle) {
  if (cycle === 'monthly') {
    return getRequiredEnv('CREEM_PRO_MONTHLY_PRODUCT_ID');
  }

  return getRequiredEnv('CREEM_PRO_YEARLY_PRODUCT_ID');
}

export async function createCreemCheckout(input: CreateCheckoutInput) {
  const response = await fetch(`${getCreemBaseUrl()}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getRequiredEnv('CREEM_API_KEY'),
    },
    body: JSON.stringify({
      product_id: input.productId,
      request_id: input.requestId,
      success_url: input.successUrl,
      customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      metadata: input.metadata,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Creem checkout creation failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as CreemCheckoutResponse;
}

export async function createCreemCustomerPortal(input: CreatePortalInput) {
  const response = await fetch(`${getCreemBaseUrl()}/v1/customers/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getRequiredEnv('CREEM_API_KEY'),
    },
    body: JSON.stringify({
      customer_id: input.customerId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Creem portal creation failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as CreemPortalResponse;
}

export function verifyCreemWebhookSignature(rawBody: string, signature: string) {
  const secret = getRequiredEnv('CREEM_WEBHOOK_SECRET');
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const computedBuffer = Buffer.from(computed, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (computedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    computedBuffer,
    signatureBuffer
  );
}

export function mapCreemStatusToSubscriptionStatus(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 'active' as const;
    case 'trialing':
      return 'trialing' as const;
    case 'canceled':
      return 'canceled' as const;
    case 'unpaid':
    case 'paused':
      return 'past_due' as const;
    default:
      return 'active' as const;
  }
}

export function inferPlanFromProductId(productId: string | null | undefined) {
  if (!productId) return 'free' as const;

  const monthly = process.env.CREEM_PRO_MONTHLY_PRODUCT_ID;
  const yearly = process.env.CREEM_PRO_YEARLY_PRODUCT_ID;
  return productId === monthly || productId === yearly ? ('pro' as const) : ('free' as const);
}
