import os
import json
import requests
from dotenv import load_dotenv
import database
import tools

load_dotenv()



def run_agent_workflow(prompt, api_key=None, long_term_memory=None):
    """
    Runs the agent workflow using Gemini API.
    
    :param prompt: User prompt (e.g. '我想去台中兩天一夜...')
    :param api_key: Gemini API Key
    :param long_term_memory: Stored preferences dictionary
    :return: Dictionary containing itinerary, budget_data, map_points, logs
    """
    if not api_key:
        api_key = os.getenv('GOOGLE_API_KEY', '')
        
    if not api_key:
        return {
            "success": False,
            "error": "缺少 Gemini API 金鑰！請在首頁輸入金鑰或於環境變數中設定 GOOGLE_API_KEY。"
        }
        
    # Full LLM execution
    try:
        # 1. RAG Retrieve files
        # Extract destination keywords
        import re
        city = "台中"
        if "台北" in prompt:
            city = "台北"
        elif "台中" in prompt:
            city = "台中"
        else:
            match = re.search(r'(?:去|玩|到|在)\s*([\u4e00-\u9fa5]{2,4})', prompt)
            if match:
                city = match.group(1)
            else:
                found = False
                for known_city in ["日本", "韓國", "美國", "泰國", "新加坡", "東京", "大阪", "京都", "沖繩", "首爾", "曼谷", "台南", "高雄", "花蓮", "台東", "宜蘭", "新竹", "桃園", "苗栗", "彰化", "南投", "雲林", "嘉義", "屏東", "澎湖", "金門", "馬祖"]:
                    if known_city in prompt:
                        city = known_city
                        found = True
                        break
                if not found:
                    match_days = re.search(r'([\u4e00-\u9fa5]{2,4})[0-9一二三四五六七八九十]+\s*天', prompt)
                    if match_days:
                        city = match_days.group(1)

        # Currency Mapping & Live Exchange Rate Fetching
        CURRENCY_MAP = {
            "日本": "JPY", "東京": "JPY", "大阪": "JPY", "京都": "JPY", "沖繩": "JPY", "北海道": "JPY", "名古屋": "JPY", "福岡": "JPY",
            "韓國": "KRW", "首爾": "KRW", "釜山": "KRW", "濟州": "KRW",
            "美國": "USD", "紐約": "USD", "洛杉磯": "USD", "舊金山": "USD",
            "泰國": "THB", "曼谷": "THB", "清邁": "THB", "普吉島": "THB",
            "新加坡": "SGD",
            "歐洲": "EUR", "法國": "EUR", "巴黎": "EUR", "德國": "EUR", "義大利": "EUR", "英國": "GBP", "聯敦": "GBP", "倫敦": "GBP"
        }
        
        currency_code = "TWD"
        exchange_rate = 1.0
        
        for k, v in CURRENCY_MAP.items():
            if k in city or k in prompt:
                currency_code = v
                break
                
        if currency_code != "TWD":
            try:
                rate_res = requests.get("https://open.er-api.com/v6/latest/TWD", timeout=5)
                if rate_res.status_code == 200:
                    rates = rate_res.json().get("rates", {})
                    exchange_rate = rates.get(currency_code, 1.0)
            except Exception as e:
                print(f"Exchange Rate API error: {e}")

        # Coordinates Mapping & Weather Forecast Fetching
        COORDINATES_MAP = {
            "台中": (24.15, 120.65),
            "台北": (25.03, 121.56),
            "日本": (35.67, 139.65),
            "東京": (35.67, 139.65),
            "大阪": (34.69, 135.50),
            "京都": (35.01, 135.76),
            "沖繩": (26.21, 127.68),
            "北海道": (43.06, 141.35),
            "首爾": (37.56, 126.97),
            "韓國": (37.56, 126.97),
            "台南": (22.99, 120.20),
            "高雄": (22.62, 120.30),
            "花蓮": (23.98, 121.60),
            "宜蘭": (24.75, 121.75)
        }
        
        weather_lat, weather_lng = None, None
        for k, coords in COORDINATES_MAP.items():
            if k in city or k in prompt:
                weather_lat, weather_lng = coords
                break
        
        if not weather_lat:
            weather_lat, weather_lng = 24.15, 120.65
            
        is_rainy = False
        weather_desc = "天氣良好，以戶外行程為主。"
        try:
            weather_res = requests.get(f"https://api.open-meteo.com/v1/forecast?latitude={weather_lat}&longitude={weather_lng}&daily=weather_code&timezone=auto", timeout=5)
            if weather_res.status_code == 200:
                daily_codes = weather_res.json().get("daily", {}).get("weather_code", [])
                rain_codes = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99}
                if any(code in rain_codes for code in daily_codes):
                    is_rainy = True
                    weather_desc = "預報旅遊期間有雨，系統已自動為您優先排定室內景點與雨天替代方案。"
        except Exception as e:
            print(f"Weather API error: {e}")
            
        # Extract keywords
        topics = []
        if "夜市" in prompt: topics.append("夜市")
        if "科技" in prompt or "ai" in prompt.lower(): topics.append("科技")
        if "交通" in prompt: topics.append("交通")
        
        topic_query = "|".join(topics) if topics else "旅遊|景點"
        rag_info = tools.query_rag(city, topic_query)
        
        # Real-time Web Search Integration
        try:
            web_search_res = tools.search_web(f"{city} {topic_query}")
            rag_info += f"\n\n--- 即時網頁搜尋結果 ---\n{web_search_res}"
        except Exception as e:
            print(f"Real-time web search failed: {e}")
        
        # 2. SQLite Database Retrieve
        db_accommodations = database.query_accommodations(city)
        db_spots = database.query_spots(city)
        
        accomm_str = json.dumps(db_accommodations, ensure_ascii=False, indent=2)
        spots_str = json.dumps(db_spots, ensure_ascii=False, indent=2)
        
        system_prompt = f"""You are a professional travel planning Agent with reasoning logs.
You MUST output a JSON object containing:
1. "logs": A list of dictionaries, each with "type" ('thought', 'action', or 'observation') and "content" (string). This records your step-by-step reasoning (Thought -> Action -> Observation) and self-correction.
2. "itinerary": A beautiful, formatted markdown travel itinerary in Traditional Chinese.
3. "budget_data": A dictionary with:
   - "total": (number) sum of costs
   - "limit": (number) the user's budget limit
   - "margin": (number) limit minus total
   - "breakdown": a dictionary containing cost items: "住宿 (Lodging)", "交通 (Transport)", "餐飲 (Dining)", "景點門票 (Spots)", "其他/備用 (Other/Emergency)"
4. "map_points": A list of dictionaries, each with "name" (string), "lat" (number), "lng" (number), "desc" (string) for rendering coordinates on a map.

Guidelines:
- Analyze the budget limits. If the initial high-quality plan exceeds the budget limit, perform a self-correction step by swapping expensive accommodations (hotels) with cheaper options (hostels) or adjusting travel modes, log this thought process, call the calculate_budget tool again, and proceed.
- Use the provided SQLite database values and RAG data. Do not hallucinate prices or coordinates.
- If the provided SQLite database values and RAG data are empty (which means the user requested a destination that is not Taipei or Taichung, such as Japan, Tokyo, Tainan, etc.), you MUST use your own knowledge to generate realistic accommodations, spots, coordinates (lat/lng), and prices for the requested destination, and plan the itinerary accordingly.
- You MUST explicitly include the transportation method and its cost to travel from the starting point (default starting point is Taipei, Taiwan, unless specified otherwise) to the destination (e.g., flight, high-speed rail, train, or ferry) at the beginning of the itinerary, and calculate this transit cost in the "交通 (Transport)" budget breakdown.
- Destination Currency: The destination currency is {currency_code}. The exchange rate is 1 TWD = {exchange_rate} {currency_code}. In the JSON "budget_data", all values MUST be in TWD. However, in the markdown "itinerary", you MUST show prices in both local currency and TWD (e.g., "1,000 JPY (約 200 TWD)").
- Weather Optimization: The current weather forecast for the destination is: {weather_desc}. {'Since rain is expected, you MUST prioritize indoor spots (e.g. museums, galleries, shopping malls, indoor attractions) and note this rainy-day adjustments in your plan.' if is_rainy else 'Since no heavy rain is forecast, you can plan standard indoor/outdoor activities.'}
- Quick Booking Links:
  * For each hotel/accommodation, you MUST append a Booking.com search link: `[🏨 立即訂房](https://www.booking.com/searchresults.html?ss=飯店名稱)` (where "飯店名稱" is the exact hotel name, URL-encoded or spaces replaced by +, e.g., `[🏨 立即訂房](https://www.booking.com/searchresults.html?ss=Taichung+Premium+Hotel)`).
  * For each spot/attraction, you MUST append a Google Maps search link: `[📍 地圖導航](https://www.google.com/maps/search/?api=1&query=景點名稱)` (where "景點名稱" is the exact spot name).
  * At the start of the itinerary where transport is mentioned, you MUST append a booking link: `[✈️ 搜尋機票](https://www.google.com/search?q=台北到目的地機票)` or `[🚄 預訂高鐵](https://www.google.com/search?q=高鐵車票預訂)`.
- Local Food Map: For each planned spot/attraction in the itinerary, you MUST search your knowledge or RAG data for 1-2 highly-rated local restaurants or street foods within 500 meters of that spot, and list them directly under the spot's description (e.g., "*🍴 周邊美食推薦：[店名](https://www.google.com/maps/search/?api=1&query=店名) - 推薦菜色與簡介*").
- Ensure you explain why you are making choices (e.g. geographical optimization).

Here is the context data:
--- RAG GUIDES ---
{rag_info}

--- SQLITE ACCOMMODATIONS ---
{accomm_str}

--- SQLITE SPOTS ---
{spots_str}
"""
        
        # Make the LLM Call
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"User Prompt: {prompt}\n\nPlease generate the travel itinerary according to the instructions. Output MUST be valid JSON conforming to the structure described."}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code == 200:
            res_json = response.json()
            text_response = res_json['candidates'][0]['content']['parts'][0]['text']
            # Parse the JSON
            result = json.loads(text_response)
            result["success"] = True
            
            # Ensure keys exist
            if "logs" not in result or "itinerary" not in result or "budget_data" not in result:
                raise ValueError("LLM JSON output missing critical fields")
                
            # Inject dynamic exchange rate and weather details
            result["exchange_rate"] = exchange_rate
            result["currency_code"] = currency_code
            result["weather_summary"] = weather_desc
            result["is_rainy"] = is_rainy
            result["city"] = city
            
            return result
        else:
            print(f"Gemini API returned error {response.status_code}: {response.text}")
            # Fallback to simulation
            return get_demo_itinerary_data()
            
    except Exception as e:
        print(f"LLM Call failed: {e}. Falling back to rule-based simulation.")
        return get_demo_itinerary_data()

# Long-term Memory functions
MEMORY_FILE = os.path.join(os.path.dirname(__file__), 'long_term_memory.json')

def load_memory():
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "destination_history": [],
        "budget_sensitivity": "None",
        "accommodation_pref": "None",
        "interests": [],
        "dietary": "None"
    }

def save_memory(mem):
    try:
        with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(mem, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Failed to save memory:", e)

def get_alternative_spots_from_gemini(city, spot_name, api_key=None):
    if not api_key:
        api_key = os.getenv('GOOGLE_API_KEY', '')
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    system_prompt = """You are a professional travel assistant. You MUST output a JSON object containing:
"alternatives": A list of 3 dictionaries, each with:
- "name": (string) name of the alternative spot
- "lat": (number) latitude
- "lng": (number) longitude
- "desc": (string) a short description of why this spot is a great alternative to the original spot.
Keep coordinates as precise and realistic as possible. Do not hallucinate coordinates outside the city boundaries.
Your output language MUST be Traditional Chinese (zh-tw).
"""
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"Please recommend 3 alternative tourist spots in {city} that are close to or similar in style to '{spot_name}'."}
                ]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if response.status_code == 200:
            res_json = response.json()
            text_response = res_json['candidates'][0]['content']['parts'][0]['text']
            return json.loads(text_response)
        else:
            print(f"Gemini API error in alternatives: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error getting alternative spots: {e}")
        
    # Rule-based fallback coordinates
    lat, lng = 24.15, 120.65
    COORDINATES_MAP = {
        "台中": (24.15, 120.65),
        "台北": (25.03, 121.56),
        "東京": (35.67, 139.65),
        "日本": (35.67, 139.65),
        "大阪": (34.69, 135.50),
        "京都": (35.01, 135.76)
    }
    for k, v in COORDINATES_MAP.items():
        if k in city:
            lat, lng = v
            break
            
    return {
        "alternatives": [
            {"name": f"{spot_name}附近的文創街區", "lat": lat + 0.005, "lng": lng - 0.005, "desc": "富含當地特色文創商品與散步街區的替代方案。"},
            {"name": f"鄰近的市立美術館", "lat": lat - 0.003, "lng": lng + 0.004, "desc": "適合文青慢活的室內靜態展覽替代方案。"},
            {"name": f"附近的歷史文化公園", "lat": lat + 0.002, "lng": lng + 0.002, "desc": "充滿綠意與在地歷史景致，適合午後休閒散步。"}
        ]
    }

def adjust_itinerary_workflow(prompt, current_itinerary, current_budget_data, current_map_points, api_key=None):
    """
    Adjusts an existing itinerary incrementally based on the user prompt.
    """
    if not api_key:
        api_key = os.getenv('GOOGLE_API_KEY', '')
        
    if not api_key:
        return {
            "success": False,
            "error": "缺少 Gemini API 金鑰！請在首頁輸入金鑰或於環境變數中設定 GOOGLE_API_KEY。"
        }
        
    try:
        # Determine city (same heuristics as run_agent_workflow)
        import re
        city = "台中"
        if "台北" in prompt or "台北" in current_itinerary:
            city = "台北"
        elif "台中" in prompt or "台中" in current_itinerary:
            city = "台中"
        else:
            match = re.search(r'(?:去|玩|到|在)\s*([\u4e00-\u9fa5]{2,4})', prompt)
            if match:
                city = match.group(1)
                
        # Query DB & RAG to help the model with search information
        db_accommodations = database.query_accommodations(city)
        db_spots = database.query_spots(city)
        
        accomm_str = json.dumps(db_accommodations, ensure_ascii=False, indent=2)
        spots_str = json.dumps(db_spots, ensure_ascii=False, indent=2)
        
        # Real-time search Wikipedia/Weather for new topics
        web_search_res = ""
        try:
            web_search_res = tools.search_web(f"{city} {prompt}")
        except Exception:
            pass
            
        system_prompt = f"""You are a professional travel planning Agent with reasoning logs.
You are tasked with INCREMENTALLY adjusting an existing travel itinerary based on the user's micro-adjustment request.

You are given:
1. Current Itinerary: The current itinerary in Markdown.
2. Current Budget: The current budget data (TWD).
3. Current Map Points: The current coordinates and description of planned spots.

You MUST output a JSON object containing:
1. "logs": A list of dictionaries, each with "type" ('thought', 'action', or 'observation') and "content" (string). This records your step-by-step reasoning (Thought -> Action -> Observation) and self-correction during the adjustment.
2. "itinerary": The updated, formatted markdown travel itinerary in Traditional Chinese.
3. "budget_data": The updated budget dictionary (with total, limit, margin, breakdown in TWD).
4. "map_points": The updated list of map points (name, lat, lng, desc).

Guidelines:
- DO NOT rewrite the entire itinerary from scratch if only a small part changes. Preserve the parts of the itinerary, spots, and budget that are unaffected by the user's request.
- Check budget constraints! If the user's request causes the total budget to exceed the limit, perform a self-correction step in your logs (Thought -> Action -> Observation) where you replace expensive spots or lodging with cheaper alternatives, or reject/modify the change while explaining the budget constraint in the logs and final response.
- Follow the original formatting guidelines for links (Booking.com, Google Maps) and ratings (⭐ X.X) for scenic spots, hotels, and restaurants.
- Weather Optimization: Keep rainy-day adjustments in mind if applicable.

Context data:
--- SQLITE ACCOMMODATIONS ---
{accomm_str}

--- SQLITE SPOTS ---
{spots_str}

--- REAL-TIME WEB SEARCH ---
{web_search_res}
"""
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"Current Itinerary:\n{current_itinerary}\n\nCurrent Budget Data:\n{json.dumps(current_budget_data, ensure_ascii=False)}\n\nCurrent Map Points:\n{json.dumps(current_map_points, ensure_ascii=False)}\n\nUser Adjustment Request:\n{prompt}\n\nPlease perform the incremental travel itinerary adjustment."
                        }
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code == 200:
            res_json = response.json()
            text_response = res_json['candidates'][0]['content']['parts'][0]['text']
            result = json.loads(text_response)
            result["success"] = True
            result["city"] = city
            # Fallbacks for exchange rates and weather fields
            result["exchange_rate"] = current_budget_data.get("exchange_rate", 1.0)
            result["currency_code"] = current_budget_data.get("currency_code", "TWD")
            return result
        else:
            print(f"Gemini API returned error {response.status_code} in adjust: {response.text}")
            return {"success": False, "error": f"API 呼叫失敗 ({response.status_code})"}
            
    except Exception as e:
        print(f"Adjust itinerary failed: {e}")
        return {"success": False, "error": f"發生異常錯誤：{str(e)}"}

if __name__ == '__main__':
    # Test runner
    print("Running Agent simulation:")
    res = run_agent_workflow("我想去台中兩天一夜，預算5000元，住宿便宜，去AI景點和夜市")
    print("Success:", res["success"])
    print("Itinerary size:", len(res["itinerary"]))
    print("Logs count:", len(res["logs"]))
    print("Budget total:", res["budget_data"]["total"])
