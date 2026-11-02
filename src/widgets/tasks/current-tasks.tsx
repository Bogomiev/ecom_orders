"use client";
import { useEffect, useRef, useState } from "react";
import { TaskService, rmsRequest } from "@/entities/task/api";
import { useSelectedStore } from "@/entities/store/model/use-selected-store";
import { TaskServiceView, taskHasService } from "@/features/task-service/registry";
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
 return <WidgetPanel title="Задания" icon="check" accent="purple" count={visible.length}>
 {!storeID&&<p>Выберите магазин</p>}{error&&<p role="alert">{error}</p>}
 {storeID&&!visible.length&&<p>Нет текущих заданий</p>}
 {visible.map(task=>task.service!==TaskService.WithoutService ? <button
 key={task.id}
 type="button"
 className="app-border my-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
 style={{backgroundColor:isDark?task.color_dark:task.color}}
 onClick={()=>setOpened(task.id)}
 >
 {task.icon&&<>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={qrImageSource(task.icon)} alt="" className="h-10 w-10 shrink-0 object-contain" />
 </>}
 <span className="font-semibold">{task.short_name}</span>
 </button> : <article key={task.id} className="app-border my-2 rounded-xl border p-3" aria-busy={busy===task.id}>
 <h3>{task.name}</h3>
 <div className="flex gap-2">
 <button disabled={busy!==null} onClick={()=>setConfirm({task,action:"cancel"})}>Отмена</button>
 <button disabled={busy!==null} onClick={()=>setConfirm({task,action:task.status==="new"?"start":"complete"})}>{task.status==="new"?"Приступить":"Завершить"}</button>
 </div>
 {busy===task.id&&<span role="status"><LoadingDots /></span>}
 </article>)}
 {confirm&&<Dialog ariaLabel={questions[confirm.action]} onClose={()=>{if(busy===null)setConfirm(null);}}><p>{questions[confirm.action]}</p>{error&&<p role="alert">{error}</p>}<button disabled={busy!==null} onClick={()=>void act()}>Да{busy!==null&&<LoadingDots />}</button><button disabled={busy!==null} onClick={()=>setConfirm(null)}>Нет</button></Dialog>}
 {selected&&<TaskServiceView service={selected.service} customFields={selected.custom_fields??{}} taskID={selected.id} onClose={()=>setOpened(null)} />}
 </WidgetPanel>;
}
