import { supabase } from './supabaseClient';

const backendUrl = (import.meta.env.VITE_AI_BACKEND_URL as string | undefined) || 'http://localhost:8080';

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/**
 * Standardized API client for all backend calls to the AI/Logic backend.
 * Automatically handles Supabase session retrieval and token injection.
 */
export async function apiClient(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Automatically set Content-Type to JSON if sending a body and it's not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // Attempt to extract error message from JSON or text
    let errorMsg: string;
    try {
      const json = await res.clone().json();
      errorMsg = json.error || json.message || json.fields ? JSON.stringify(json.fields) : '';
    } catch {
      errorMsg = await res.clone().text().catch(() => '');
    }
    
    throw new Error(errorMsg || `API backend error (${res.status})`);
  }

  return res;
}
