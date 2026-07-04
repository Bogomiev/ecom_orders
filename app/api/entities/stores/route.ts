import { NextResponse } from "next/server";
import type { Store, StoresResponse } from "@/entities/store";

const STORE_RECORDS = [
  {
    code: "warehouse",
    id: "4h4bve3pp13brab",
    manual: false,
    name: "Интернет-магазин МСК",
    uid_1c: "e58968dd-708d-11e8-b7e5-001dd8b89db0",
    raw: {
      address: {
        text: "ул. Малая Калужская, д. 15, стр. 18"
      },
      contact: "Склад РЦ"
    }
  },
  {
    code: "magazin_otradnoe",
    id: "p8k2n4s7v9q1x3d",
    manual: false,
    name: "Магазин Отрадное",
    uid_1c: "1f7a59a0-3c12-4c58-9a4f-c5a5a8a7c101",
    raw: {
      address: {
        text: "ул. Декабристов, д. 12"
      },
      contact: "Отрадное"
    }
  },
  {
    code: "magazin_butovo",
    id: "m3d9r2h6t1w8c4z",
    manual: false,
    name: "Магазин Бутово",
    uid_1c: "2a61a7b4-5477-493a-a418-2d8f3ccf2102",
    raw: {
      address: {
        text: "ул. Южнобутовская, д. 44"
      },
      contact: "Бутово"
    }
  },
  {
    code: "magazin_himki",
    id: "r6v1j8p4b9n2k5y",
    manual: false,
    name: "Магазин Химки",
    uid_1c: "3eb90afd-d112-42e8-9589-9b3dc5439e03",
    raw: {
      address: {
        text: "Ленинградское ш., д. 23"
      },
      contact: "Химки"
    }
  },
  {
    code: "magazin_podolsk",
    id: "c7q5x2l9s4f1a8n",
    manual: false,
    name: "Магазин Подольск",
    uid_1c: "4bf27c84-4877-486d-86d0-dbc26d4db604",
    raw: {
      address: {
        text: "пр-т Ленина, д. 107"
      },
      contact: "Подольск"
    }
  },
  {
    code: "magazin_balashiha",
    id: "n2a8g4u1e6p9t3m",
    manual: false,
    name: "Магазин Балашиха",
    uid_1c: "5aa4f566-85d7-42c3-aaef-b89c5b0c3f05",
    raw: {
      address: {
        text: "ш. Энтузиастов, д. 11"
      },
      contact: "Балашиха"
    }
  },
  {
    code: "magazin_mitino",
    id: "v4b1s7d9h2k6q8r",
    manual: false,
    name: "Магазин Митино",
    uid_1c: "6c6245a9-3650-4e0f-8f45-af9a5f2ed306",
    raw: {
      address: {
        text: "Пятницкое ш., д. 39"
      },
      contact: "Митино"
    }
  },
  {
    code: "magazin_lyublino",
    id: "k9z3w6c1p8r4j2x",
    manual: false,
    name: "Магазин Люблино",
    uid_1c: "7b7ddf86-c67b-4fe7-9d5f-1e90b6659a07",
    raw: {
      address: {
        text: "ул. Совхозная, д. 41"
      },
      contact: "Люблино"
    }
  },
  {
    code: "magazin_krylatskoe",
    id: "h1t5m8q2v7d4n9b",
    manual: false,
    name: "Магазин Крылатское",
    uid_1c: "8b56dc7d-5c32-4d76-9530-f03b4f312608",
    raw: {
      address: {
        text: "Осенний бул., д. 10"
      },
      contact: "Крылатское"
    }
  },
  {
    code: "magazin_ryazanskiy",
    id: "d8p2x5a9l1s6g4u",
    manual: false,
    name: "Магазин Рязанский",
    uid_1c: "91352c08-f41d-4444-b58c-22f1d89d4709",
    raw: {
      address: {
        text: "Рязанский пр-т, д. 75"
      },
      contact: "Рязанский"
    }
  },
  {
    code: "magazin_tushino",
    id: "s5c9v2n7b1q8r4e",
    manual: false,
    name: "Магазин Тушино",
    uid_1c: "a04a30a3-54ef-481e-a0d1-2d7f5f09be10",
    raw: {
      address: {
        text: "ул. Свободы, д. 35"
      },
      contact: "Тушино"
    }
  },
  {
    code: "magazin_sokolniki",
    id: "u7l1k4p9x2m5d8h",
    manual: false,
    name: "Магазин Сокольники",
    uid_1c: "b6b23e93-d3c0-42af-a70a-2ab3f6f1cf11",
    raw: {
      address: {
        text: "Сокольническая пл., д. 4"
      },
      contact: "Сокольники"
    }
  },
  {
    code: "magazin_zelenograd",
    id: "x2r8a5j1c6v9s3q",
    manual: false,
    name: "Магазин Зеленоград",
    uid_1c: "c8d74d47-5d2c-4b69-a239-7a793b2b8f12",
    raw: {
      address: {
        text: "к. 1824"
      },
      contact: "Зеленоград"
    }
  },
  {
    code: "magazin_domodedovo",
    id: "b4q9n2t6h1w8p5z",
    manual: false,
    name: "Магазин Домодедово",
    uid_1c: "d77518e2-9b50-449e-9d04-6a58d905e113",
    raw: {
      address: {
        text: "Каширское ш., д. 54"
      },
      contact: "Домодедово"
    }
  },
  {
    code: "magazin_odintsovo",
    id: "a6m3d8r1v5k9x2c",
    manual: false,
    name: "Магазин Одинцово",
    uid_1c: "e1044929-ae76-492e-b5d8-d2d2e8a15114",
    raw: {
      address: {
        text: "Можайское ш., д. 122"
      },
      contact: "Одинцово"
    }
  }
] as const;

const MOCK_STORES: Store[] = STORE_RECORDS.map((store) => ({
  id: store.id,
  code: store.code,
  manual: store.manual,
  name: store.name,
  uid_1c: store.uid_1c,
  address: store.raw.address.text,
  contact: store.raw.contact
}));

export async function GET() {
  const response: StoresResponse = {
    page: 1,
    perPage: MOCK_STORES.length,
    totalPages: 1,
    totalItems: MOCK_STORES.length,
    items: MOCK_STORES
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
