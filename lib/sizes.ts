export interface LabelSize {
  id: string;
  label: string;
  note: string;
  wmm: number;
  hmm: number;
}

/**
 * Standard courier label / packing-slip sizes used across Indian e-commerce.
 * Research basis:
 *  - 4"x6" (100x150mm) is THE universal thermal shipping-label size accepted by
 *    Shiprocket, Delhivery, Blue Dart, DTDC and the marketplaces' own labels —
 *    Amazon (Easy Ship / FBA), Flipkart, Meesho and Myntra all print 4"x6".
 *  - A6/A5/A4 cover sheet-label / invoice prints (Shopify's own slip is A4).
 *  - 4"x4" and 3"x4" are common smaller thermal die-cut sizes.
 */
export const SIZES: LabelSize[] = [
  { id: "4x6", label: '4" × 6"', note: "Standard courier thermal label — Amazon, Meesho, Myntra, Flipkart, Shiprocket, Delhivery", wmm: 101.6, hmm: 152.4 },
  { id: "a6", label: "A6", note: "105 × 148 mm — compact sheet label", wmm: 105, hmm: 148 },
  { id: "a5", label: "A5", note: "148 × 210 mm — half-sheet label", wmm: 148, hmm: 210 },
  { id: "a4", label: "A4", note: "210 × 297 mm — full sheet (Shopify's default slip)", wmm: 210, hmm: 297 },
  { id: "4x4", label: '4" × 4"', note: "101.6 × 101.6 mm — square thermal label", wmm: 101.6, hmm: 101.6 },
  { id: "3x4", label: '3" × 4"', note: "76 × 102 mm — small thermal label", wmm: 76.2, hmm: 101.6 },
];

export const IN_TO_MM = 25.4;
export const MM_TO_IN = 1 / 25.4;
