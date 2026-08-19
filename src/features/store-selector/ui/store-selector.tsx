"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Store } from "@/entities/store";
import {
  getAccessTokenFromLocation,
  getStoredAccessToken,
  getStoreUidForAccessToken,
  removeAccessTokenFromLocation,
  removeStoreUidForAccessToken,
  setStoredAccessToken,
  setStoreAuthorized,
  setStoredStoreSelection,
  setStoreUidForAccessToken,
  toStoreSelectionSnapshot
} from "@/entities/store";
import { getStores } from "@/entities/store/api/get-stores";
import { accessTokenIsValid } from "@/entities/store/api/access-token-is-valid";
import { pinIsValid } from "@/entities/store/api/pin-is-valid";
import { usePageNotifications } from "@/shared/lib/use-page-notifications";
import { Dialog } from "@/shared/ui/dialog";
import { PageNotificationStack } from "@/shared/ui/page-notification";

const LEGACY_STORAGE_KEY = "ecom-orders-selected-store-id";
const PIN_LENGTH = 5;

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
      className={`h-5 w-5 shrink-0 ${selected ? "text-blue-600" : "app-text"}`}
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

function StoreBuildingIcon() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-500">
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M5 21V7l7-4v18M12 8h7v13M3 21h18" />
        <path d="M8 9h1M8 13h1M8 17h1M15 12h1M15 16h1" />
      </svg>
    </span>
  );
}

function StorePickerButton({
  disabled,
  statusText,
  selectedStore,
  onOpen
}: {
  disabled: boolean;
  statusText?: string;
  selectedStore: StoreSelection;
  onOpen: () => void;
}) {
  return (
    <button
      className="flex min-h-12 w-full min-w-0 items-center justify-start gap-2.5 rounded-lg border app-border app-surface px-2.5 py-1.5 text-left shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:w-[23rem]"
      disabled={disabled}
      type="button"
      onClick={onOpen}
    >
      <StoreBuildingIcon />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-extrabold leading-tight app-text">
          {statusText ??
            (disabled || selectedStore === null
              ? "Магазин не выбран"
              : selectedStore.name)}
        </span>
        {selectedStore && !statusText ? (
          <span className="mt-0.5 block truncate text-[10px] leading-tight app-muted">
            {selectedStore.address}
          </span>
        ) : null}
      </span>
      <svg
        aria-hidden="true"
        className="h-5 w-5 shrink-0 app-muted"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m8 10 4 4 4-4" />
      </svg>
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
              : "border-slate-300 app-surface"
          }`}
          key={index}
        />
      ))}
    </div>
  );
}

function StoreSelectorModal({
  onClose,
  onSelect,
  selectedStore,
  state
}: {
  onClose: () => void;
  onSelect: (store: Store, pin: string) => Promise<boolean>;
  selectedStore: StoreSelection;
  state: StoresState;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return state.stores;

    return state.stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.code.toLowerCase().includes(query)
    );
  }, [searchQuery, state.stores]);

  function enterDigit(digit: string) {
    const nextPin = pin.length === PIN_LENGTH ? digit : `${pin}${digit}`;
    setPin(nextPin);
    setPinError(null);
  }

  async function selectStore(store: Store) {
    if (pin.length !== PIN_LENGTH) {
      setPinError("Укажите PIN перед выбором магазина");
      return;
    }

    setIsVerifyingPin(true);
    setPinError(null);
    try {
      const isSelected = await onSelect(store, pin);
      if (!isSelected) {
        setPinError("Неверный PIN");
        setPin("");
      }
    } finally {
      setIsVerifyingPin(false);
    }
  }

  return (
    <Dialog
      ariaLabelledBy="store-selector-title"
      className="flex max-h-[96vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] app-surface px-5 py-6 shadow-2xl sm:px-8"
      onClose={onClose}
    >
        <h2 id="store-selector-title" className="text-center text-2xl font-extrabold app-text">Смена точки</h2>
        <p className="mt-3 text-center text-base app-muted">
          Введите PIN и выберите магазин
        </p>

        <input
          autoFocus
          className="mt-5 h-11 w-full rounded-xl border app-border app-surface-muted px-4 text-sm app-text outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="Поиск магазина по названию или коду"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
          ) : state.isLoading ? (
            <div className="px-4 py-6 text-center text-sm app-muted">Загружаем магазины...</div>
          ) : (
            filteredStores.map((store) => {
              const isSelected = selectedStore?.id === store.id;

              return (
                <button
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left transition ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 text-blue-600"
                      : "app-border app-surface-muted app-text hover:border-blue-200 hover:bg-blue-50/50"
                  }`}
                  key={store.id}
                  type="button"
                  disabled={isVerifyingPin}
                  onClick={() => void selectStore(store)}
                >
                  <LocationIcon selected={isSelected} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{store.name}</span>
                    <span className="mt-0.5 block truncate text-xs font-normal app-muted">
                      {store.address}
                    </span>
                  </span>
                  <span className="text-xs font-medium app-muted">{store.code}</span>
                </button>
              );
            })
          )}
          {!state.isLoading && !state.error && filteredStores.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm app-muted">Магазины не найдены</div>
          ) : null}
        </div>

        <div className="mt-5">
          <PinDots hasError={pinError !== null} pin={pin} />
          {pinError ? (
            <div className="mt-2 text-center text-xs font-semibold text-red-600">{pinError}</div>
          ) : null}
          {isVerifyingPin ? <div className="mt-2 text-center text-xs font-semibold text-blue-600">Проверяем PIN...</div> : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              className="h-12 rounded-xl border app-border app-surface-muted text-xl font-bold app-text transition hover:bg-slate-100 active:bg-blue-50"
              key={digit}
              type="button"
              disabled={isVerifyingPin}
              onClick={() => enterDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button className="h-12 rounded-xl border app-border app-surface-muted text-sm font-bold app-muted hover:bg-slate-100" disabled={isVerifyingPin} type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="h-12 rounded-xl border app-border app-surface-muted text-xl font-bold app-text hover:bg-slate-100" disabled={isVerifyingPin} type="button" onClick={() => enterDigit("0")}>
            0
          </button>
          <button aria-label="Удалить последнюю цифру" className="h-12 rounded-xl border app-border app-surface-muted text-lg font-bold app-muted hover:bg-slate-100" disabled={isVerifyingPin} type="button" onClick={() => { setPin((currentPin) => currentPin.slice(0, -1)); setPinError(null); }}>
            ⌫
          </button>
        </div>

    </Dialog>
  );
}

export function StoreSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<StoresState>(initialStoresState);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);
  const [isCheckingAccessToken, setIsCheckingAccessToken] = useState(false);
  const [isAccessTokenInvalid, setIsAccessTokenInvalid] = useState(false);
  const { dismiss, notifications, notify } = usePageNotifications();

  useEffect(() => {
    const controller = new AbortController();

    async function loadStores() {
      try {
        setStoreAuthorized(false);
        const token = getAccessTokenFromLocation() ?? getStoredAccessToken();
        setAccessToken(token);

        if (token === null) {
          setSelectedStoreId(null);
          setStoredStoreSelection(null);
          setState({ error: null, isLoading: false, stores: [] });
          return;
        }

        setIsCheckingAccessToken(true);
        const isValid = await accessTokenIsValid(token, controller.signal);
        setIsCheckingAccessToken(false);
        if (!isValid) {
          removeStoreUidForAccessToken(token);
          if (getStoredAccessToken() === token) {
            setStoredAccessToken(null);
          }
          setSelectedStoreId(null);
          setStoredStoreSelection(null);
          setIsAccessTokenInvalid(true);
          setState({ error: null, isLoading: false, stores: [] });
          notify({
            body: "Откройте сервис с действительным токеном доступа.",
            title: "Токен доступа недействителен",
            tone: "error"
          });
          return;
        }

        setIsAccessTokenInvalid(false);
        const data = await getStores(controller.signal);
        setState({ error: null, isLoading: false, stores: data.items });

        const mappedStoreUid = getStoreUidForAccessToken(token);
        const mappedStore = data.items.find(
          (store) => store.uid_1c === mappedStoreUid
        );

        if (mappedStore) {
          setSelectedStoreId(mappedStore.id);
          setStoredStoreSelection(toStoreSelectionSnapshot(mappedStore));
          setStoredAccessToken(token);
          removeAccessTokenFromLocation();
          setStoreAuthorized(true);
        } else {
          setSelectedStoreId(null);
          setStoredStoreSelection(null);
          setIsOpen(true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setIsCheckingAccessToken(false);
        setState((currentState) => ({
          ...currentState,
          error: error instanceof Error ? error.message : "Не удалось загрузить магазины",
          isLoading: false
        }));
      }
    }

    loadStores();
    return () => controller.abort();
  }, [notify]);

  const selectedStore = useMemo(
    () => state.stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, state.stores]
  );
  const handleClose = useCallback(() => setIsOpen(false), []);

  async function handleSelect(store: Store, pin: string) {
    if (accessToken === null || accessToken === undefined) return false;

    try {
      const isValid = await pinIsValid(pin);
      if (!isValid) return false;

      setSelectedStoreId(store.id);
      setStoredStoreSelection(toStoreSelectionSnapshot(store));
      setStoreUidForAccessToken(accessToken, store.uid_1c);
      setStoredAccessToken(accessToken);
      removeAccessTokenFromLocation();
      setStoreAuthorized(true);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      setIsOpen(false);
      return true;
    } catch {
      notify({
        body: "Не удалось проверить PIN. Попробуйте ещё раз.",
        title: "Ошибка проверки PIN",
        tone: "error"
      });
      return false;
    }
  }

  return (
    <>
      <StorePickerButton
        disabled={
          accessToken === null ||
          accessToken === undefined ||
          isCheckingAccessToken ||
          isAccessTokenInvalid
        }
        statusText={isCheckingAccessToken ? "Проверка токена..." : undefined}
        selectedStore={selectedStore}
        onOpen={() => setIsOpen(true)}
      />
      <PageNotificationStack notifications={notifications} onClose={dismiss} />
      {isOpen ? (
        <StoreSelectorModal
          selectedStore={selectedStore}
          state={state}
          onClose={handleClose}
          onSelect={handleSelect}
        />
      ) : null}
    </>
  );
}
