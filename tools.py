import os
import re
import sqlite3
from database import DB_PATH, query_accommodations, query_spots

KNOWLEDGE_BASE_DIR = os.path.join(os.path.dirname(__file__), 'knowledge_base')

def query_local_db(city, query_type, category=None):
    """
    Queries the local SQLite database for accommodations or spots.
    
    :param city: City name (e.g. '台中', '台北')
    :param query_type: 'accommodation' or 'spot'
    :param category: Optional category for spots ('tech', 'night_market', 'culture')
    :return: List of dictionaries with results
    """
    if query_type == 'accommodation':
        return query_accommodations(city, type_pref=category) # Here category behaves as type_pref ('hotel' or 'hostel')
    elif query_type == 'spot':
        return query_spots(city, category=category)
    return []

def query_rag(city, topic):
    """
    Searches the Markdown knowledge base files for the specified city and returns text matching the topic.
    
    :param city: City name (e.g. '台中', '台北')
    :param topic: Topic keywords (e.g. '科技', '交通', '夜市', '文化')
    :return: Relevant text snippet or the whole guide section
    """
    city_map = {
        '台中': 'taichung_guide.md',
        '台北': 'taipai_guide.md' # Wait, spelling in file setup was taichung_guide.md, we can support lowercase or mappings
    }
    filename = city_map.get(city, 'taichung_guide.md') # Default to Taichung
    filepath = os.path.join(KNOWLEDGE_BASE_DIR, filename)
    
    if not os.path.exists(filepath):
        return f"找不到 {city} 的相關指南文件。"
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Let's perform a simple header/section search based on topic
    # Sections are separated by headers starting with '##'
    sections = content.split('##')
    relevant_sections = []
    
    for section in sections:
        if not section.strip():
            continue
        # Check if topic keyword exists in this section
        if re.search(topic, section, re.IGNORECASE):
            relevant_sections.append("##" + section)
            
    if relevant_sections:
        return "\n\n".join(relevant_sections)
    return f"在 {city} 指南中未找到關於 '{topic}' 的明確主題內容，但有以下目錄：\n" + "\n".join(re.findall(r'^##\s+(.*)$', content, re.MULTILINE))

def calculate_budget(lodging_cost, transport_cost, dining_cost, spot_cost, other_cost=0):
    """
    Calculates the sum of expenses and returns a budget breakdown.
    """
    total = lodging_cost + transport_cost + dining_cost + spot_cost + other_cost
    return {
        "total": total,
        "breakdown": {
            "住宿 (Lodging)": lodging_cost,
            "交通 (Transport)": transport_cost,
            "餐飲 (Dining)": dining_cost,
            "景點門票 (Spots)": spot_cost,
            "其他/備用 (Other/Emergency)": other_cost
        }
    }

def search_web(query):
    """
    Simulates a web search tool to fetch real-time flights/transport and weather information.
    """
    query_lower = query.lower()
    if '天氣' in query_lower or 'weather' in query_lower:
        if '台中' in query_lower:
            return "即時氣象：台中今日多雲時晴，氣溫 22°C - 28°C，降雨機率 10%，適合戶外活動。"
        elif '台北' in query_lower:
            return "即時氣象：台北今日陰有局部雨，氣溫 20°C - 24°C，降雨機率 60%，建議攜帶雨具。"
        return "即時氣象：目的地天氣晴朗，平均氣溫 24°C。"
        
    if '火車' in query_lower or '高鐵' in query_lower or '交通' in query_lower or 'thsr' in query_lower:
        if '台中' in query_lower:
            return "交通資訊：高鐵台北-台中單程票價 700 元，來回 1,400 元，乘車時間約 1 小時；國道客運台北-台中單程票價約 300 元，來回 600 元，乘車時間約 2.5 小時。"
        elif '台北' in query_lower:
            return "交通資訊：北捷單程票價 20-65 元，一日票 150 元。"
            
    # Default mock results
    return f"搜尋結果：關於 '{query}' 的最新資訊顯示目的地一切正常，景點皆照常營業，建議提前預訂門票。"

if __name__ == '__main__':
    # Simple test
    print("Testing DB query:")
    print(query_local_db('台中', 'accommodation', 'hostel'))
    print("\nTesting RAG:")
    print(query_rag('台中', '夜市'))
    print("\nTesting Budget Calculation:")
    print(calculate_budget(800, 1400, 1000, 150))
    print("\nTesting Web Search:")
    print(search_web('台中天氣'))
