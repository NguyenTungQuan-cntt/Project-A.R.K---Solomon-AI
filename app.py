import os
import uuid
import logging
import gc
import shutil
import traceback
import requests
import time
import urllib.parse
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types
from google.api_core import exceptions as google_exceptions

# --- 1. CẤU HÌNH HỆ THỐNG ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS chi tiết: Cho phép tất cả các nguồn phổ biến và domain chính thức
CORS(app, resources={r"/*": {
    "origins": [
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://192.168.243.20:3000", 
        "http://192.168.1.9:3000", 
        "http://chat.solomon.com"
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

PORT = int(os.getenv('PORT', 5001))
DEBUG_MODE = os.getenv('DEBUG', 'True').lower() == 'true'

# Đường dẫn lưu trữ tuyệt đối
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_VAULT = os.path.join(BASE_DIR, 'static', 'ai_vault')
TEMP_PROCESSING = os.path.join(BASE_DIR, 'temp_processing')

for folder in [STATIC_VAULT, TEMP_PROCESSING]:
    os.makedirs(folder, exist_ok=True)

# Model IDs
# --- MODEL GOOGLE GEMINI ---
MODEL_FLASH = "gemini-2.5-flash-lite" 
MODEL_PRO = "gemini-2.5-flash" 

# --- MODEL POLLINATIONS AI ---
P_MODEL_IMAGE = "demo-api-key-media"          # Model vẽ ảnh nghệ thuật, chi tiết nhất
P_MODEL_VIDEO = "demo-api-key-media"         # Model tốc độ cao, dùng cho hiệu ứng video/animation
P_MODEL_REALISM = "demo-api-key-media" # Model chuyên ảnh chụp người thật

# --- 2. SOLOMON SHIELD (QUẢN LÝ KEY) ---
class SolomonShield:
    def __init__(self):
        all_keys = [os.getenv(f"GEMINI_FLASH_KEY_{i}", "").strip() for i in range(1, 8)]
        self.flash_pool = [k for k in all_keys[:4] if k]
        self.pro_pool = [k for k in all_keys[4:7] if k]
        self.poll_key = os.getenv("POLLINATIONS_API_KEY_1", "").strip()
        self.flash_idx = 0
        self.pro_idx = 0
        self.blacklist = {}

    def get_client(self, prefer_pro=False):
        pool = self.pro_pool if (prefer_pro and self.pro_pool) else self.flash_pool
        p_type = "PRO" if (prefer_pro and self.pro_pool) else "FLASH"
        
        for _ in range(len(pool)):
            if p_type == "PRO":
                key = pool[self.pro_idx]
                idx = self.pro_idx + 5
                self.pro_idx = (self.pro_idx + 1) % len(pool)
            else:
                key = pool[self.flash_idx]
                idx = self.flash_idx + 1
                self.flash_idx = (self.flash_idx + 1) % len(pool)

            if self.blacklist.get(key, datetime.now()) <= datetime.now():
                try:
                    client = genai.Client(api_key=key, http_options={'api_version': 'v1beta'})
                    return client, key, idx, p_type
                except: continue
        return None, None, None, None

    def ban_key(self, key, duration=30):
        self.blacklist[key] = datetime.now() + timedelta(seconds=duration)

shield = SolomonShield()

# --- 3. EPHEMERAL AGENT ---
class EphemeralAgent:
    def __init__(self, task_type, is_complex=False):
        self.task_type = task_type
        # Chat phức tạp hoặc có file thì ưu tiên dùng Flash (PRO tier pool)
        prefer_pro = True if (task_type == 'chat' and is_complex) else False
        self.client, self.key, self.key_idx, self.p_type = shield.get_client(prefer_pro)

    def run(self, prompt, processed_files=None):
        if not self.client:
            raise RuntimeError("Hệ thống hiện tại đang quá tải key API.")

        try:
            # --- LUỒNG 1: CHAT VÀ PHÂN TÍCH FILE (IMAGE/VIDEO) ---
            if self.task_type == 'chat':
                final_contents = []
                if processed_files:
                    for f in processed_files:
                        if "video" in f.mime_type:
                            # Đợi video Active
                            while True:
                                s = self.client.files.get(name=f.name)
                                if s.state.name == "ACTIVE": break
                                if s.state.name == "FAILED": raise RuntimeError("Video lỗi.")
                                time.sleep(2)
                            final_contents.append(s)
                        else:
                            final_contents.append(f)
                
                final_contents.append(prompt)
                
                # Instruction đảm bảo trả lời đúng trọng tâm
                target_model = MODEL_PRO if self.p_type == "PRO" else MODEL_FLASH
                res = self.client.models.generate_content(
                    model=target_model,
                    contents=final_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=(
                            "Bạn là Solomon AI. Trả lời CHÍNH XÁC, ĐÚNG TRỌNG TÂM câu hỏi. "
                            "Nếu có ảnh/video, hãy phân tích trực quan một cách sắc bén. "
                            "Không trả lời lan man, tập trung vào giá trị thông tin người dùng cần."
                        ),
                        temperature=0.1,
                        top_p=0.9
                    )
                )
                return res.text.strip() if res.text else "Solomon chưa thể xác định câu trả lời."

            # --- LUỒNG 2: TẠO ẢNH / VIDEO (SỬ DỤNG POLLINATIONS) ---
            elif self.task_type in ['image', 'video']:
                # 1. Luôn có văn bản mặc định
                ai_text = f"Đang dùng model {P_MODEL_IMAGE if self.task_type=='image' else P_MODEL_VIDEO} để tạo cho bạn!"

                # 2. Lấy văn bản từ Gemini (Nếu Gemini sập, dùng văn bản mặc định trên)
                try:
                    text_gen = self.client.models.generate_content(
                        model=MODEL_FLASH,
                        contents=[f"Viết 1 câu ngắn gọn báo bạn đang tạo {self.task_type}: {prompt}"]
                    )
                    if text_gen and hasattr(text_gen, 'text') and text_gen.text:
                        ai_text = text_gen.text.strip()
                    else:
                        ai_text = f"Solomon đang tạo {self.task_type} cho bạn dựa trên mô tả!"
                except: pass 

                # 3. Gọi API Pollinations
                selected_model = P_MODEL_IMAGE if self.task_type == 'image' else P_MODEL_VIDEO
                safe_prompt = urllib.parse.quote(prompt)
                url = f"https://image.pollinations.ai/prompt/{safe_prompt}?model={selected_model}&width=1024&height=1024&nologo=true&enhance=true&seed={uuid.uuid4().int}"

                try:
                    # 1. Tạo headers chứa Key (Lấy từ shield.poll_key đã thêm ở bước trước)
                    # Nếu không có key thì để dict rỗng {}
                    headers = {"Authorization": f"Bearer {shield.poll_key}"} if getattr(shield, 'poll_key', None) else {}

                    # 2. Quan trọng: Truyền tham số headers=headers vào đây
                    resp = requests.get(url, headers=headers, timeout=30)
                    
                    if resp.status_code == 200 and len(resp.content) > 5000:
                        return {"text": ai_text, "media_bytes": resp.content}
                except Exception as e:
                    logger.error(f"❌ Pollinations Error: {e}")

                # 4. Fallback: Luôn trả về text để tránh bong bóng chat trống
                return {"text": ai_text, "media_bytes": None, "error_msg": "Media tạm thời không khả dụng"}

        except Exception as e:
            logger.error(f"Agent Error: {str(e)}")
            raise e
        finally:
            self.client = None
            gc.collect()

# --- 4. ENDPOINTS ---

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    try:
        msg = request.form.get('message', '').strip() or (request.json.get('message', '') if request.is_json else '')
        files = request.files.getlist('files')
        
        is_complex = len(msg) > 120 or len(files) > 0
        agent = EphemeralAgent('chat', is_complex=is_complex)
        
        uploaded_files = []
        for f in files:
            if f and f.filename:
                path = os.path.join(TEMP_PROCESSING, f"{uuid.uuid4()}_{f.filename}")
                f.save(path)
                try:
                    g_file = agent.client.files.upload(path=path)
                    uploaded_files.append(g_file)
                finally:
                    if os.path.exists(path): os.remove(path)

        response = agent.run(msg, uploaded_files)
        return jsonify({"response": response, "status": "success"})
    except Exception as e:
        logger.error(f"‼️ LỖI CHAT CHI TIẾT:\n{traceback.format_exc()}")
        return jsonify({"error": str(e), "status": "error"}), 500

@app.route('/generate-media', methods=['POST', 'OPTIONS'])
@app.route('/generate-image', methods=['POST', 'OPTIONS'])
@app.route('/generate-video', methods=['POST', 'OPTIONS'])
def generate_media():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json() or request.form
        prompt = data.get('prompt', '').strip()
        mode = data.get('mode', 'image')
        if not prompt: return jsonify({"response": "Hãy nhập mô tả cho ảnh/video!"}), 400

        agent = EphemeralAgent(mode)
        result = agent.run(prompt)
        
        final_text = result.get("text")
        media_bytes = result.get("media_bytes")
        image_url = ""

        if media_bytes:
            filename = f"ai_{uuid.uuid4().hex[:8]}.png"
            with open(os.path.join(STATIC_VAULT, filename), "wb") as f:
                f.write(media_bytes)
            image_url = f"{request.host_url.rstrip('/')}/static/ai_vault/{filename}"

        return jsonify({
            "response": final_text or "Solomon đã nhận được yêu cầu và đang xử lý...",
            "url": image_url or "", # Trả về chuỗi rỗng thay vì None để tránh lỗi Frontend
            "status": "success" if image_url else "text_only"
        }), 200
    except Exception as e:
        logger.error(f"‼️ TRACEBACK MEDIA:\n{traceback.format_exc()}")
        return jsonify({
            "response": f"Solomon gặp sự cố kỹ thuật: {str(e)}",
            "url": "",
            "status": "error"
        }), 200

@app.route('/static/ai_vault/<path:filename>')
def serve_file(filename):
    return send_from_directory(STATIC_VAULT, filename)

if __name__ == '__main__':
    shutil.rmtree(TEMP_PROCESSING, ignore_errors=True)
    os.makedirs(TEMP_PROCESSING, exist_ok=True)
    app.run(debug=DEBUG_MODE, host='0.0.0.0', port=PORT, threaded=True)
