export type BarcodeInfo = {
  barcode: string;
  unit: string;
  ratio: number;
  isBase: boolean;
};

export type Product = {
  uid: string;
  code: string;
  name: string;
  markingType: string;
  barcodes: BarcodeInfo[];
};

export type ProductsResponse = Product[];
