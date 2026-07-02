export async function requestSystemNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported" as const;
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

export async function showSystemNotification(
  title: string,
  options?: NotificationOptions
) {
  const permission = await requestSystemNotificationPermission();

  if (permission !== "granted") {
    return;
  }

  new Notification(title, options);
}
