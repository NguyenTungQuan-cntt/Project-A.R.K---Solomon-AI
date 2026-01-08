// src/utils/tokenValidation.ts

const BACKEND_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
const VALIDATE_TOKEN_URL = `${BACKEND_BASE_URL}/validate-token`;

interface ValidateTokenResponse {
  valid: boolean;
  message: string;
}

export const validateGeminiToken = async (apiKey?: string): Promise<ValidateTokenResponse> => {
  try {
    const requestBody: { apiKey?: string } = {};
    // Nếu truyền apiKey vào, gửi lên backend để kiểm tra
    // (Không an toàn cho production, nhưng hữu ích cho dev nếu cần nhập từ UI)
    if (apiKey) {
        requestBody.apiKey = apiKey;
    }
    // Nếu không truyền apiKey, backend sẽ kiểm tra key từ .env

    const response = await fetch(VALIDATE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Nếu backend trả lỗi (ví dụ 500), cố gắng parse message
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        console.warn("Không thể parse lỗi từ backend khi validate token:", parseError);
        errorMessage = `HTTP error! status: ${response.status} - ${response.statusText}`;
      }
      console.error("Lỗi từ backend khi validate token:", errorMessage);
      return { valid: false, message: errorMessage };
    }

    const data = await response.json();
    // Giả sử backend trả về { valid: boolean, message: string }
    if (typeof data.valid === 'boolean' && typeof data.message === 'string') {
      return data;
    } else {
      console.error("Phản hồi từ backend khi validate token không đúng định dạng:", data);
      return { valid: false, message: "Phản hồi từ máy chủ không hợp lệ." };
    }
  } catch (error) {
    console.error("Lỗi mạng hoặc lỗi khi gọi backend để validate token:", error);
    return { valid: false, message: "Lỗi mạng khi kiểm tra token." };
  }
};