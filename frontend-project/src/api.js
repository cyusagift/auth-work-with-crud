async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers, signal } = options;

  const response = await fetch(path, {
    method,
    headers: {
      ...(body != null ? { 'Content-Type': 'application/json' } : null),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
  });

  if (response.status === 204) return null;

  const data = await readJsonSafe(response);

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `${response.status} ${response.statusText}`.trim();
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function getHealth() {
  return apiRequest('/health');
}

export function listServices() {
  return apiRequest('/api/services');
}

export function createService(service) {
  return apiRequest('/api/services', { method: 'POST', body: service });
}

export function updateService(serviceCode, updates) {
  return apiRequest(`/api/services/${encodeURIComponent(serviceCode)}`, {
    method: 'PUT',
    body: updates,
  });
}

export function deleteService(serviceCode) {
  return apiRequest(`/api/services/${encodeURIComponent(serviceCode)}`, {
    method: 'DELETE',
  });
}

// Authentication API functions
export function register(username, password) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { username, password }
  });
}

export function login(username, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { username, password }
  });
}

export function logout() {
  return apiRequest('/api/auth/logout', {
    method: 'POST'
  });
}

export function getCurrentUser() {
  return apiRequest('/api/auth/me');
}

