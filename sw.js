self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || 'Ahla Akla', {
    body: data.body || 'A new order has arrived.',
    icon: '/placeholder-food.svg',
    badge: '/placeholder-food.svg',
    tag: data.orderNumber || 'ahla-akla-order',
    data: { url: data.url || '/admin' },
    requireInteraction: true
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/admin', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(openClients => {
    const existing = openClients.find(client => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus().then(() => existing.navigate(target));
    return clients.openWindow(target);
  }));
});
