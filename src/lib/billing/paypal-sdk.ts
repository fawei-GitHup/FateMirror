export function getPublicPayPalClientId() {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
}

export function getPayPalSdkUrl(clientId = getPublicPayPalClientId(), currency = process.env.PAYPAL_CURRENCY || 'USD') {
  const url = new URL('https://www.paypal.com/sdk/js');
  url.searchParams.set('client-id', clientId);
  url.searchParams.set('currency', currency);
  url.searchParams.set('intent', 'capture');
  url.searchParams.set('components', 'buttons');
  url.searchParams.set('disable-funding', 'credit,card');
  return url.toString();
}
