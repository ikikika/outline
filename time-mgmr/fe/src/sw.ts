/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  })
)

self.skipWaiting()
clientsClaim()

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {
    title: 'Tempo',
    body: 'You have a new notification.',
    url: '/',
  }

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() }
    }
  } catch {
    const text = event.data?.text()
    if (text) {
      payload = { ...payload, body: text }
    }
  }

  const title = payload.title ?? 'Tempo'
  const options: NotificationOptions = {
    body: payload.body,
    data: { url: payload.url ?? '/' },
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl =
    typeof event.notification.data?.url === 'string'
      ? event.notification.data.url
      : '/'

  event.waitUntil(
    (async () => {
      const url = new URL(targetUrl, self.location.origin).href
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await client.navigate(url)
          }
          return
        }
      }

      await self.clients.openWindow(url)
    })()
  )
})
