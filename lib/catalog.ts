import raw from "./catalog.json";

export interface CatalogVariant {
  v: string;
  price: string;
}
export interface CatalogProduct {
  name: string;
  type: string;
  optName: string;
  variants: CatalogVariant[];
}

/** Raw Magic catalogue (names + variants + prices), sorted by name. */
export const CATALOG: CatalogProduct[] = (raw as CatalogProduct[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export function findProduct(name: string): CatalogProduct | undefined {
  return CATALOG.find((p) => p.name === name);
}
