"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GoodsReceiptsResponse } from "@/entities/goods-receipt";
import { ORDERS_REFRESH_INTERVAL_SECONDS } from "@/widgets/orders-list/api/orders";
import { fetchGoodsReceipts } from "../api/goods-receipts";

export function useGoodsReceipts(storeId?: string) {
  const [data, setData] = useState<GoodsReceiptsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(storeId));
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    if (!storeId) return;
    const controller = new AbortController();
    let pending: Promise<void> | null = null;
    const load = (): Promise<void> => {
      if (pending) return pending;
      if (controller.signal.aborted) return Promise.resolve();
      pending = (async () => {
        try {
          const result = await fetchGoodsReceipts(storeId, controller.signal);
          if (!controller.signal.aborted) {
            setData(result);
            setError(null);
          }
        } catch (error) {
          if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Не удалось загрузить приемки");
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
          pending = null;
        }
      })();
      return pending;
    };
    // После действия дожидаемся старого опроса и загружаем свежие данные.
    refreshRef.current = async () => {
      await pending;
      await load();
    };
    void load();
    const timer = window.setInterval(() => void load(), ORDERS_REFRESH_INTERVAL_SECONDS * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      refreshRef.current = async () => {};
    };
  }, [storeId]);

  return { data, error, isLoading, refresh };
}
