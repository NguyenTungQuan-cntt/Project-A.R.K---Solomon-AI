// src/config/config.ts
export const config = {
  // Simulated delay for AI response in milliseconds
  aiResponseDelay: parseInt(process.env.REACT_APP_AI_DELAY || '1000', 10),
  // Example API base URL from environment
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://192.168.126.20:3000',
  backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000/',
};