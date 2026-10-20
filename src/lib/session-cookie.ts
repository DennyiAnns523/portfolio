// Shared by the edge middleware and the Node server code, so it must not import Node APIs.

// The __Host- prefix makes browsers refuse the cookie unless it is Secure, host-only and Path=/.
// Plain-HTTP localhost can't set Secure cookies in every browser, so dev uses a plain name.
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pf_session' : 'pf_session';

export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
