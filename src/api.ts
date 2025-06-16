// @ts-ignore
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
})

// Attach auth header automatically
api.interceptors.request.use((config: any) => {
  config.headers = {
    ...config.headers,
    Authorization: 'Bearer pleasantcove2024admin',
  }
  return config
})

export default api 