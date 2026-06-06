export const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

const HOST_WITH_PORT_RE = /^[^/\s:]+:\d+(?:[/?#]|$)/;
const EXPLICIT_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;
const EXPLICIT_URL_SCHEME_RE = /^[a-z][a-z\d+.-]*:\/\//i;

export const normalizeHttpUrl = (value) => {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  if (EXPLICIT_URL_SCHEME_RE.test(raw) && !/^https?:\/\//i.test(raw)) {
    return null;
  }

  if (EXPLICIT_SCHEME_RE.test(raw) && !HOST_WITH_PORT_RE.test(raw) && !/^https?:\/\//i.test(raw)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (!SUPPORTED_PROTOCOLS.has(url.protocol) || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const getOriginPattern = (value) => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;

  const url = new URL(normalized);
  return `${url.protocol}//${url.host}/*`;
};

export const getDisplayHost = (value) => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return '';

  const url = new URL(normalized);
  return url.hostname.replace(/^www\./i, '');
};

export const createSiteFromUrl = (url, fallbackName = '', fallbackIcon = '🌐') => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return null;

  const name = typeof fallbackName === 'string' && fallbackName.trim()
    ? fallbackName.trim()
    : getDisplayHost(normalized) || normalized;

  const icon = typeof fallbackIcon === 'string' && fallbackIcon.trim()
    ? fallbackIcon.trim()
    : '🌐';

  return { name, icon, url: normalized };
};
