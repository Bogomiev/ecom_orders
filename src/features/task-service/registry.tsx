import type { ComponentType } from "react";
import { TaskService } from "@/entities/task/api";
import { qrImageSource } from "@/entities/task/image";
import { CashCollection } from "@/widgets/cash_collection";
import { StopperTask } from "@/widgets/stopper-task";
import { PriceTagTaskView } from "@/widgets/price-tag-task";

type ServiceProps = { task_id: number; onClose: () => void; [name: string]: unknown };
// A service may show its status on the task tile, open its instruction and allow one active task a day.
type Registration = { Component: ComponentType<ServiceProps>; parameters: Record<string, (value: unknown) => unknown>; instructionsHref?: string; showsStatus?: boolean; oneActive?: boolean };
// Only declared named parameters cross the service boundary. Task identity and callbacks
// always come from the caller and cannot be overridden by custom_fields.
const registry = new Map<string, Registration>([
 [TaskService.CashCollection, {
  Component: ({ qrCodeSrc, task_id, onClose }) => <CashCollection qrCodeSrc={qrCodeSrc as string} task_id={task_id} onClose={onClose} />,
  parameters: { qrCodeSrc: value => typeof value === "string" ? qrImageSource(value) : "" },
 }],
 [TaskService.Stoppers, {
  Component: ({ task_id, onClose }) => <StopperTask task_id={task_id} onClose={onClose} />,
  parameters: {},
  instructionsHref: "/instructions#stoppers",
  showsStatus: true,
  oneActive: true,
 }],
 [TaskService.PricePrint, {
  Component: ({ task_id, onClose }) => <PriceTagTaskView task_id={task_id} onClose={onClose} />,
  parameters: {},
  instructionsHref: "/instructions#price-tags",
  // The tile shows the number of tags to print instead of the status.
  showsStatus: false,
  oneActive: true,
 }],
]);
export function taskHasService(service: string) { return registry.has(service); }
export function TaskServiceView({ service, customFields, taskID, onClose }: { service: string; customFields: Record<string, unknown>; taskID: number; onClose: () => void }) {
 const registration=registry.get(service); if(!registration)return null;
 const params=Object.fromEntries(Object.entries(registration.parameters).map(([name,convert])=>[name,convert(customFields[name])]));
 const Component=registration.Component;
 return <Component {...params} task_id={taskID} onClose={onClose} />;
}
export function taskServiceInfo(service: string) {
 const registration = registry.get(service);
 return { instructionsHref: registration?.instructionsHref, showsStatus: registration?.showsStatus === true, oneActive: registration?.oneActive === true };
}
