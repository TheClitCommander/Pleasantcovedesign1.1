// @ts-ignore
import axios from 'axios'

// Unified API URL configuration
const getApiBaseUrl = () => {
  // Check for environment variable first (Vite uses import.meta.env)
  const env = (import.meta as any).env;
  if (env?.VITE_API_URL) {
    return `${env.VITE_API_URL}/api`;
  }
  
  // Auto-detect based on current environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'; // Local development
    }
  }
  return 'https://pleasantcovedesign-production.up.railway.app/api'; // Production fallback
};

// Export base URL for WebSocket connections
export const getWebSocketUrl = () => {
  const env = (import.meta as any).env;
  if (env?.VITE_WS_URL) {
    return env.VITE_WS_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000'; // Local development
    }
  }
  return 'https://pleasantcovedesign-production.up.railway.app'; // Production fallback
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
})

// Unified token management
let cachedAdminToken: string | null = null;

const getAdminToken = async (): Promise<string> => {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }
  
  try {
    const response = await axios.post(`${getApiBaseUrl()}/token`, {
      type: 'admin'
    }, {
      headers: {
        'Authorization': 'Bearer pleasantcove2024admin'
      }
    });
    
    if (response.data.valid) {
      cachedAdminToken = response.data.token;
      return response.data.token;
    }
  } catch (error) {
    console.error('Failed to get admin token:', error);
    // Fallback to direct token
    cachedAdminToken = 'pleasantcove2024admin';
  }
  
  return 'pleasantcove2024admin';
};

// Attach auth header automatically with unified token
api.interceptors.request.use(async (config: any) => {
  const token = await getAdminToken();
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  }
  return config
})

export default api 