export type Seller = {
  id: string;
  name: string;
  userId: string;
};

export type SellersResponse = {
  code: number;
  mess: string;
  data: Seller[];
};
