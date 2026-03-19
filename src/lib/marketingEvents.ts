/**
 * First-party marketing event tracking (Elias approved 2026-03-05)
 * See docs/MARKETING_TRACKING_PLAN.md
 */

type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function getUtmParams(): UtmParams {
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') || undefined;
  const utm_medium = params.get('utm_medium') || undefined;
  const utm_campaign = params.get('utm_campaign') || undefined;
  const utm_content = params.get('utm_content') || undefined;
  if (!utm_source && !utm_medium && !utm_campaign && !utm_content) return {};
  return { utm_source, utm_medium, utm_campaign, utm_content };
}

function getDevice(): 'mobile' | 'desktop' {
  return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function getSessionId(): string {
  const key = 'vck_mkt_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function sendEvent(payload: Record<string, unknown>): void {
  fetch('/api/marketing/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function trackPageView(url?: string, referrer?: string): void {
  const path = url || window.location.pathname || '/';
  const ref = referrer ?? (document.referrer || undefined);
  sendEvent({
    type: 'page_view',
    url: path,
    referrer: ref || undefined,
    device: getDevice(),
    sessionId: getSessionId(),
    ...getUtmParams(),
  });
}

export function trackCtaClick(buttonId: string, section?: string): void {
  sendEvent({
    type: 'cta_click',
    url: window.location.pathname || '/',
    device: getDevice(),
    sessionId: getSessionId(),
    buttonId,
    section: section || undefined,
    ...getUtmParams(),
  });
}

export function trackFormSubmit(url?: string): void {
  sendEvent({
    type: 'form_submit',
    url: url || window.location.pathname || '/',
    device: getDevice(),
    sessionId: getSessionId(),
    ...getUtmParams(),
  });
}

export function trackCheckoutStart(tier: 'creator' | 'pro', url?: string): void {
  sendEvent({
    type: 'checkout_start',
    url: url || window.location.pathname || '/',
    device: getDevice(),
    sessionId: getSessionId(),
    tier,
    ...getUtmParams(),
  });
}
