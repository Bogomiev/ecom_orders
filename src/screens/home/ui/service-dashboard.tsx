"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WidgetIcon } from "@/shared/ui/widget-panel";

const services = [
  { title: "Интернет-заказы", icon: "cart", accent: "blue" },
  { title: "Товары", icon: "cube", accent: "teal" },
  { title: "Задания", icon: "check", accent: "purple" },
  { title: "Сервис-деск", icon: "message", accent: "orange" },
  { title: "Дашборд", icon: "chart", accent: "cyan" }
] as const;

export function ServiceDashboard({ children }: { children: ReactNode }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const count = window.matchMedia("(max-width: 659px)").matches ? 1
        : Math.max(1, Math.min(services.length, Math.floor((element.clientWidth + 10) / 250)));
      const first = Math.min(activeRef.current, services.length - count);
      element.style.setProperty("--visible-services", String(count));
      setVisibleCount(count);
      setActive(first);
      activeRef.current = first;
      const step = (element.clientWidth + 10) / count;
      element.scrollTo({ left: first * step, behavior: "instant" });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function select(index: number) {
    const element = viewport.current;
    if (!element) return;
    const first = index < active ? index : index >= active + visibleCount ? index - visibleCount + 1 : active;
    element.scrollTo({ left: first * (element.clientWidth + 10) / visibleCount, behavior: "instant" });
    setActive(first);
  }

  return (
    <>
      <div className="service-tabs" role="tablist" aria-label="Сервисы" aria-multiselectable="true" hidden={visibleCount === services.length}>
        {services.map((service, index) => (
          <button key={service.icon} id={`service-tab-${index}`} type="button" role="tab"
            aria-label={service.title} title={service.title} aria-selected={index >= active && index < active + visibleCount}
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
      <div ref={viewport} className="dashboard-grid" style={{ "--visible-services": visibleCount } as CSSProperties} onScroll={(event) => {
        const element = event.currentTarget;
        setActive(Math.max(0, Math.min(services.length - visibleCount, Math.round(element.scrollLeft / ((element.clientWidth + 10) / visibleCount)))));
      }}>
        {Children.toArray(children).map((child, index) => (
          <div key={services[index].icon} id={`service-panel-${index}`} className="service-panel"
            role="tabpanel" aria-labelledby={`service-tab-${index}`}
            inert={index < active || index >= active + visibleCount}>
            {child}
          </div>
        ))}
      </div>
    </>
  );
}
