"use client";
import { useEffect, useRef, useState } from "react";
import { TaskService, rmsRequest } from "@/entities/task/api";
import { useSelectedStore } from "@/entities/store/model/use-selected-store";
import { TaskServiceView, taskHasService, taskServiceInfo } from "@/features/task-service/registry";
import Link from "next/link";
import { InstructionsIcon } from "@/shared/ui/instructions-icon";
import { WidgetPanel } from "@/shared/ui/widget-panel";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { Dialog } from "@/shared/ui/dialog";
import { qrImageSource } from "@/entities/task/image";
import { useTheme } from "@/shared/lib/use-theme";

type CurrentTask = { id: number; name: string; short_name: string; icon: string | null; color: string; color_dark: string; status: "new"|"in_progress"; service: string; custom_fields: Record<string, unknown> };
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
 const { isDark } = useTheme();
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
 {visible.map(task=>task.service!==TaskService.WithoutService ? <ServiceTile key={task.id} task={task} isDark={isDark} onOpen={()=>setOpened(task.id)} /> : <article key={task.id} className="app-border rounded-xl border p-3" style={{backgroundColor:(isDark?task.color_dark:task.color)||"var(--panel-soft)"}} aria-busy={busy===task.id}>
 <h3>{task.name}</h3>
 <div className="flex gap-2">
 <button disabled={busy!==null} onClick={()=>setConfirm({task,action:"cancel"})}>Отмена</button>
 <button disabled={busy!==null} onClick={()=>setConfirm({task,action:task.status==="new"?"start":"complete"})}>{task.status==="new"?"Приступить":"Завершить"}</button>
 </div>
 {busy===task.id&&<span role="status"><LoadingDots /></span>}
 </article>)}
 </div>
 {confirm&&<Dialog ariaLabel={questions[confirm.action]} onClose={()=>{if(busy===null)setConfirm(null);}}><p>{questions[confirm.action]}</p>{error&&<p role="alert">{error}</p>}<button disabled={busy!==null} onClick={()=>void act()}>Да{busy!==null&&<LoadingDots />}</button><button disabled={busy!==null} onClick={()=>setConfirm(null)}>Нет</button></Dialog>}
 {selected&&<TaskServiceView service={selected.service} customFields={selected.custom_fields??{}} taskID={selected.id} onClose={()=>{setOpened(null);void refresh.current();}} />}
 {creating&&storeID&&<CreateTaskDialog storeID={storeID} isDark={isDark} activeServices={tasks.map(t=>t.service)} onCreated={task=>void created(task)} onClose={()=>setCreating(false)} />}
 </WidgetPanel>;
}
type AvailableType={id:number;name:string;short_name:string;service:string;icon:string|null;color:string;color_dark:string};
// Store users create a task of any active type for the selected store; it starts now.
function CreateTaskDialog({storeID,isDark,activeServices,onCreated,onClose}:{storeID:string;isDark:boolean;activeServices:string[];onCreated:(task:{id:number;service:string})=>void;onClose:()=>void}) {
 const [types,setTypes]=useState<AvailableType[]|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<number|null>(null);
 useEffect(()=>{let active=true;rmsRequest<AvailableType[]>("tasks/types").then(v=>{if(active)setTypes(v);}).catch(e=>{if(active){setTypes([]);setError((e as Error).message);}});return()=>{active=false;};},[]);
 async function create(type:AvailableType){
  if(busy!==null)return;setBusy(type.id);setError("");
  try{const task=await rmsRequest<{id:number}>("tasks/manual","POST",{type_id:type.id,store_id:storeID});onCreated({id:task.id,service:type.service});}
  catch(e){const message=(e as Error).message;setError(taskServiceInfo(type.service).oneActive&&message.startsWith("Запись используется")?"Активное задание этого типа на сегодня уже есть.":message);setBusy(null);}
 }
 return <Dialog ariaLabelledBy="create-task-title" onClose={()=>{if(busy===null)onClose();}} className="app-surface app-text app-border flex max-h-[calc(100dvh-24px)] w-[min(440px,100%)] flex-col gap-3 overflow-y-auto rounded-2xl border p-5 shadow-xl">
 <div className="flex items-center gap-3"><h2 id="create-task-title" className="flex-1 text-lg font-extrabold">Создать задание</h2><button type="button" aria-label="Закрыть" className="app-border grid h-8 w-8 place-items-center rounded-lg border text-xl leading-none" disabled={busy!==null} onClick={onClose}>×</button></div>
 <p className="app-muted text-sm">Задание появится в магазине сразу, со временем начала «сейчас».</p>
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 {types===null?<span role="status"><LoadingDots /></span>:!types.length&&!error?<p className="app-muted text-sm">Нет активных типов заданий</p>:
 <div className="flex flex-col gap-2">{types.map(type=>{const taken=taskServiceInfo(type.service).oneActive&&activeServices.includes(type.service);return <button key={type.id} type="button" disabled={busy!==null||taken} title={taken?"Активное задание этого типа на сегодня уже есть":undefined} onClick={()=>void create(type)} className="app-border app-text flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60" style={{backgroundColor:(isDark?type.color_dark:type.color)||"var(--panel-soft)"}}>
 {type.icon&&<span style={{backgroundColor:"var(--accent-soft)"}} className="app-border grid h-9 w-9 shrink-0 place-items-center rounded-lg border">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={qrImageSource(type.icon)} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
 </span>}
 <span className="flex-1">{type.name}{taken&&<small className="block text-xs font-semibold opacity-75">Уже есть активное задание на сегодня</small>}</span>{busy===type.id&&<LoadingDots />}
 </button>;})}</div>}
 </Dialog>;
}
// A service task tile opens the task; a service may also show its status and an instruction link.
function ServiceTile({task,isDark,onOpen}:{task:CurrentTask;isDark:boolean;onOpen:()=>void}) {
 const info=taskServiceInfo(task.service);
 return <div className="app-border app-text flex w-full items-center gap-2 rounded-xl border pr-2" style={{backgroundColor:(isDark?task.color_dark:task.color)||"var(--panel-soft)"}}>
 <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={onOpen}>
 {task.icon&&<span style={{backgroundColor:"var(--accent-soft)"}} className="app-border grid h-9 w-9 shrink-0 place-items-center rounded-lg border">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={qrImageSource(task.icon)} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
 </span>}
 <span className="min-w-0 flex-1">{task.short_name}</span>
 {info.showsStatus&&<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${task.status==="new"?"bg-sky-100 text-sky-700":"bg-amber-100 text-amber-700"}`}>● {task.status==="new"?"Новое":"Выполняется"}</span>}
 </button>
 {info.instructionsHref&&<Link href={info.instructionsHref} aria-label={`Инструкция: ${task.short_name}`} title={`Инструкция: ${task.short_name}`} className="app-border app-surface app-muted grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"><InstructionsIcon /></Link>}
 </div>;
}
