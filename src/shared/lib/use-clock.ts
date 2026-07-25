"use client";

import { useEffect, useState } from "react";

export function useClock(locale = "ru-RU") {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const update = () => setCurrentTime(formatter.format(new Date()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [locale]);

  return currentTime;
}
