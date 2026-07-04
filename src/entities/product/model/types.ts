export type ProductBarcode = {
  barcode: string;
  unit: string;
  ratio: number;
  isBase: boolean;
};

export type Product = {
  uid: string;
  code: string;
  name: string;
  barcodes: ProductBarcode[];
};

export type ProductsResponse = Product[];
