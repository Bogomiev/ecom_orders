"use client";

import { useEffect, useMemo, useState } from "react";
import type { Store, StoresResponse } from "@/entities/store";
import {
  getStoredStoreSelection,
  setStoredStoreSelection,
  toStoreSelectionSnapshot
} from "@/entities/store";

const STORES_SERVICE_PATH = "/api/entities/stores";
const ALL_STORES_ID = "all-stores";
const LEGACY_STORAGE_KEY = "ecom-orders-selected-store-id";

type StoreSelection = Store | null;

type StorePickerButtonProps = {
  selectedStore: StoreSelection;
  onOpen: () => void;
};

type StoreSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (store: StoreSelection) => void;
  selectedStore: StoreSelection;
  state: StoresState;
};

type StoresState = {
  error: string | null;
  isLoading: boolean;
  stores: Store[];
  totalItems: number;
};

const initialStoresState: StoresState = {
  error: null,
  isLoading: true,
  stores: [],
  totalItems: 0
};

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-slate-800"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function StorePickerButton({ selectedStore, onOpen }: StorePickerButtonProps) {
  return (
    <button
      className="flex min-h-14 min-w-52 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left shadow-md shadow-slate-300/50 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      type="button"
      onClick={onOpen}
    >
      <LocationIcon />
      <span className="min-w-0">
        <span className="block truncate text-base font-bold leading-tight text-slate-950">
          {selectedStore?.name ?? "Все склады"}
        </span>
        <span className="mt-1 block text-sm leading-tight text-slate-600">
          Все • с МСК
        </span>
      </span>
    </button>
  );
}

function StoreSelectorSearchPanel({
  onResetSelection,
  onSearchQueryChange,
  searchQuery,
  shownItems,
  totalItems
}: {
  onResetSelection: () => void;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  shownItems: number;
  totalItems: number;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_auto_auto] lg:items-center">
      <input
        className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-500 shadow-inner outline-none ring-2 ring-slate-200/70"
        placeholder="Найти склад по названию или коду..."
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
      <div className="text-base font-medium text-slate-500">
        Показано: {shownItems} из {totalItems}
      </div>
      <button
        className="h-10 rounded-xl border border-transparent px-4 text-base font-bold text-slate-900 transition hover:bg-slate-300 focus:bg-slate-300 focus:outline-none"
        type="button"
        onClick={onResetSelection}
      >
        Сбросить выбор
      </button>
    </div>
  );
}

function OrdersStoreFilterPanel() {
  const [activeFilter, setActiveFilter] = useState("all");
  const filters = [
    { id: "all", label: "Все" },
    { id: "aggregators", label: "Агрегаторы" },
    { id: "retail", label: "Retail" }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/70">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
        Отображение заказов
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              className={`rounded-xl border border-transparent px-4 py-2 text-base font-bold transition focus:outline-none ${
                isActive
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-900 hover:bg-slate-300 focus:bg-slate-300"
              }`}
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
        <div>
          <div className="text-base font-bold text-slate-950">
            Исключить Интернет-магазин МСК
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Заказы со складом Интернет-магазин МСК не будут показаны на экране сборки.
          </div>
        </div>
        <button
          aria-label="Исключить Интернет-магазин МСК"
          className="h-7 w-14 shrink-0 rounded-full border border-slate-500 bg-white p-1"
          type="button"
        >
          <span className="block h-5 w-5 rounded-full bg-slate-400" />
        </button>
      </div>
    </section>
  );
}

function StoreSelectorHeader({
  onResetSelection,
  onSearchQueryChange,
  searchQuery,
  shownItems,
  totalItems
}: {
  onResetSelection: () => void;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  shownItems: number;
  totalItems: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <StoreSelectorSearchPanel
        searchQuery={searchQuery}
        shownItems={shownItems}
        totalItems={totalItems}
        onResetSelection={onResetSelection}
        onSearchQueryChange={onSearchQueryChange}
      />
      <div className="mt-4">
        <OrdersStoreFilterPanel />
      </div>
    </div>
  );
}

function AllStoresListItem({
  isSelected,
  onSelect
}: {
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left text-lg font-bold ${
        isSelected
          ? "border-violet-600 bg-violet-100/70 text-slate-950 ring-2 ring-violet-500"
          : "border-slate-200 bg-white text-slate-950"
      }`}
      type="button"
      onClick={onSelect}
    >
      <span>Все склады</span>
      {isSelected ? (
        <span className="rounded-full bg-violet-600 px-3 py-1 text-base font-medium text-white">
          Выбран
        </span>
      ) : null}
    </button>
  );
}

function StoreListItem({
  isSelected,
  onSelect,
  store
}: {
  isSelected: boolean;
  onSelect: () => void;
  store: Store;
}) {
  return (
    <button
      className={`grid w-full gap-3 rounded-2xl border px-5 py-4 text-left transition md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        isSelected
          ? "border-violet-600 bg-slate-100 shadow-md shadow-slate-300/70 ring-2 ring-violet-500"
          : "border-slate-200 bg-white shadow-sm shadow-slate-200/80 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-300/60"
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-lg font-bold text-slate-950">
            {store.name}
          </h3>
          {store.manual ? (
            <span className="rounded-full bg-pink-500 px-3 py-1 text-sm font-medium text-white">
              Ручной
            </span>
          ) : null}
        </div>
        <div className="mt-1 truncate text-base text-slate-500">
          {store.code} • {store.address}
        </div>
      </div>
      {isSelected ? (
        <span className="rounded-full bg-violet-600 px-3 py-1 text-base text-white">
          Выбран
        </span>
      ) : null}
    </button>
  );
}

function StoresList({
  onSelect,
  selectedStore,
  stores
}: {
  onSelect: (store: StoreSelection) => void;
  selectedStore: StoreSelection;
  stores: Store[];
}) {
  return (
    <div className="space-y-3">
      <AllStoresListItem
        isSelected={selectedStore === null}
        onSelect={() => onSelect(null)}
      />
      {stores.map((store) => (
        <StoreListItem
          isSelected={selectedStore?.id === store.id}
          key={store.id}
          store={store}
          onSelect={() => onSelect(store)}
        />
      ))}
      {stores.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-base font-medium text-slate-500 shadow-sm shadow-slate-200/80">
          Магазины не найдены
        </div>
      ) : null}
    </div>
  );
}

function StoreSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedStore,
  state
}: StoreSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredStores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return state.stores;
    }

    return state.stores.filter((store) => {
      const name = store.name.toLowerCase();
      const code = store.code.toLowerCase();

      return name.includes(normalizedQuery) || code.includes(normalizedQuery);
    });
  }, [searchQuery, state.stores]);

  function handleResetSelection() {
    setSearchQuery("");
    onSelect(null);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center bg-slate-950/35 p-4">
      <div className="mx-auto flex h-[90vh] max-h-[90vh] w-full max-w-[64.8rem] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Выбор склада</h2>
            <p className="mt-2 text-lg text-slate-500">
              Поиск по названию и коду. Выбор сохраняется в браузере.
            </p>
          </div>
          <button
            className="self-start rounded-lg border border-transparent px-3 py-1.5 text-sm font-bold text-slate-900 transition hover:bg-slate-300 focus:bg-slate-300 focus:outline-none"
            type="button"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
          <StoreSelectorHeader
            searchQuery={searchQuery}
            shownItems={filteredStores.length}
            totalItems={state.totalItems}
            onResetSelection={handleResetSelection}
            onSearchQueryChange={setSearchQuery}
          />
          <div className="mt-7 min-h-0 flex-1 overflow-y-auto pt-1 pr-2">
            {state.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                {state.error}
              </div>
            ) : null}
            {state.isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600">
                Загружаем склады...
              </div>
            ) : (
              <StoresList
                selectedStore={selectedStore}
                stores={filteredStores}
                onSelect={onSelect}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoreSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<StoresState>(initialStoresState);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStoreId(
      getStoredStoreSelection()?.id ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY)
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStores() {
      try {
        const response = await fetch(STORES_SERVICE_PATH, {
          cache: "no-store",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Stores request failed with status ${response.status}`);
        }

        const data = (await response.json()) as StoresResponse;

        setState({
          error: null,
          isLoading: false,
          stores: data.items,
          totalItems: data.totalItems
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error ? error.message : "Не удалось загрузить склады",
          isLoading: false
        }));
      }
    }

    loadStores();

    return () => {
      controller.abort();
    };
  }, []);

  const selectedStore = useMemo(
    () => state.stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, state.stores]
  );

  function handleSelect(store: StoreSelection) {
    setSelectedStoreId(store?.id ?? null);

    if (store === null) {
      setStoredStoreSelection(null);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      setStoredStoreSelection(toStoreSelectionSnapshot(store));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    setIsOpen(false);
  }

  return (
    <>
      <StorePickerButton
        selectedStore={selectedStore}
        onOpen={() => setIsOpen(true)}
      />
      <StoreSelectorModal
        isOpen={isOpen}
        selectedStore={selectedStore}
        state={state}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
      />
    </>
  );
}
