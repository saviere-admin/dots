self.addEventListener('push', (event) => {
  let data = { title: 'dots.', body: 'A new product update is available.' };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: './public/brand/logos/icon/dots-icon.svg',
    badge: './public/brand/logos/icon/dots-icon.svg',
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './'));
});
