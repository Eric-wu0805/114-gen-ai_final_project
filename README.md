# 🚀 Travel AI Agent — 智慧雙層記憶城際旅遊規劃助理

**Travel AI Agent** 是一款基於大語言模型 (Google Gemini 2.5 Flash)、本地 RAG 知識庫與 SQLite 資料庫的智慧城際旅遊規劃系統。本系統採用極具科技感的**霓虹玻璃擬態風格 (Cyberpunk Glassmorphism)** 介面，具備個人偏好記憶、預算自我修正、實時天氣/匯率感知、多輪對話增量微調、拖拽式地圖路徑排序，以及多人協同留言等多項核心 Agent 特性。

---

## 🌟 核心特色功能

### 1. 🧠 智慧雙層記憶體系統 (Dual-Memory System)
*   **Session 短期記憶**：保留目前對話輪次中的上下文，支援連續指令輸入。
*   **長期偏好記憶**：利用 SQLite 資料庫儲存使用者的歷史旅遊目的地、預算敏感度（如預算敏感型或奢華型）、住宿類型偏好及個人興趣標籤。在進行新行程規劃時，AI 會自動讀取並契合使用者的個人化需求。

### 2. 💰 預算檢核與自我修正 (Budget Self-Correction)
*   系統在規劃行程時，會主動分析交通、住宿、餐飲及門票的估計開銷。
*   若初步生成的行程總預算超出使用者設定的預算限制，AI 會在後端日誌中觸發**自我修正 (Self-Correction)**，自動將高價位飯店替換為高 CP 值的青年旅館，或調整交通方式，直至總支出降至安全線內。

### 3. 🌤️ 實時天氣感知與 RAG 檢索優化
*   **天氣即時預報**：串接 Open-Meteo 天氣預報 API。若旅遊期間預報有雨，AI 會自動優先排定室內景點與雨天替代方案。
*   **即時匯率轉換**：前往日本、韓國等境外目的地時，系統會自動呼叫即時匯率 API，在行程表中以雙幣制呈現（例如：`1,000 JPY (約 200 TWD)`），並在預算圖表中統一折算為台幣 (TWD) 統計。
*   **本地 RAG 知識庫**：整合本地 Markdown 旅遊指南文件，並配合 Wikipedia API 的網頁實時搜尋，防止 AI 幻覺。

### 4. 💬 多輪對話行程微調聊天室 (Incremental Chat Adjustment)
*   當行程表生成後，右側分頁底部會開啟「AI 微調聊天室」。
*   使用者可使用自然語言提出微調要求（例如：「第一天晚上改去一中街商圈，不要逢甲夜市」或「我想把第一晚的住宿升級」）。後端 `/api/chat_adjust` 會以增量方式更新行程，保留其餘未受影響的規劃，避免重新生成整個行程。
*   中間的 **Terminal Console** 會動態播放 AI 的推理軌跡 (Thought -> Action -> Observation)，提供直觀的 Agent 思考反饋。

### 5. 🗺️ 拖拽式地圖景點排序與 OSRM 路徑動態重算
*   「路線地圖」分頁中整合了 Leaflet 地圖與 OSRM 道路路徑 API，自動生成導航路徑。
*   使用者可在景點列表中**直接以滑鼠拖曳卡片**調整景點的拜訪順序。排序更動後，地圖上的標記編號及道路導航路線會立即重新算繪。

### 6. 👥 多人協同分享與留言板
*   使用者可以一鍵「產生協同分享連結」，將行程、預算圖表、路線地圖同步至專屬網頁。
*   旅伴可開啟連結共同檢視行程，並在各個景點下方發表留言意見，方便小組協作規劃。

---

## 🛠️ 技術棧 (Technology Stack)

### 後端 (Backend)
*   **Python 3**
*   **Flask**：提供 Web API 服務。
*   **SQLite3**：儲存景點資訊、住宿價格、長期記憶與協同留言資料。
*   **Requests & Dotenv**：用於第三方 API 請求與環境變數管理。

### 前端 (Frontend)
*   **HTML5 / CSS3**：手寫 Vanilla CSS。採用霓虹玻璃擬態設計（Neon Glassmorphism），擁有流暢的微動畫與自適應佈局。
*   **Vanilla JavaScript (ES6)**
*   **Leaflet.js**：配合 Google Maps 圖層與 OSRM 進行路線軌跡渲染。
*   **Chart.js**：將預算結構（住宿、交通、餐飲、門票、備用）渲染為精美的甜甜圈圖。
*   **Marked.js**：即時解析並渲染 Markdown 行程表，並強制所有超連結以 `_blank` 新分頁開啟。

---

## 🚀 快速開始指南

### 1. 安裝依賴環境
克隆專案至本地並安裝 Python 套件：
```bash
pip install -r requirements.txt
```

### 2. 設定環境變數
於專案根目錄下建立 `.env` 檔案，填入您的 **Google Gemini API Key**：
```ini
GOOGLE_API_KEY=AIzaSy...your_gemini_api_key_here
```

### 3. 初始化資料庫並啟動 Flask 伺服器
執行 `app.py`，系統會自動在本地建立 SQLite 資料庫檔案 `travel_agent.db` 並導入台中與台北的預設模擬資料。
```bash
python app.py
```
啟動後，請在瀏覽器中開啟以下網址：
👉 **http://127.0.0.1:8000**

---

## 📁 專案目錄結構說明

*   `app.py`：Flask 後端主要路由與控制器（包含 `/api/plan`、`/api/chat_adjust`、`/api/share_trip` 等）。
*   `agent.py`：Gemini 大模型 Workflow（包含重試機制 `post_with_retry`、主行程規劃與增量微調邏輯）。
*   `tools.py`：外部輔助工具（RAG 本地檢索、Wikipedia 即時搜尋、Open-Meteo 天氣爬蟲、預算加總）。
*   `database.py`：SQLite 資料庫初始化、Seeding 與偏好查詢模組。
*   `requirements.txt`：列出專案運行所需的第三方 Python 套件。
*   `static/`：前端靜態資源目錄。
    *   `index.html`：主規劃 Dashboard 介面。
    *   `shared.html`：協同分享行程頁面。
    *   `css/style.css`：暗黑科技感玻璃擬態樣式。
    *   `js/app.js`：前端核心互動邏輯與拖拽排序、地圖渲染實作。
*   `knowledge_base/`：本地 RAG 知識庫，存放台中、台北的 Markdown 旅遊指南。
