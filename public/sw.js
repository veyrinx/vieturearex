const ICON_URL = "https://ik.imagekit.io/uqjrsrvfw/aeec4733da0d58b9ff27750f74c71f8a.jpeg?updatedAt=1776365051398";

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Arex", {
      body: data.body ?? "",
      icon: data.icon ?? ICON_URL,
      badge: ICON_URL,
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? "/")
  );
});
