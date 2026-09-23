export type CreditPackKey = "5000" | "20000" | "45000";

export interface CreditPack {
  key: CreditPackKey;
  words: number;
  price: number;
  label: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { key: "5000",  words: 5_000,  price: 5.99,  label: "5,000 Word Pack" },
  { key: "20000", words: 20_000, price: 19.99, label: "20,000 Word Pack" },
  { key: "45000", words: 45_000, price: 39.99, label: "45,000 Word Pack" },
];

export function getCreditPack(key: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.key === key);
}
