import { rmsRequest } from "@/entities/task/api";
import type { Stopper, StopperInput, StopperPosition, StopperPositionKey, StopperProduct } from "./model";

export function loadStoppers() { return rmsRequest<Stopper[]>("stoppers"); }
export function createStopper(input: StopperInput) { return rmsRequest<Stopper>("stoppers", "POST", { ...input, name: input.name.trim() }); }
export function saveStopper(id: number, input: StopperInput) { return rmsRequest<void>(`stoppers/${id}`, "PUT", { ...input, name: input.name.trim() }); }
export function deleteStopper(id: number) { return rmsRequest<void>(`stoppers/${id}`, "DELETE"); }
export function loadStopperPositions(from: string, to: string, stores: string[]) {
 const query = new URLSearchParams({ from, to });
 for (const id of stores) query.append("store_id", id);
 return rmsRequest<StopperPosition[]>(`stoppers/positions?${query}`);
}
export function setPositionsStopper(positions: StopperPositionKey[], stopperID: number | null) {
 return rmsRequest<void>("stoppers/positions/stopper", "PUT", { positions, stopper_id: stopperID });
}
export function setPositionsPeriod(positions: StopperPositionKey[], from: string, to: string | null) {
 return rmsRequest<void>("stoppers/positions/period", "PUT", { positions, from, to });
}
export function addManualPosition(productID: string, stopperID: number, from: string) {
 return rmsRequest<void>("stoppers/positions", "POST", { product_id: productID, stopper_id: stopperID, from });
}
export function searchStopperProducts(query: string) {
 return rmsRequest<StopperProduct[]>(`stoppers/products?${new URLSearchParams({ q: query.trim() })}`);
}
