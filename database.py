import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'travel_agent.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS accommodations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        type TEXT NOT NULL, -- 'hotel' or 'hostel'
        cost_per_night REAL NOT NULL,
        rating REAL,
        latitude REAL,
        longitude REAL,
        description TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        category TEXT NOT NULL, -- 'tech', 'night_market', 'culture', 'nature'
        ticket_price REAL DEFAULT 0,
        rating REAL,
        latitude REAL,
        longitude REAL,
        open_hours TEXT,
        description TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS historical_spending (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city TEXT NOT NULL,
        category TEXT NOT NULL, -- 'transport', 'lodging', 'dining', 'spots'
        average_cost REAL NOT NULL
    )
    ''')
    
    # Seed mock data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM accommodations")
    if cursor.fetchone()[0] == 0:
        accommodations_data = [
            # Taichung Accommodations
            ('台中精品商務飯店 (Taichung Premium Hotel)', '台中', 'hotel', 2500.0, 4.5, 24.1622, 120.6470, '位於精華商圈的舒適飯店，設備齊全、交通便利，附設自助早餐。'),
            ('台中 Loft 青年旅館 (Taichung Loft Hostel)', '台中', 'hostel', 800.0, 4.8, 24.1512, 120.6620, '高 CP 值文青風青年旅館，提供乾淨的床位與舒適的共享交誼空間，近科博館。'),
            ('逢甲夢幻設計旅店 (Fengjia Design Inn)', '台中', 'hotel', 2200.0, 4.2, 24.1750, 120.6420, '靠近逢甲夜市的現代化飯店，適合情侶或商務人士。'),
            ('台中星空背包客棧 (Starry Backpacker)', '台中', 'hostel', 700.0, 4.3, 24.1380, 120.6850, '靠近台中火車站的精緻背包客棧，交通方便。'),
            
            # Taipei Accommodations
            ('台北星級大飯店 (Taipei Grand Hotel)', '台北', 'hotel', 4500.0, 4.7, 25.0789, 121.5264, '五星級古典宮殿風格大飯店，可俯瞰基隆河美景。'),
            ('台北漫步背包客棧 (Taipei Space Hostel)', '台北', 'hostel', 900.0, 4.6, 25.0421, 121.5080, '靠近西門町的平價青旅，充滿國際氛圍。')
        ]
        cursor.executemany('''
        INSERT INTO accommodations (name, city, type, cost_per_night, rating, latitude, longitude, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', accommodations_data)
        
    cursor.execute("SELECT COUNT(*) FROM spots")
    if cursor.fetchone()[0] == 0:
        spots_data = [
            # Taichung Spots
            ('國立自然科學博物館 (National Museum of Natural Science)', '台中', 'tech', 150.0, 4.7, 24.1557, 120.6601, '09:00 - 17:00 (週一休館)', '設有太空劇場、科學中心與豐富的自然科學展覽，適合知性探索。'),
            ('中部科學園區 - 科學公園 (Central Taiwan Science Park Park)', '台中', 'tech', 0.0, 4.4, 24.2115, 120.6128, '24小時開放', '周圍有高科技廠房與大片綠地人工湖，展現科技與自然共生。'),
            ('逢甲夜市 (Fengjia Night Market)', '台中', 'night_market', 0.0, 4.5, 24.1798, 120.6450, '17:00 - 01:00', '台灣知名度最高、規模最大的夜市之一，各式特色小吃與新奇美食林立。'),
            ('一中街商圈 (Yizhong Street)', '台中', 'night_market', 0.0, 4.3, 24.1488, 120.6860, '11:00 - 23:00', '聚集學生與年輕族群，提供平價美食、流行服飾與小吃。'),
            ('台中軟體園區 - Dali Art 藝術廣場 (Taichung Software Park)', '台中', 'tech', 0.0, 4.1, 24.0850, 120.6970, '10:00 - 21:00', '科技與文創融合的園區，常舉辦 AI 科技藝術展。'),
            ('國家歌劇院 (National Taichung Theater)', '台中', 'culture', 0.0, 4.8, 24.1627, 120.6405, '11:30 - 21:00', '伊東豊雄設計的無樑柱曲牆建築，是台中的重要藝文地標。'),
            
            # Taipei Spots
            ('台北101 (Taipei 101)', '台北', 'culture', 600.0, 4.6, 25.0339, 121.5645, '10:00 - 21:00', '台灣的指標性地標，可俯瞰台北市盆地夜景。'),
            ('士林夜市 (Shilin Night Market)', '台北', 'night_market', 0.0, 4.2, 25.0878, 121.5242, '16:00 - 00:00', '台北著名大型觀光夜市，傳統小吃極為有名。')
        ]
        cursor.executemany('''
        INSERT INTO spots (name, city, category, ticket_price, rating, latitude, longitude, open_hours, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', spots_data)
        
    cursor.execute("SELECT COUNT(*) FROM historical_spending")
    if cursor.fetchone()[0] == 0:
        spending_data = [
            ('台中', 'transport', 1400.0), # 台北-台中高鐵來回
            ('台中', 'lodging_hotel', 2500.0),
            ('台中', 'lodging_hostel', 800.0),
            ('台中', 'dining', 1000.0),
            ('台中', 'spots', 300.0),
            ('台北', 'transport', 200.0), # 北捷捷運/公車
            ('台北', 'lodging_hotel', 4500.0),
            ('台北', 'lodging_hostel', 900.0),
            ('台北', 'dining', 1500.0),
            ('台北', 'spots', 800.0)
        ]
        cursor.executemany('''
        INSERT INTO historical_spending (city, category, average_cost)
        VALUES (?, ?, ?)
        ''', spending_data)
        
    conn.commit()
    conn.close()

def query_accommodations(city, type_pref=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if type_pref:
        cursor.execute("SELECT name, cost_per_night, rating, latitude, longitude, description, type FROM accommodations WHERE city=? AND type=?", (city, type_pref))
    else:
        cursor.execute("SELECT name, cost_per_night, rating, latitude, longitude, description, type FROM accommodations WHERE city=?", (city,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "name": r[0],
            "cost_per_night": r[1],
            "rating": r[2],
            "latitude": r[3],
            "longitude": r[4],
            "description": r[5],
            "type": r[6]
        } for r in rows
    ]

def query_spots(city, category=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if category:
        cursor.execute("SELECT name, category, ticket_price, latitude, longitude, open_hours, description FROM spots WHERE city=? AND category=?", (city, category))
    else:
        cursor.execute("SELECT name, category, ticket_price, latitude, longitude, open_hours, description FROM spots WHERE city=?", (city,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "name": r[0],
            "category": r[1],
            "ticket_price": r[2],
            "latitude": r[3],
            "longitude": r[4],
            "open_hours": r[5],
            "description": r[6]
        } for r in rows
    ]

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at", DB_PATH)
