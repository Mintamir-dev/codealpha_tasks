import { TOKEN_KEY } from '../constants';

const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** { fieldName: message } from the server's validation details. */
  fieldErrors() {
    const out = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details) if (d.field && !out[d.field]) out[d.field] = d.message;
    }
    return out;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function toQueryString(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function request(method, path, { body, query } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE}${path}${toQueryString(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // empty or non-JSON body
  }

  if (!response.ok) {
    const e = (data && data.error) || {};
    // An expired or invalid token: sign the user out. (A wrong password on the log-in form is a different code.)
    if (response.status === 401 && token && e.code === 'TOKEN_INVALID' && onUnauthorized) onUnauthorized();
    throw new ApiError(response.status, e.code || 'ERROR', e.message || 'Something went wrong. Try again.', e.details);
  }
  return data;
}
