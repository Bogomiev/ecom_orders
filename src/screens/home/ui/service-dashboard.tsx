"use client";

import { Children, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { WidgetIcon } from "@/shared/ui/widget-panel";

const MOBILE_QUERY = "(max-width: 659px)";
const services = [
  { title: "Интернет-заказы", icon: "cart", accent: "blue" },
  { title: "Товары", icon: "cube", accent: "teal" },
  { title: "Задания", icon: "check", accent: "purple" },
  { title: "Сервис-деск", icon: "message", accent: "orange" },
  { title: "Дашборд", icon: "chart", accent: "cyan" }
] as const;

function subscribe(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function ServiceDashboard({ children }: { children: ReactNode }) {
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (window.matchMedia(MOBILE_QUERY).matches) {
        element.scrollTo({ left: activeRef.current * element.clientWidth, behavior: "instant" });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function select(index: number) {
    const element = viewport.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior: "instant" });
    setActive(index);
  }

  return (
    <>
      <div className="service-tabs" role="tablist" aria-label="Сервисы">
        {services.map((service, index) => (
          <button key={service.icon} id={`service-tab-${index}`} type="button" role="tab"
            aria-label={service.title} title={service.title} aria-selected={active === index}
            aria-controls={`service-panel-${index}`} tabIndex={active === index ? 0 : -1}
            className={`service-tab widget-accent-${service.accent}`}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % services.length
                : event.key === "ArrowLeft" ? (index + services.length - 1) % services.length
                : event.key === "Home" ? 0 : event.key === "End" ? services.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              select(next);
              document.getElementById(`service-tab-${next}`)?.focus();
            }}>
            <WidgetIcon name={service.icon} />
          </button>
        ))}
      </div>
      <div ref={viewport} className="dashboard-grid" onScroll={(event) => {
        if (!mobile) return;
        const element = event.currentTarget;
        setActive(Math.max(0, Math.min(services.length - 1, Math.round(element.scrollLeft / element.clientWidth))));
      }}>
        {Children.toArray(children).map((child, index) => (
          <div key={services[index].icon} id={`service-panel-${index}`} className="service-panel"
            role={mobile ? "tabpanel" : undefined} aria-labelledby={mobile ? `service-tab-${index}` : undefined}
            inert={mobile && active !== index}>
            {child}
          </div>
        ))}
      </div>
    </>
  );
}
