"use client";

import { useCallback, useRef } from "react";
import type { ProductsResponse } from "@/entities/product";
import { fetchProducts } from "../api/orders";

const PRODUCTS_CACHE_TTL_MS = 15 * 60 * 1000;

type ProductsCache = {
  loadedAt: number;
  products: ProductsResponse;
};

export function useProductsCache() {
  const cacheRef = useRef<ProductsCache | null>(null);
  const requestRef = useRef<Promise<ProductsResponse> | null>(null);
  const refreshRequestRef = useRef<Promise<ProductsResponse> | null>(null);

  const getProducts = useCallback(async () => {
    const cached = cacheRef.current;

    if (
      cached !== null &&
      Date.now() - cached.loadedAt < PRODUCTS_CACHE_TTL_MS
    ) {
      return cached.products;
    }

    if (requestRef.current !== null) {
      return requestRef.current;
    }

    const request = fetchProducts();
    requestRef.current = request;

    try {
      const products = await request;
      cacheRef.current = { loadedAt: Date.now(), products };
      return products;
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
      }
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    if (refreshRequestRef.current !== null) {
      return refreshRequestRef.current;
    }

    const request = fetchProducts(undefined, true);
    refreshRequestRef.current = request;

    try {
      const products = await request;
      cacheRef.current = { loadedAt: Date.now(), products };
      return products;
    } finally {
      if (refreshRequestRef.current === request) {
        refreshRequestRef.current = null;
      }
    }
  }, []);

  const retryProducts = useCallback(async () => {
    const products = await fetchProducts();
    cacheRef.current = { loadedAt: Date.now(), products };
    return products;
  }, []);

  return { getProducts, refreshProducts, retryProducts };
}
