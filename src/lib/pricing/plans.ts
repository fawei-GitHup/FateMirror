export interface PricingPlan {
  slug: 'free' | 'pro';
  name: string;
  eyebrow: string;
  priceLabel: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}

export function getPricingPlans(t: (key: string) => string): PricingPlan[] {
  return [
    {
      slug: 'free',
      name: t('freeName'),
      eyebrow: t('freeEyebrow'),
      priceLabel: t('freePriceLabel'),
      description: t('freeDescription'),
      features: [
        t('freeFeature1'),
        t('freeFeature2'),
        t('freeFeature3'),
        t('freeFeature4'),
      ],
      ctaLabel: t('freeCta'),
      ctaHref: '/auth/signup',
    },
    {
      slug: 'pro',
      name: t('proName'),
      eyebrow: t('proEyebrow'),
      priceLabel: t('proPriceLabel'),
      description: t('proDescription'),
      features: [
        t('proFeature1'),
        t('proFeature2'),
        t('proFeature3'),
        t('proFeature4'),
        t('proFeature5'),
        t('proFeature6'),
      ],
      ctaLabel: t('proCta'),
      ctaHref: '/api/billing/paypal/checkout?plan=pro&cycle=monthly',
      featured: true,
    },
  ];
}
