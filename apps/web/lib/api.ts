const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';


interface RequestOptions extends RequestInit {
  data?: any;
}

export const apiFetch = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Always send HttpOnly cookies
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || 'Something went wrong');
  }

  return json.data as T;
};
