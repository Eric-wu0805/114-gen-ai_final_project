import os
import json
import requests
from flask import Flask, request, jsonify, send_from_directory, Response
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import database
from agent import run_agent_workflow, load_memory, save_memory

load_dotenv()

app = Flask(__name__, static_folder='static')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize DB on start
database.init_db()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/plan', methods=['POST'])
def plan_itinerary():
    data = request.json or {}
    prompt = data.get('prompt', '')
    api_key_override = data.get('api_key', '')
    
    if not prompt:
        return jsonify({"success": False, "error": "請輸入規劃需求！"}), 400
        
    # Get API key (prioritize override, then .env)
    api_key = api_key_override or os.getenv('GOOGLE_API_KEY', '')
    
    # Load long-term memory
    memory = load_memory()
    
    # Run Agent Core
    result = run_agent_workflow(prompt, api_key, memory)
    
    return jsonify(result)

@app.route('/api/upload_doc', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "沒有上傳檔案"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "未選擇任何檔案"}), 400
        
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Real analysis of the document using Gemini API
    file_ext = os.path.splitext(filename)[1].lower()
    parsed_context = f"已成功上傳檔案「{filename}」。"
    
    # Try to read text
    file_content = ""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            file_content = f.read()
    except Exception:
        parsed_context += "（注意：無法讀取文字內容，僅保留檔案）"
        
    api_key = os.getenv('GOOGLE_API_KEY', '')
    
    if api_key and len(file_content) > 5:
        system_prompt = """You are a travel preference analyzer. Read the user's travel diary or receipt and extract preferences.
You MUST output valid JSON exactly matching this format:
{
  "budget_sensitivity": "High (5,000 NTD limit)" or "Medium" or "Low" or "None",
  "accommodation_pref": "Hostel (cheap)" or "Hotel (standard)" or "None",
  "interests": ["keyword1", "keyword2"],
  "summary": "一小段繁體中文總結這位使用者的旅行風格"
}"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"User Document:\n{file_content[:3000]}"}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {"responseMimeType": "application/json"}
        }
        
        import time
        max_retries = 10
        for attempt in range(max_retries):
            try:
                resp = requests.post(url, json=payload, timeout=10)
                if resp.status_code == 200:
                    res_json = resp.json()
                    text_response = res_json['candidates'][0]['content']['parts'][0]['text']
                    analysis = json.loads(text_response, strict=False)
                    
                    # Update memory
                    mem = load_memory()
                    if "budget_sensitivity" in analysis: mem["budget_sensitivity"] = analysis["budget_sensitivity"]
                    if "accommodation_pref" in analysis: mem["accommodation_pref"] = analysis["accommodation_pref"]
                    if "interests" in analysis and isinstance(analysis["interests"], list):
                        mem["interests"].extend([i for i in analysis["interests"] if i not in mem["interests"]])
                    save_memory(mem)
                    
                    summary = analysis.get("summary", "成功萃取旅遊偏好。")
                    parsed_context = f"已成功上傳檔案「{filename}」。AI 分析完成：{summary}"
                    break
                else:
                    if attempt == max_retries - 1:
                        parsed_context += f"（系統忙碌中，API 回應錯誤碼 {resp.status_code}，請稍後再試。）"
                    time.sleep(2)
            except Exception as e:
                if attempt == max_retries - 1:
                    parsed_context += "（連線異常，無法解析檔案。）"
                time.sleep(2)
    elif not api_key:
        parsed_context += "（因未提供 API Key，跳過 AI 語意分析）"
        
    return jsonify({
        "success": True, 
        "filename": filename,
        "message": parsed_context,
        "suggested_prompt": "我上傳了過往旅行的記錄，請根據我最新的記憶偏好，幫我規劃新的行程。"
    })

@app.route('/api/download_itinerary', methods=['POST'])
def download_itinerary():
    data = request.json or {}
    itinerary_md = data.get('itinerary', '')
    if not itinerary_md:
        return "沒有行程資料可用", 400
        
    response = Response(itinerary_md, mimetype='text/markdown')
    response.headers.set("Content-Disposition", "attachment", filename="travel_itinerary.md")
    return response

@app.route('/api/memory', methods=['GET'])
def get_user_memory():
    return jsonify(load_memory())

@app.route('/api/memory', methods=['POST'])
def update_user_memory():
    data = request.json or {}
    save_memory(data)
    return jsonify({"success": True, "message": "記憶更新成功！"})

@app.route('/api/clear_memory', methods=['POST'])
def clear_user_memory():
    empty_mem = {
        "destination_history": [],
        "budget_sensitivity": "None",
        "accommodation_pref": "None",
        "interests": [],
        "dietary": "None"
    }
    save_memory(empty_mem)
    return jsonify({"success": True, "message": "記憶已清除！"})

if __name__ == '__main__':
    # Running on port 8000 for local test
    app.run(host='127.0.0.1', port=8000, debug=True)
