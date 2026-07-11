export type Store = {
  id: string;
  code: string;
  name: string;
  uid_1c: string;
  address: string;
  contact: string;
  manual: boolean;
  pin: string;
};

export type StoresResponse = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: Store[];
};
