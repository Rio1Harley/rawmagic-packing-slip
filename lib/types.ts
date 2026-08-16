export interface SlipItem {
  qty: string;
  title: string;
  /** Sub-lines: variant, SKU, and gift-box properties like "Box size: Medium", "Item 1: Bath Salt". */
  details: string[];
}

export interface SlipData {
  brandName: string;
  orderNumber: string;
  orderDate: string;
  shipToName: string;
  /** Full postal address, one line per row (newline-separated in the field). */
  shipToAddress: string;
  phone: string;
  email: string;
  items: SlipItem[];
  giftMessage: string;
  /** Short footer note printed at the bottom of the label. */
  footerNote: string;
}

export function emptySlip(): SlipData {
  return {
    brandName: "Raw Magic",
    orderNumber: "",
    orderDate: "",
    shipToName: "",
    shipToAddress: "",
    phone: "",
    email: "",
    items: [],
    giftMessage: "",
    footerNote: "Handcrafted with love · therawmagic.com · @therawmagic",
  };
}
