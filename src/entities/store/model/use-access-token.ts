"use client";

import { useSyncExternalStore } from "react";
import { getAccessTokenFromLocation } from "./access-store";

const subscribe = () => () => undefined;
const getSnapshot = () => getAccessTokenFromLocation() !== null;

export function useHasAccessToken() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
