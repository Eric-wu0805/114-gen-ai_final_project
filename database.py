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
            ('台北漫步背包客棧 (Taipei Space Hostel)', '台北', 'hostel', 900.0, 4.6, 25.0421, 121.5080, '靠近西門町的平價青旅，充滿國際氛圍。'),
            
            # Tainan Accommodations
            ('台南老爺行旅 (The Place Tainan)', '台南', 'hotel', 3200.0, 4.5, 22.9930, 120.2355, '融合在地文創元素的設計酒店，緊鄰南紡購物中心。'),
            ('台南巷弄背包客棧 (Tainan Alley Hostel)', '台南', 'hostel', 600.0, 4.7, 22.9972, 120.1983, '位於百年老街巷弄內，充滿台南特有的人情味與古早味。'),
            
            # Shanghai Accommodations
            ('上海外灘和平飯店 (Fairmont Peace Hotel)', '中國上海', 'hotel', 9500.0, 4.8, 31.2405, 121.4905, '外灘百年傳奇地標，充滿老上海的奢華復古風情。'),
            ('上海南京路青年旅舍 (Shanghai Nanjing Rd Hostel)', '中國上海', 'hostel', 1200.0, 4.4, 31.2358, 121.4795, '絕佳地段的平價青旅，出門就是繁華的南京步行街。'),
            
            # Milan Accommodations
            ('米蘭寶格麗酒店 (Bulgari Hotel Milano)', '義大利米蘭', 'hotel', 25000.0, 4.9, 45.4715, 9.1895, '米蘭頂級奢華酒店，位處靜謐花園中，步行可達精品街。'),
            ('米蘭中央車站青旅 (Ostello Bello Grande)', '義大利米蘭', 'hostel', 2500.0, 4.6, 45.4851, 9.2045, '獲獎無數的知名青旅，氣氛熱絡，距米蘭中央車站僅 100 公尺。')
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
            ('士林夜市 (Shilin Night Market)', '台北', 'night_market', 0.0, 4.2, 25.0878, 121.5242, '16:00 - 00:00', '台北著名大型觀光夜市，傳統小吃極為有名。'),
            ('鼎泰豐 信義本店 (Din Tai Fung)', '台北', 'dining', 600.0, 4.8, 25.0328, 121.5300, '11:00 - 21:00', '享譽國際的台灣小籠包名店，必吃絲瓜蝦仁小籠包。'),
            
            # Tainan Spots
            ('赤崁樓 (Chihkan Tower)', '台南', 'culture', 50.0, 4.5, 22.9972, 120.2023, '08:30 - 21:30', '台南知名歷史古蹟，夜晚點燈後別有風情。'),
            ('花園夜市 (Tainan Flower Night Market)', '台南', 'night_market', 0.0, 4.6, 23.0108, 120.1982, '17:00 - 00:00 (四、六、日)', '南台灣最大的流動型夜市，美食攤位多不勝數。'),
            ('文章牛肉湯 (Wenzhang Beef Soup)', '台南', 'dining', 200.0, 4.7, 23.0016, 120.1620, '06:00 - 02:00', '台南必吃美食，新鮮溫體牛淋上熱湯，鮮甜無比。'),
            
            # Shanghai Spots
            ('外灘 (The Bund)', '中國上海', 'culture', 0.0, 4.8, 31.2397, 121.4898, '24小時開放', '黃浦江畔的萬國建築群，夜景璀璨迷人。'),
            ('上海迪士尼樂園 (Shanghai Disneyland)', '中國上海', 'tech', 2500.0, 4.6, 31.1444, 121.6575, '08:30 - 21:30', '充滿魔法的迪士尼樂園，擁有獨特的創極速光輪遊樂設施。'),
            ('城隍廟南翔饅頭店 (Nanxiang Mantou)', '中國上海', 'dining', 300.0, 4.1, 31.2285, 121.4920, '08:00 - 20:00', '上海老字號小籠包，總是排滿絡繹不絕的遊客。'),
            
            # Milan Spots
            ('米蘭大教堂 (Duomo di Milano)', '義大利米蘭', 'culture', 600.0, 4.9, 45.4641, 9.1919, '09:00 - 19:00', '歐洲第三大教堂，哥德式建築的極致展現，登頂可俯瞰米蘭。'),
            ('艾曼紐二世迴廊 (Galleria Vittorio Emanuele II)', '義大利米蘭', 'culture', 0.0, 4.8, 45.4659, 9.1901, '24小時開放', '世界最古老的購物中心之一，玻璃圓頂與精緻馬賽克地板極具特色。'),
            ('Luini 炸三明治 (Panzerotti Luini)', '義大利米蘭', 'dining', 150.0, 4.6, 45.4655, 9.1905, '10:00 - 20:00', '米蘭大教堂旁的平價美食傳奇，外酥內軟的起司番茄炸三明治。')
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
