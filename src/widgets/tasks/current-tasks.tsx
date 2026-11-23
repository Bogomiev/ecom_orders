"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { TaskService, rmsRequest } from "@/entities/task/api";
import { useSelectedStore } from "@/entities/store/model/use-selected-store";
import { TaskServiceView, taskHasService, taskServiceInfo } from "@/features/task-service/registry";
import Link from "next/link";
import { InstructionsIcon } from "@/shared/ui/instructions-icon";
import { WidgetPanel } from "@/shared/ui/widget-panel";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { Dialog } from "@/shared/ui/dialog";
import { TaskIcon, taskTileClass } from "./ui/task-icon";
import { earlierStart, storeToday } from "./model/task-day";

type CurrentTask = { id: number; name: string; short_name: string; icon: string | null; color: string; color_dark: string; status: "new"|"in_progress"; service: string; start?: string; custom_fields: Record<string, unknown>; price_tags_pending?: number };
type Action = "start"|"cancel"|"complete";
const questions: Record<Action,string>={start:"Приступить к заданию?",cancel:"Отменить задание?",complete:"Завершить задание?"};
const configuredInterval=Number(process.env.NEXT_PUBLIC_TASKS_POLL_INTERVAL_SECONDS);
export const tasksPollInterval = (Number.isFinite(configuredInterval)&&configuredInterval>0?configuredInterval:60)*1000;
export function CurrentTasks() {
 const store=useSelectedStore();
 // Remounting prevents a request for the previous store from updating this view.
 return <StoreTasks key={store?.id??"none"} storeID={store?.id} />;
}
function StoreTasks({storeID}:{storeID?:string}) {
 const [tasks,setTasks]=useState<CurrentTask[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<number|null>(null);
 const [confirm,setConfirm]=useState<{task:CurrentTask;action:Action}|null>(null);
 const [opened,setOpened]=useState<number|null>(null);
 const [creating,setCreating]=useState(false);
 const version=useRef(0);
 const mounted=useRef(true);
 const actionLock=useRef(false);
 const refresh=useRef(()=>Promise.resolve());
 useEffect(()=>{
  mounted.current=true;let timer:ReturnType<typeof setTimeout>;
  const load=async()=>{if(!storeID)return;const request=++version.current;
   try{const values=await rmsRequest<CurrentTask[]>(`tasks/current?store_id=${encodeURIComponent(storeID)}`);if(mounted.current&&request===version.current){setTasks(values);setError("");}}
   catch(e){if(mounted.current&&request===version.current)setError((e as Error).message);}
  };
  refresh.current=load;
  const poll=async()=>{if(!actionLock.current)await load();if(mounted.current)timer=setTimeout(poll,tasksPollInterval);};
  void poll();return()=>{mounted.current=false;clearTimeout(timer);};
 },[storeID]);
 async function act(){
  if(!confirm||actionLock.current)return;
  const {task,action}=confirm;actionLock.current=true;++version.current;setBusy(task.id);setError("");
  try{const updated=await rmsRequest<CurrentTask>(`tasks/${task.id}/${action}`,"POST");if(!mounted.current)return;
   setTasks(values=>action==="start"?values.map(v=>v.id===task.id?{...v,status:updated.status}:v):values.filter(v=>v.id!==task.id));setConfirm(null);await refresh.current();
  }catch(e){if(mounted.current)setError((e as Error).message);}finally{actionLock.current=false;if(mounted.current)setBusy(null);}
 }
 const visible=tasks.filter(t=>t.service===TaskService.WithoutService||taskHasService(t.service));
 const selected=tasks.find(t=>t.id===opened);
 async function created(task:{id:number;service:string}){setCreating(false);await refresh.current();if(mounted.current&&taskHasService(task.service))setOpened(task.id);}
 const add=<button type="button" className="app-border app-surface-muted app-muted grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-lg font-black leading-none transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" title="Создать задание" aria-label="Создать задание" disabled={!storeID} onClick={()=>setCreating(true)}>+</button>;
 return <WidgetPanel title="Задания" icon="check" accent="purple" count={visible.length} headerAction={add}>
 {!storeID&&<p>Выберите магазин</p>}{error&&<p role="alert">{error}</p>}
 {storeID&&!visible.length&&<p>Нет текущих заданий</p>}
 <div className="flex flex-col gap-2">
 {visible.map(task=>task.service!==TaskService.WithoutService ? <ServiceTile key={task.id} task={task} onOpen={()=>setOpened(task.id)} /> : <article key={task.id} className="app-border app-surface-muted app-text flex flex-col gap-2 rounded-xl border px-3 py-3 text-sm" aria-busy={busy===task.id}>
 <div className="flex items-center gap-3"><TaskIcon service={task.service} /><h3 className="min-w-0 flex-1 font-extrabold">{task.name}</h3></div>
 <div className="flex gap-2 pl-12">
 <button className="app-border app-surface rounded-lg border px-3 py-1.5 text-xs font-bold transition hover:border-purple-400" disabled={busy!==null} onClick={()=>setConfirm({task,action:"cancel"})}>Отмена</button>
 <button className="rounded-lg border border-purple-600 bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700" disabled={busy!==null} onClick={()=>setConfirm({task,action:task.status==="new"?"start":"complete"})}>{task.status==="new"?"Приступить":"Завершить"}</button>
 </div>
 {busy===task.id&&<span role="status"><LoadingDots /></span>}
 </article>)}
 </div>
 {confirm&&<Dialog ariaLabel={questions[confirm.action]} onClose={()=>{if(busy===null)setConfirm(null);}}><p>{questions[confirm.action]}</p>{error&&<p role="alert">{error}</p>}<button disabled={busy!==null} onClick={()=>void act()}>Да{busy!==null&&<LoadingDots />}</button><button disabled={busy!==null} onClick={()=>setConfirm(null)}>Нет</button></Dialog>}
 {selected&&<TaskServiceView service={selected.service} customFields={selected.custom_fields??{}} taskID={selected.id} onClose={()=>{setOpened(null);void refresh.current();}} />}
 {creating&&storeID&&<CreateTaskDialog storeID={storeID} activeServices={tasks.map(t=>t.service)} onCreated={task=>void created(task)} onClose={()=>setCreating(false)} />}
 </WidgetPanel>;
}
// available is false when the store has nothing for this type today, e.g. no stoppers to check or remove.
type AvailableType={id:number;name:string;short_name:string;service:string;icon:string|null;color:string;color_dark:string;available?:boolean};
// Why RMS marks a type unavailable today: the task would be empty.
const emptyTaskMessages:Record<string,string>={[TaskService.Stoppers]:"На сегодня нет стопперов, которые нужно проверить или снять",[TaskService.PricePrint]:"На сегодня нет ценников для печати"};
const emptyTaskMessage=(service:string)=>emptyTaskMessages[service]??"На сегодня это задание создать нельзя";
function typeBlock(type:AvailableType,activeServices:string[]){
 if(taskServiceInfo(type.service).oneActive&&activeServices.includes(type.service))return "Уже есть активное задание на сегодня";
 return type.available===false?emptyTaskMessage(type.service):"";
}
// Store users create a task of any active type for the selected store; it starts now.
function CreateTaskDialog({storeID,activeServices,onCreated,onClose}:{storeID:string;activeServices:string[];onCreated:(task:{id:number;service:string})=>void;onClose:()=>void}) {
 const [types,setTypes]=useState<AvailableType[]|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<number|null>(null);
 const load=useCallback(()=>rmsRequest<AvailableType[]>(`tasks/types?${new URLSearchParams({store_id:storeID})}`),[storeID]);
 useEffect(()=>{let active=true;load().then(v=>{if(active)setTypes(v);}).catch(e=>{if(active){setTypes([]);setError((e as Error).message);}});return()=>{active=false;};},[load]);
 async function create(type:AvailableType){
  if(busy!==null)return;setBusy(type.id);setError("");
  try{const task=await rmsRequest<{id:number}>("tasks/manual","POST",{type_id:type.id,store_id:storeID});onCreated({id:task.id,service:type.service});}
  catch(e){
   const message=(e as Error).message;
   // RMS answers 409 both for a second active task and for a task with nothing to do; the fresh list tells which.
   const fresh=message.startsWith("Запись используется")?await load().catch(()=>null):null;
   if(fresh)setTypes(fresh);
   const block=fresh?typeBlock(fresh.find(v=>v.id===type.id)??type,activeServices):"";
   setError(block===emptyTaskMessage(type.service)?`${block}.`:fresh&&taskServiceInfo(type.service).oneActive?"Активное задание этого типа на сегодня уже есть.":message);setBusy(null);}
 }
 return <Dialog ariaLabelledBy="create-task-title" onClose={()=>{if(busy===null)onClose();}} className="app-surface app-text app-border flex max-h-[calc(100dvh-24px)] w-[min(440px,100%)] flex-col gap-3 overflow-y-auto rounded-2xl border p-5 shadow-xl">
 <div className="flex items-center gap-3"><h2 id="create-task-title" className="flex-1 text-lg font-extrabold">Создать задание</h2><button type="button" aria-label="Закрыть" className="app-border grid h-8 w-8 place-items-center rounded-lg border text-xl leading-none" disabled={busy!==null} onClick={onClose}>×</button></div>
 <p className="app-muted text-sm">Задание появится в магазине сразу, со временем начала «сейчас».</p>
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 {types===null?<span role="status"><LoadingDots /></span>:!types.length&&!error?<p className="app-muted text-sm">Нет активных типов заданий</p>:
 <div className="flex flex-col gap-2">{types.map(type=>{const block=typeBlock(type,activeServices);return <button key={type.id} type="button" disabled={busy!==null||Boolean(block)} title={block||undefined} onClick={()=>void create(type)} className={`${taskTileClass} px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60`}>
 <TaskIcon service={type.service} />
 <span className="flex-1">{type.name}{block&&<small className="block text-xs font-semibold opacity-75">{block}</small>}</span>{busy===type.id&&<LoadingDots />}
 </button>;})}</div>}
 </Dialog>;
}
// A service task tile opens the task; a service may also show its status and an instruction link.
// Tiles are not colored by the task type: they follow the «Товары» buttons, with an icon of the service.
// The standing «Печать ценников» task shows how many tags are to print: active (bright) with at least one,
// inactive (dimmed) when everything shown today is printed.
function ServiceTile({task,onOpen}:{task:CurrentTask;onOpen:()=>void}) {
 const info=taskServiceInfo(task.service);
 const pending=task.price_tags_pending;
 const counted=typeof pending==="number";
 // «Стопперы» stays until closed; a task from an earlier day shows its start day.
 const since=counted?"":earlierStart(task.start,storeToday());
 return <div data-active={counted?String(pending>0):undefined} className={`${taskTileClass} gap-2 pr-2 ${counted&&!pending?"opacity-60":""}`}>
 <button type="button" className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl py-3 pl-3 text-left ${counted?"pr-0":"pr-3"} focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400`} onClick={onOpen}>
 <TaskIcon service={task.service} />
 <span className="min-w-0 flex-1">{task.short_name}{since&&<small className="block whitespace-nowrap text-xs font-semibold opacity-75">{since}</small>}</span>
 {/* The counter takes the place of the instruction link of other tiles, so they line up. */}
 {counted&&<span className="grid w-8 shrink-0 place-items-center"><span title="Не напечатано ценников" aria-label={`Не напечатано ценников: ${pending}`} className={`grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-xs font-extrabold tabular-nums ${pending?"bg-purple-600 text-white":"bg-slate-200 text-slate-600"}`}>{pending}</span></span>}
 {info.showsStatus&&!counted&&<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${task.status==="new"?"bg-sky-100 text-sky-700":"bg-amber-100 text-amber-700"}`}>● {task.status==="new"?"Новое":"Выполняется"}</span>}
 </button>

{info.instructionsHref&&<Link href={info.instructionsHref} aria-label={`Инструкция: ${task.short_name}`} title={`Инструкция: ${task.short_name}`} className="app-border app-surface app-muted grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"><InstructionsIcon /></Link>}
 </div>;
}
