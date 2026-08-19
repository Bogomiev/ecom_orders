"use client";

import { useSyncExternalStore } from "react";
import {
  getAccessTokenFromLocation,
  getStoredAccessToken
} from "./access-store";

const subscribe = () => () => undefined;
const getSnapshot = () =>
  (getAccessTokenFromLocation() ?? getStoredAccessToken()) !== null;

export function useHasAccessToken() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
