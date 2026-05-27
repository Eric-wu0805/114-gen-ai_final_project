import os
import json
from flask import Flask, request, jsonify, send_from_directory, Response
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import database
from agent import run_agent_workflow, load_memory, save_memory, adjust_itinerary_workflow

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

@app.route('/api/chat_adjust', methods=['POST'])
def adjust_itinerary():
    data = request.json or {}
    prompt = data.get('prompt', '')
    current_itinerary = data.get('current_itinerary', '')
    current_budget = data.get('current_budget', {})
    current_map_points = data.get('current_map_points', [])
    api_key_override = data.get('api_key', '')
    
    if not prompt or not current_itinerary:
        return jsonify({"success": False, "error": "缺少必要之微調對話或當前行程資訊！"}), 400
        
    api_key = api_key_override or os.getenv('GOOGLE_API_KEY', '')
    
    result = adjust_itinerary_workflow(
        prompt,
        current_itinerary,
        current_budget,
        current_map_points,
        api_key
    )
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
    
    # Mock analysis of the document
    file_ext = os.path.splitext(filename)[1].lower()
    parsed_context = ""
    
    if 'hotel' in filename.lower() or '飯店' in filename:
        parsed_context = "已成功解析過往訂單：預約了「台中精品商務飯店」，每晚房價 2,500 元。"
    elif 'itinerary' in filename.lower() or '行程' in filename:
        parsed_context = "已成功解析過往行程：包含逢甲夜市、一中商圈等餐飲偏好。"
    else:
        parsed_context = f"已成功上傳並分析檔案「{filename}」。系統已提取相關歷史旅行偏好偏向預算敏感型。"
        
    return jsonify({
        "success": True, 
        "filename": filename,
        "message": parsed_context,
        "suggested_prompt": "我上傳了過往旅行的記錄。請幫我規劃台中兩天一夜之旅，預算 5,000 元，住宿要便宜，並參考我喜歡夜市與 AI 科技景點的偏好。"
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

@app.route('/api/alternative_spots', methods=['POST'])
def get_alternative_spots():
    data = request.json or {}
    city = data.get('city', '')
    spot_name = data.get('spot_name', '')
    api_key_override = data.get('api_key', '')
    
    if not city or not spot_name:
        return jsonify({"success": False, "error": "缺少城市或景點名稱！"}), 400
        
    api_key = api_key_override or os.getenv('GOOGLE_API_KEY', '')
    
    from agent import get_alternative_spots_from_gemini
    result = get_alternative_spots_from_gemini(city, spot_name, api_key)
    
    return jsonify(result)

@app.route('/api/share_trip', methods=['POST'])
def share_trip():
    import uuid
    from database import save_shared_trip
    data = request.json or {}
    city = data.get('city', '')
    itinerary = data.get('itinerary', '')
    budget_data = data.get('budget_data', {})
    map_points = data.get('map_points', [])
    exchange_rate = data.get('exchange_rate', 1.0)
    currency_code = data.get('currency_code', 'TWD')
    weather_summary = data.get('weather_summary', '')
    is_rainy = data.get('is_rainy', False)
    
    if not itinerary:
        return jsonify({"success": False, "error": "行程資料為空"}), 400
        
    trip_id = uuid.uuid4().hex[:12]
    
    save_shared_trip(
        trip_id,
        city,
        itinerary,
        json.dumps(budget_data, ensure_ascii=False),
        json.dumps(map_points, ensure_ascii=False),
        exchange_rate,
        currency_code,
        weather_summary,
        is_rainy
    )
    
    return jsonify({"success": True, "trip_id": trip_id})

@app.route('/api/trip/share/<trip_id>', methods=['GET'])
def get_shared_trip_data(trip_id):
    from database import get_shared_trip, get_trip_comments
    trip = get_shared_trip(trip_id)
    if not trip:
        return jsonify({"success": False, "error": "找不到該行程"}), 404
        
    trip["budget_data"] = json.loads(trip["budget_data"])
    trip["map_points"] = json.loads(trip["map_points"])
    trip["comments"] = get_trip_comments(trip_id)
    
    return jsonify({"success": True, "data": trip})

@app.route('/api/trip/comment', methods=['POST'])
def post_trip_comment():
    from database import add_trip_comment
    data = request.json or {}
    trip_id = data.get('trip_id', '')
    spot_name = data.get('spot_name', '')
    author = data.get('author', '')
    content = data.get('content', '')
    
    if not trip_id or not spot_name or not author or not content:
        return jsonify({"success": False, "error": "欄位填寫不完整"}), 400
        
    add_trip_comment(trip_id, spot_name, author, content)
    return jsonify({"success": True, "message": "留言成功！"})

@app.route('/trip/share/<trip_id>', methods=['GET'])
def render_shared_trip_page(trip_id):
    return send_from_directory('static', 'shared.html')

if __name__ == '__main__':
    # Running on port 8000 for local test
    app.run(host='127.0.0.1', port=8000, debug=True)
