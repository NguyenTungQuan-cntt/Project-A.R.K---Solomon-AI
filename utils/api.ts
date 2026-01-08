// src/utils/api.ts

// --- CẤU HÌNH URL ---
const BACKEND_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// Định nghĩa các Endpoint
const ENDPOINTS = {
  CHAT: `${BACKEND_BASE_URL}/chat`,
  VALIDATE_TOKEN: `${BACKEND_BASE_URL}/validate-token`,
  GENERATE_IMAGE: `${BACKEND_BASE_URL}/generate-image`,
  GENERATE_VIDEO: `${BACKEND_BASE_URL}/generate-video`,
  GENERATE_RESEARCH: `${BACKEND_BASE_URL}/generate-research`,
  GENERATE_AUDIO: `${BACKEND_BASE_URL}/generate-audio`,
  CREATE_AGENT: `${BACKEND_BASE_URL}/create-agent`,
  LIST_AGENTS: `${BACKEND_BASE_URL}/list-agents`,
  DELETE_AGENT: `${BACKEND_BASE_URL}/delete-agent`,
};

// --- INTERFACES ---

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Agent {
  agentId: string;
  name: string;
  instruction: string;
  description: string;
}

interface BackendErrorResponse {
  error?: string;
  message?: string;
}

interface ValidateTokenResult {
  valid: boolean;
  message: string;
}

// --- HÀM TRỢ GIÚP (HELPERS) ---

/**
 * Tạo chuỗi mô tả file đính kèm để nối vào prompt.
 */
const createAttachmentDescription = (attachments?: Attachment[]): string => {
  if (!attachments || attachments.length === 0) return '';
  return attachments
    .map(att => `[FILE: ${att.name}, ${(att.size / 1024 / 1024).toFixed(2)}MB, ${att.type}]`)
    .join(' ');
};

/**
 * Hàm xử lý phản hồi từ Fetch.
 * Tự động ném lỗi nếu status code không phải 200-299.
 */
const handleResponse = async <T>(response: Response, endpointName: string): Promise<T> => {
  // 1. Nếu thành công (200 OK)
  if (response.ok) {
    try {
      return await response.json();
    } catch (e) {
      console.error(`Lỗi parse JSON từ ${endpointName}:`, e);
      throw new Error(`Dữ liệu trả về từ server không hợp lệ (${endpointName}).`);
    }
  }

  // 2. Nếu thất bại (4xx, 5xx) -> Cố gắng đọc body JSON để lấy message
  let errorMessage = `Lỗi ${response.status}: ${response.statusText}`;
  try {
    const errorData: BackendErrorResponse = await response.json();
    // Flask thường trả về { error: "..." } hoặc { message: "..." }
    if (errorData.error) errorMessage = errorData.error;
    else if (errorData.message) errorMessage = errorData.message;
  } catch (e) {
    // Không đọc được JSON lỗi -> Giữ nguyên message mặc định
    console.warn(`Không thể đọc chi tiết lỗi từ backend ${endpointName}.`);
  }

  // Xử lý các mã lỗi đặc thù để UI hiển thị thân thiện hơn
  if (response.status === 429) {
    errorMessage = "Hệ thống đang quá tải (Rate Limit). Vui lòng thử lại sau giây lát.";
  } else if (response.status === 401) {
    errorMessage = "Phiên làm việc hết hạn hoặc API Key không hợp lệ.";
  } else if (response.status === 500) {
    errorMessage = `Lỗi nội bộ Server (500). Chi tiết: ${errorMessage}`;
  }

  console.error(`API Error [${endpointName}]:`, errorMessage);
  throw new Error(errorMessage);
};

/**
 * Wrapper cho fetch để bắt lỗi mạng (CORS, Server down).
 */
const safeFetch = async (url: string, options: RequestInit, endpointName: string): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // Lỗi này xảy ra khi không kết nối được server (Server tắt, sai PORT, hoặc bị chặn CORS)
    console.error(`Network Error tại ${endpointName}:`, error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Không thể kết nối đến Server. Vui lòng kiểm tra: Server đã bật chưa? Cấu hình CORS đúng chưa?");
    }
    throw error;
  }
};

// --- CÁC HÀM API CHÍNH ---

/**
 * 1. Validate Token
 * Hàm này KHÔNG ném lỗi (throw), nó luôn trả về object kết quả để UI xử lý.
 */
export const validateToken = async (): Promise<ValidateTokenResult> => {
  try {
    const response = await safeFetch(ENDPOINTS.VALIDATE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Gửi body rỗng để trigger check
    }, 'validateToken');

    if (response.ok) {
      const data = await response.json();
      return { 
        valid: data.valid === true, 
        message: data.message || "Token hợp lệ." 
      };
    } else {
      // Nếu server trả về 401/403/500
      let msg = `Lỗi xác thực (${response.status})`;
      try {
        const errData = await response.json();
        msg = errData.message || errData.error || msg;
      } catch {}
      return { valid: false, message: msg };
    }
  } catch (error: any) {
    return { valid: false, message: error.message || "Lỗi kết nối khi kiểm tra token." };
  }
};

/**
 * 2. Chat endpoint
 */
export const fetchAIResponse = async (
  userMessage: string,
  attachments?: Attachment[],
  targetAgentId?: string
): Promise<string> => {
  if (!userMessage.trim()) throw new Error("Tin nhắn không được để trống.");

  const fullPrompt = `${userMessage} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: fullPrompt, attachments, targetAgentId }),
  }, 'chat');

  const data = await handleResponse<{ response: string }>(response, 'chat');
  
  // Clean dữ liệu rác nếu có
  return data.response ? data.response.replace(/\.undefined$/, '') : "";
};

/**
 * 3. Create Agent
 */
export const fetchAgentResponse = async (
  instruction: string,
  attachments?: Attachment[]
): Promise<Agent> => {
  const fullInstruction = `${instruction} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.CREATE_AGENT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction: fullInstruction, attachments }),
  }, 'createAgent');

  const data = await handleResponse<Agent>(response, 'createAgent');
  return data;
};

/**
 * 4. Generate Image
 */
export const fetchImageResponse = async (
  prompt: string,
  attachments?: Attachment[]
): Promise<{ description: string; imageUrl: string }> => {
  const fullPrompt = `${prompt} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.GENERATE_IMAGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt, attachments }),
  }, 'generateImage');

  return handleResponse<{ description: string; imageUrl: string }>(response, 'generateImage');
};

/**
 * 5. Generate Video
 */
export const fetchVideoResponse = async (
  prompt: string,
  attachments?: Attachment[]
): Promise<{ description: string; videoUrl: string; thumbnailUrl?: string }> => {
  const fullPrompt = `${prompt} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.GENERATE_VIDEO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt, attachments }),
  }, 'generateVideo');

  return handleResponse<{ description: string; videoUrl: string; thumbnailUrl?: string }>(response, 'generateVideo');
};

/**
 * 6. Generate Research
 */
export const fetchResearchResponse = async (
  topic: string,
  attachments?: Attachment[]
): Promise<{ summary: string }> => {
  const fullTopic = `${topic} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.GENERATE_RESEARCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: fullTopic, attachments }),
  }, 'generateResearch');

  return handleResponse<{ summary: string }>(response, 'generateResearch');
};

/**
 * 7. Generate Audio
 */
export const fetchAudioResponse = async (
  prompt: string,
  attachments?: Attachment[]
): Promise<{ description: string; audioUrl?: string }> => {
  const fullPrompt = `${prompt} ${createAttachmentDescription(attachments)}`.trim();

  const response = await safeFetch(ENDPOINTS.GENERATE_AUDIO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt, attachments }),
  }, 'generateAudio');

  return handleResponse<{ description: string; audioUrl?: string }>(response, 'generateAudio');
};

/**
 * 8. List Agents
 */
export const listActiveAgents = async (): Promise<Agent[]> => {
  const response = await safeFetch(ENDPOINTS.LIST_AGENTS, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, 'listAgents');

  const data = await handleResponse<{ agents: Agent[] }>(response, 'listAgents');
  return data.agents || [];
};

/**
 * 9. Delete Agent
 */
export const deleteAgent = async (agentId: string): Promise<void> => {
  const response = await safeFetch(`${ENDPOINTS.DELETE_AGENT}/${agentId}`, {
    method: 'DELETE',
  }, 'deleteAgent');

  await handleResponse(response, 'deleteAgent');
};