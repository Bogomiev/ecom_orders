import { rmsRequest } from "@/entities/task/api";
import type { StopperTask, StopperTaskItem } from "./model/stopper-task";

export function loadStopperTask(taskID: number) { return rmsRequest<StopperTask>(`tasks/${taskID}/stoppers`); }
export function saveStopperTaskCheck(taskID: number, item: Pick<StopperTaskItem, "doc_id" | "product_id">, result: StopperTaskItem["result"]) {
 return rmsRequest<{ status: StopperTask["status"] }>(`tasks/${taskID}/stoppers/check`, "PUT", { doc_id: item.doc_id, product_id: item.product_id, result });
}
export function completeStopperTask(taskID: number) { return rmsRequest<unknown>(`tasks/${taskID}/complete`, "POST"); }
