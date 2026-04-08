'use client';

// Lightweight, non-blocking analytics tracker.
// Uses sendBeacon (fire-and-forget) so it never delays page loads or interactions.

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('livev_sid');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('livev_sid', id);
  }
  return id;
}

export function track(event: string, metadata?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    event,
    page: window.location.pathname,
    sessionId: getSessionId(),
    metadata: metadata || null,
  });

  // sendBeacon is non-blocking and survives page unloads
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/track', payload);
  } else {
    // Fallback: fire-and-forget fetch
    fetch('/api/analytics/track', {
      method: 'POST',
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
