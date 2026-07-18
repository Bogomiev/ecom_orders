"use client";

import { useEffect, useMemo, useState } from "react";
import type { Store, StoresResponse } from "@/entities/store";
import {
  getAccessTokenFromLocation,
  getStoreUidForAccessToken,
  setStoredStoreSelection,
  setStoreUidForAccessToken,
  toStoreSelectionSnapshot
} from "@/entities/store";

const STORES_SERVICE_PATH = "/api/entities/stores";
const LEGACY_STORAGE_KEY = "ecom-orders-selected-store-id";
const PIN_LENGTH = 4;

type StoreSelection = Store | null;

type StoresState = {
  error: string | null;
  isLoading: boolean;
  stores: Store[];
};

const initialStoresState: StoresState = {
  error: null,
  isLoading: true,
  stores: []
};

function LocationIcon({ selected = false }: { selected?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${selected ? "text-blue-600" : "text-slate-800"}`}
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

function StorePickerButton({
  disabled,
  selectedStore,
  onOpen
}: {
  disabled: boolean;
  selectedStore: StoreSelection;
  onOpen: () => void;
}) {
  return (
    <button
      className="flex min-h-10 w-fit max-w-full items-center justify-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
      disabled={disabled}
      type="button"
      onClick={onOpen}
    >
      <LocationIcon />
      <span className="flex min-w-0 items-center">
        <span className="block truncate text-base font-bold leading-none text-slate-950 sm:text-lg">
          {disabled
            ? "Магазин не выбран"
            : selectedStore
            ? `${selectedStore.name}, ${selectedStore.address} · 08:00–22:00`
            : "Магазин не выбран"}
        </span>
      </span>
    </button>
  );
}

function PinDots({ pin, hasError }: { pin: string; hasError: boolean }) {
  return (
    <div aria-label={`Введено цифр PIN: ${pin.length} из ${PIN_LENGTH}`} className="flex justify-center gap-4">
      {Array.from({ length: PIN_LENGTH }, (_, index) => (
        <span
          className={`h-3.5 w-3.5 rounded-full border-2 ${
            index < pin.length
              ? hasError
                ? "border-red-500 bg-red-500"
                : "border-blue-500 bg-blue-500"
              : "border-slate-300 bg-white"
          }`}
          key={index}
        />
      ))}
    </div>
  );
}

function StoreSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedStore,
  state
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (store: StoreSelection) => void;
  selectedStore: StoreSelection;
  state: StoresState;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pin, setPin] = useState("");
  const [pinHasError, setPinHasError] = useState(false);
  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return state.stores;

    return state.stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.code.toLowerCase().includes(query)
    );
  }, [searchQuery, state.stores]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function enterDigit(digit: string) {
    const nextPin = pin.length === PIN_LENGTH ? digit : `${pin}${digit}`;
    setPin(nextPin);
    setPinHasError(false);

    if (nextPin.length === PIN_LENGTH) {
      const matchedStore = state.stores.find((store) => store.pin === nextPin);
      if (matchedStore) onSelect(matchedStore);
      else setPinHasError(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-[1px]" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="flex max-h-[96vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white px-5 py-6 shadow-2xl sm:px-8"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-center text-2xl font-extrabold text-slate-950">Смена точки</h2>
        <p className="mt-3 text-center text-base text-slate-500">
          Выберите магазин или введите PIN для подтверждения
        </p>

        <input
          autoFocus
          className="mt-5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="Поиск магазина по названию или коду"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
          ) : state.isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">Загружаем магазины...</div>
          ) : (
            filteredStores.map((store) => {
              const isSelected = selectedStore?.id === store.id;

              return (
                <button
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left transition ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 text-blue-600"
                      : "border-slate-200 bg-slate-50/70 text-slate-950 hover:border-blue-200 hover:bg-blue-50/50"
                  }`}
                  key={store.id}
                  type="button"
                  onClick={() => onSelect(store)}
                >
                  <LocationIcon selected={isSelected} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{store.name}</span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                      {store.address}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-slate-400">{store.code}</span>
                </button>
              );
            })
          )}
          {!state.isLoading && !state.error && filteredStores.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-slate-500">Магазины не найдены</div>
          ) : null}
        </div>

        <div className="mt-5">
          <PinDots hasError={pinHasError} pin={pin} />
          {pinHasError ? (
            <div className="mt-2 text-center text-xs font-semibold text-red-600">Магазин с таким PIN не найден</div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-950 transition hover:bg-slate-100 active:bg-blue-50"
              key={digit}
              type="button"
              onClick={() => enterDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 hover:bg-slate-100" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-950 hover:bg-slate-100" type="button" onClick={() => enterDigit("0")}>
            0
          </button>
          <button aria-label="Удалить последнюю цифру" className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold text-slate-500 hover:bg-slate-100" type="button" onClick={() => { setPin((currentPin) => currentPin.slice(0, -1)); setPinHasError(false); }}>
            ⌫
          </button>
        </div>

      </section>
    </div>
  );
}

export function StoreSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<StoresState>(initialStoresState);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStores() {
      try {
        const token = getAccessTokenFromLocation();
        setAccessToken(token);
        const response = await fetch(STORES_SERVICE_PATH, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`Stores request failed with status ${response.status}`);
        const data = (await response.json()) as StoresResponse;
        setState({ error: null, isLoading: false, stores: data.items });

        if (token === null) {
          setSelectedStoreId(null);
          setStoredStoreSelection(null);
          return;
        }

        const mappedStoreUid = getStoreUidForAccessToken(token);
        const mappedStore = data.items.find(
          (store) => store.uid_1c === mappedStoreUid
        );

        if (mappedStore) {
          setSelectedStoreId(mappedStore.id);
          setStoredStoreSelection(toStoreSelectionSnapshot(mappedStore));
        } else {
          setSelectedStoreId(null);
          setStoredStoreSelection(null);
          setIsOpen(true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((currentState) => ({
          ...currentState,
          error: error instanceof Error ? error.message : "Не удалось загрузить магазины",
          isLoading: false
        }));
      }
    }

    loadStores();
    return () => controller.abort();
  }, []);

  const selectedStore = useMemo(
    () => state.stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, state.stores]
  );

  function handleSelect(store: StoreSelection) {
    if (accessToken === null || accessToken === undefined || store === null) return;

    setSelectedStoreId(store?.id ?? null);
    setStoredStoreSelection(toStoreSelectionSnapshot(store));
    setStoreUidForAccessToken(accessToken, store.uid_1c);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setIsOpen(false);
  }

  return (
    <>
      <StorePickerButton
        disabled={accessToken === null || accessToken === undefined}
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
