import type { DrinkSize, SugarLevel, IceLevel } from '../../types';

export interface SizeOption {
  value: DrinkSize;
  label: string;
  priceAdjustment: number;
  description: string;
}

export const SIZE_OPTIONS: SizeOption[] = [
  { value: 'Small', label: 'Small', priceAdjustment: 0.0, description: '12 oz (350ml)' },
  { value: 'Medium', label: 'Medium', priceAdjustment: 0.3, description: '16 oz (500ml)' },
  { value: 'Large', label: 'Large', priceAdjustment: 0.6, description: '22 oz (650ml)' },
];

export const SUGAR_OPTIONS: SugarLevel[] = ['0%', '25%', '50%', '75%', '100%'];

export const ICE_OPTIONS: IceLevel[] = ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice'];

export function calculateCustomizedPrice(basePrice: number, size: DrinkSize, quantity: number = 1) {
  const sizeObj = SIZE_OPTIONS.find((s) => s.value === size) ?? SIZE_OPTIONS[1];
  const unitPrice = Number((basePrice + sizeObj.priceAdjustment).toFixed(2));
  const subtotal = Number((unitPrice * quantity).toFixed(2));
  return { unitPrice, subtotal, priceAdjustment: sizeObj.priceAdjustment };
}

