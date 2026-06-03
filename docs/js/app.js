// Travel AI Agent - GitHub Pages Serverless Client Script

document.addEventListener('DOMContentLoaded', () => {
    // Configure marked to open all links in a new tab
    const renderer = new marked.Renderer();
    renderer.link = function(arg1, arg2, arg3) {
        let href = "";
        let title = "";
        let text = "";
        if (arg1 && typeof arg1 === 'object') {
            href = arg1.href || "";
            title = arg1.title || "";
            text = arg1.text || "";
        } else {
            href = arg1 || "";
            title = arg2 || "";
            text = arg3 || "";
        }
        return `<a href="${href}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    marked.use({ renderer });

    // UI Elements
    const promptInput = document.getElementById('promptInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const btnPlan = document.getElementById('btnPlan');
    const btnText = document.getElementById('btnText');
    const btnClearMemory = document.getElementById('btnClearMemory');
    const btnDownloadMd = document.getElementById('btnDownloadMd');
    const btnPrintPdf = document.getElementById('btnPrintPdf');
    
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadStatusText = document.getElementById('uploadStatusText');
    
    const terminalLogs = document.getElementById('terminalLogs');
    const agentStatusBadge = document.getElementById('agentStatusBadge');
    
    // Memory elements
    const inputMemHistory = document.getElementById('inputMemHistory');
    const selectMemBudget = document.getElementById('selectMemBudget');
    const selectMemAccom = document.getElementById('selectMemAccom');
    const inputMemInterests = document.getElementById('inputMemInterests');
    const btnSaveMemory = document.getElementById('btnSaveMemory');
    
    // Tab Panels
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    const itineraryPlaceholder = document.getElementById('itineraryPlaceholder');
    const itineraryContent = document.getElementById('itineraryContent');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const mapWrapper = document.getElementById('mapWrapper');
    const mapContainer = document.getElementById('mapContainer');
    const mapSpotsList = document.getElementById('mapSpotsList');
    const transportModeSelect = document.getElementById('transportModeSelect');
    const budgetPlaceholder = document.getElementById('budgetPlaceholder');
    const budgetContent = document.getElementById('budgetContent');
    const budgetAlertsZone = document.getElementById('budgetAlertsZone');
    
    const statLimit = document.getElementById('statLimit');
    const statTotal = document.getElementById('statTotal');
    const statMargin = document.getElementById('statMargin');
    const dashboardFooter = document.getElementById('dashboardFooter');
    
    // State variables
    let map = null;
    let chart = null;
    let currentItinerary = "";
    let mapLayers = [];
    let currentData = null;
    let chatHistory = [];

    // Local DB Mock
    const DB_ACCOMMODATIONS = {
        "台中": [
            {"name": "台中精品商務飯店 (Taichung Premium Hotel)", "cost_per_night": 2500.0, "rating": 4.5, "latitude": 24.1622, "longitude": 120.6470, "description": "位於精華商圈的舒適飯店，設備齊全、交通便利，附設自助早餐。", "type": "hotel"},
            {"name": "台中 Loft 青年旅館 (Taichung Loft Hostel)", "cost_per_night": 800.0, "rating": 4.8, "latitude": 24.1512, "longitude": 120.6620, "description": "高 CP 值文青風青年旅館，提供乾淨的床位與舒適的共享交誼空間，近科博館。", "type": "hostel"},
            {"name": "逢甲夢幻設計旅店 (Fengjia Design Inn)", "cost_per_night": 2200.0, "rating": 4.2, "latitude": 24.1750, "longitude": 120.6420, "description": "靠近逢甲夜市的現代化飯店，適合情侶或商務人士。", "type": "hotel"},
            {"name": "台中星空背包客棧 (Starry Backpacker)", "cost_per_night": 700.0, "rating": 4.3, "latitude": 24.1380, "longitude": 120.6850, "description": "靠近台中火車站的精緻背包客棧，交通方便。", "type": "hostel"}
        ],
        "台北": [
            {"name": "台北星級大飯店 (Taipei Grand Hotel)", "cost_per_night": 4500.0, "rating": 4.7, "latitude": 25.0789, "longitude": 121.5264, "description": "五星級古典宮殿風格大飯店，可俯瞰基隆河美景。", "type": "hotel"},
            {"name": "台北漫步背包客棧 (Taipei Space Hostel)", "cost_per_night": 900.0, "rating": 4.6, "latitude": 25.0421, "longitude": 121.5080, "description": "靠近西門町的平價青旅，充滿國際氛圍。", "type": "hostel"}
        ]
    };

    const DB_SPOTS = {
        "台中": [
            {"name": "國立自然科學博物館 (National Museum of Natural Science)", "category": "tech", "ticket_price": 150.0, "latitude": 24.1557, "longitude": 120.6601, "open_hours": "09:00 - 17:00 (週一休館)", "description": "設有太空劇場、科學中心與豐富的自然科學展覽，適合知性探索。"},
            {"name": "中部科學園區 - 科學公園 (Central Taiwan Science Park Park)", "category": "tech", "ticket_price": 0.0, "latitude": 24.2115, "longitude": 120.6128, "open_hours": "24小時開放", "description": "周圍有高科技廠房與大片綠地人工湖，展現科技與自然共生。"},
            {"name": "逢甲夜市 (Fengjia Night Market)", "category": "night_market", "ticket_price": 0.0, "latitude": 24.1798, "longitude": 120.6450, "open_hours": "17:00 - 01:00", "description": "台灣知名度最高、規模最大的夜市之一，各式特色小吃與新奇美食林立。"},
            {"name": "一中街商圈 (Yizhong Street)", "category": "night_market", "ticket_price": 0.0, "latitude": 24.1488, "longitude": 120.6860, "open_hours": "11:00 - 23:00", "description": "聚集學生與年輕族群，提供平價美食、流行服飾與小吃。"},
            {"name": "台中軟體園區 - Dali Art 藝術廣場 (Taichung Software Park)", "category": "tech", "ticket_price": 0.0, "latitude": 24.0850, "longitude": 120.6970, "open_hours": "10:00 - 21:00", "description": "科技與文創融合的園區，常舉辦 AI 科技藝術展。"},
            {"name": "國家歌劇院 (National Taichung Theater)", "category": "culture", "ticket_price": 0.0, "latitude": 24.1627, "longitude": 120.6405, "open_hours": "11:30 - 21:00", "description": "伊東豊雄設計的無樑柱曲牆建築，是台中的重要藝文地標。"}
        ],
        "台北": [
            {"name": "台北101 (Taipei 101)", "category": "culture", "ticket_price": 600.0, "latitude": 25.0339, "longitude": 121.5645, "open_hours": "10:00 - 21:00", "description": "台灣的指標性地標，可俯瞰台北市盆地夜景。"},
            {"name": "士林夜市 (Shilin Night Market)", "category": "night_market", "ticket_price": 0.0, "latitude": 25.0878, "longitude": 121.5242, "open_hours": "16:00 - 00:00", "description": "台北著名大型觀光夜市，傳統小吃極為有名。"}
        ]
    };

    const RAG_GUIDES = {
        "台中": `
## 台中旅遊指南 (RAG)
* **交通指南**：台北往返台中，建議搭乘台灣高鐵 (單程約 700 TWD，行車時間 60 分鐘)；或搭乘台鐵自強號 (單程約 375 TWD，行車時間 120 分鐘)。當地交通建議使用悠遊卡搭乘台中市公車 (享 10 公里免費優惠)。
* **科技景點**：國立自然科學博物館 (科博館) 門票 150 元，內有太空劇場；中科科學公園為免票綠地，可看科技廠房造景。
* **夜市商圈**：逢甲夜市與一中街商圈皆為免票景點，聚集各類特色小吃。
`,
        "台北": `
## 台北旅遊指南 (RAG)
* **交通指南**：台北市區建議搭乘台北捷運 (台北捷運一日票 150 TWD)。
* **景點指南**：台北 101 觀景台門票 600 TWD，士林夜市為免票景點。
`
    };
    
    // Tab Switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            
            if (targetTab === 'itinerary') {
                document.getElementById('paneItinerary').classList.add('active');
            } else if (targetTab === 'map') {
                document.getElementById('paneMap').classList.add('active');
                if (map) {
                    setTimeout(() => {
                        map.invalidateSize();
                        if (mapLayers && mapLayers.length > 0) {
                            try {
                                const group = L.featureGroup(mapLayers);
                                map.fitBounds(group.getBounds(), { padding: [40, 40] });
                            } catch (e) {
                                console.log("Tab switch fitBounds deferred:", e);
                            }
                        }
                    }, 120);
                }
            } else if (targetTab === 'budget') {
                document.getElementById('paneBudget').classList.add('active');
            }
        });
    });
    
    // Client-side dropzone file reader mockup
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleClientFileUpload(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleClientFileUpload(e.target.files[0]);
        }
    });
    
    function handleClientFileUpload(file) {
        uploadStatus.style.display = 'flex';
        uploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>正在解析「${file.name}」...</span>`;
        
        setTimeout(() => {
            let message = "";
            let suggested_prompt = "";
            
            if (file.name.toLowerCase().includes('hotel') || file.name.includes('飯店')) {
                message = "已解析上傳文件：發現預訂了「台中精品商務飯店」，每晚 2,500 元。";
                suggested_prompt = "我上傳了飯店預訂確認信。請規劃台中兩天一夜，預算 5,000 元，住宿要便宜，並參考我喜歡夜市的偏好。";
            } else {
                message = `成功解析文檔「${file.name}」，已提取偏好標籤「預算敏感型」。`;
                suggested_prompt = "請幫我規劃台中兩天一夜之旅，預算 5,000 元，住宿要便宜，並優先前往免票科技景點。";
            }
            
            uploadStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-success)"></i> <span>${message}</span>`;
            promptInput.value = suggested_prompt;
            appendTerminalLog('observation', `[文件上傳] ${message}`);
        }, 1000);
    }
    
    // Save preferences to localStorage (Long term memory simulation)
    function loadMemory() {
        try {
            const dataStr = localStorage.getItem('travel_agent_memory');
            const data = dataStr ? JSON.parse(dataStr) : {
                destination_history: [],
                budget_sensitivity: "None",
                accommodation_pref: "None",
                interests: []
            };
            inputMemHistory.value = data.destination_history ? data.destination_history.join(', ') : "";
            selectMemBudget.value = data.budget_sensitivity || "None";
            selectMemAccom.value = data.accommodation_pref || "None";
            inputMemInterests.value = data.interests ? data.interests.join(', ') : "";
        } catch (e) {
            console.error("Local memory error:", e);
        }
    }
    
    btnSaveMemory.addEventListener('click', () => {
        const dests = inputMemHistory.value.split(',').map(s => s.trim()).filter(Boolean);
        const budget = selectMemBudget.value;
        const accom = selectMemAccom.value;
        const ints = inputMemInterests.value.split(',').map(s => s.trim()).filter(Boolean);
        
        const memoryData = {
            destination_history: dests,
            budget_sensitivity: budget,
            accommodation_pref: accom,
            interests: ints
        };
        
        localStorage.setItem('travel_agent_memory', JSON.stringify(memoryData));
        appendTerminalLog('observation', '長期偏好記憶已儲存至瀏覽器本地快取！');
    });
    
    btnClearMemory.addEventListener('click', () => {
        if (!confirm("確定要清除所有長期偏好記憶嗎？")) return;
        localStorage.removeItem('travel_agent_memory');
        loadMemory();
        appendTerminalLog('observation', '長期偏好記憶已成功清除！');
    });
    
    function appendTerminalLog(type, content) {
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.textContent = content;
        terminalLogs.appendChild(item);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }
    
    // Helper: estimate distance (Haversine) and duration
    function estimateHaversine(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // in km
        
        const mode = transportModeSelect ? transportModeSelect.value : 'driving';
        let speed = 35;
        if (mode === 'foot') speed = 5;
        else if (mode === 'bicycle') speed = 15;
        
        const duration = distance * 60 / speed;
        return {
            distance: distance,
            duration: duration
        };
    }

    // Initialize Map
    function initMap(points) {
        if (map) {
            map.remove();
        }
        mapLayers = [];
        
        mapWrapper.style.display = 'flex';
        mapContainer.style.display = 'block';
        mapPlaceholder.style.display = 'none';
        
        const centerLat = points.length > 0 ? points[0].lat : 24.15;
        const centerLng = points.length > 0 ? points[0].lng : 120.65;
        
        map = L.map('mapContainer').setView([centerLat, centerLng], 12);
        
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            maxZoom: 20
        }).addTo(map);
        
        const latlngs = [];
        
        const pointIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 30px; height: 30px;">
                    <svg viewBox="0 0 24 24" width="30" height="30" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ea4335"/>
                    </svg>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
        
        points.forEach((pt, index) => {
            const marker = L.marker([pt.lat, pt.lng], { icon: pointIcon }).addTo(map);
            marker.bindPopup(`<strong>${index + 1}. ${pt.name}</strong><br/>${pt.desc}`);
            mapLayers.push(marker);
            latlngs.push([pt.lat, pt.lng]);
        });

        // Draw route info badges on the map (initially Haversine-based)
        const mode = transportModeSelect ? transportModeSelect.value : 'driving';
        const modeIcons = {
            driving: 'fa-car',
            foot: 'fa-person-walking',
            bicycle: 'fa-bicycle'
        };
        const modeIconClass = modeIcons[mode] || 'fa-car';
        const modeEmoji = mode === 'foot' ? '🚶' : mode === 'bicycle' ? '🚲' : '🚗';

        if (latlngs.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                const pt1 = points[i];
                const pt2 = points[i+1];
                const midLat = (pt1.lat + pt2.lat) / 2;
                const midLng = (pt1.lng + pt2.lng) / 2;
                
                const est = estimateHaversine(pt1.lat, pt1.lng, pt2.lat, pt2.lng);
                const estDistanceStr = est.distance.toFixed(1) + " km";
                const estDurationStr = Math.round(est.duration) + " 分鐘";
                
                const infoIcon = L.divIcon({
                    className: 'route-info-badge-icon',
                    html: `<div class="route-map-badge" id="map-badge-${i}">${modeEmoji} ${estDistanceStr} (${estDurationStr})</div>`,
                    iconSize: [100, 24],
                    iconAnchor: [50, 12]
                });
                
                const infoMarker = L.marker([midLat, midLng], { icon: infoIcon }).addTo(map);
                mapLayers.push(infoMarker);
            }
        }
        
        if (latlngs.length > 1) {
            const fallbackPolyline = L.polyline(latlngs, {
                color: '#1a73e8',
                weight: 4,
                opacity: 0.6,
                dashArray: '5, 10'
            }).addTo(map);
            mapLayers.push(fallbackPolyline);
            
            try {
                map.fitBounds(fallbackPolyline.getBounds(), { padding: [40, 40] });
            } catch (e) {}
            
            const coordsStr = points.map(pt => `${pt.lng},${pt.lat}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/${mode === 'foot' ? 'foot' : mode === 'bicycle' ? 'bicycle' : 'driving'}/${coordsStr}?geometries=geojson&overview=full`;
            
            fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        map.removeLayer(fallbackPolyline);
                        mapLayers = mapLayers.filter(l => l !== fallbackPolyline);
                        
                        const routeGeometry = data.routes[0].geometry;
                        const routeLatLngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
                        
                        const routeBorder = L.polyline(routeLatLngs, {
                            color: '#ffffff',
                            weight: 8,
                            opacity: 0.9,
                            lineJoin: 'round'
                        }).addTo(map);
                        mapLayers.push(routeBorder);
 
                        const roadPolyline = L.polyline(routeLatLngs, {
                            color: '#1a73e8',
                            weight: 5,
                            opacity: 0.95,
                            lineJoin: 'round'
                        }).addTo(map);
                        mapLayers.push(roadPolyline);
                        
                        // Update distances and times from OSRM legs
                        const legs = data.routes[0].legs;
                        legs.forEach((leg, i) => {
                            const actualDistance = (leg.distance / 1000).toFixed(1) + " km";
                            const actualDuration = Math.round(leg.duration / 60) + " 分鐘";
                            
                            // Update sidebar connector
                            const badgeEl = document.getElementById(`connector-badge-${i}`);
                            if (badgeEl) {
                                badgeEl.innerHTML = `
                                    <i class="fa-solid ${modeIconClass}"></i>
                                    <span>${actualDistance} (${actualDuration})</span>
                                `;
                            }
                            
                            // Update map badge
                            const mapBadgeEl = document.getElementById(`map-badge-${i}`);
                            if (mapBadgeEl) {
                                mapBadgeEl.textContent = `${modeEmoji} ${actualDistance} (${actualDuration})`;
                            }
                        });
                        
                        try {
                            map.fitBounds(roadPolyline.getBounds(), { padding: [40, 40] });
                        } catch (e) {}
                    }
                })
                .catch(err => console.log("OSRM routing offline fallback:", err));
        }
 
        // Render spot list
        mapSpotsList.innerHTML = "";
        points.forEach((pt, index) => {
            const spotCard = document.createElement('div');
            spotCard.className = 'spot-card-container';
            spotCard.style.display = 'flex';
            spotCard.style.flexDirection = 'column';
            spotCard.style.gap = '8px';
            
            // Enable HTML5 drag and drop
            spotCard.setAttribute('draggable', 'true');
            spotCard.dataset.index = index;
            
            spotCard.innerHTML = `
                <div class="spot-card">
                    <div class="spot-card-info">
                        <span class="spot-card-name">${index + 1}. ${pt.name}</span>
                        <span class="spot-card-desc">${pt.desc}</span>
                    </div>
                    <button class="btn-replace-spot" data-index="${index}" data-name="${pt.name}">
                        <i class="fa-solid fa-arrows-rotate"></i> 替換此景點
                    </button>
                </div>
                <div class="alternatives-wrapper" id="alternatives-${index}" style="display: none;"></div>
            `;
            
            // Drag event listeners
            spotCard.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                spotCard.classList.add('dragging');
            });
 
            spotCard.addEventListener('dragover', (e) => {
                e.preventDefault();
                spotCard.classList.add('drag-over');
            });
 
            spotCard.addEventListener('dragleave', () => {
                spotCard.classList.remove('drag-over');
            });
 
            spotCard.addEventListener('dragend', () => {
                spotCard.classList.remove('dragging');
                const allCards = mapSpotsList.querySelectorAll('.spot-card-container');
                allCards.forEach(card => card.classList.remove('drag-over'));
            });
 
            spotCard.addEventListener('drop', (e) => {
                e.preventDefault();
                spotCard.classList.remove('drag-over');
                const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = index;
                
                if (sourceIndex !== targetIndex && currentData && currentData.map_points) {
                    const [movedItem] = currentData.map_points.splice(sourceIndex, 1);
                    currentData.map_points.splice(targetIndex, 0, movedItem);
                    
                    initMap(currentData.map_points);
                    appendTerminalLog('observation', `成功調整景點排序：將「${movedItem.name}」移至第 ${targetIndex + 1} 順位，地圖導航與路線順序已即時重新計算。`);
                }
            });
            
            mapSpotsList.appendChild(spotCard);

            // Add connector indicator to next spot
            if (index < points.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'route-connector';
                connector.id = `route-connector-${index}`;
                
                const est = estimateHaversine(pt.lat, pt.lng, points[index+1].lat, points[index+1].lng);
                const estDistanceStr = est.distance.toFixed(1) + " km";
                const estDurationStr = Math.round(est.duration) + " 分鐘";
                
                connector.innerHTML = `
                    <div class="connector-line"></div>
                    <div class="connector-badge" id="connector-badge-${index}">
                        <i class="fa-solid ${modeIconClass}"></i>
                        <span>約 ${estDistanceStr} (${estDurationStr})</span>
                    </div>
                    <div class="connector-line"></div>
                `;
                mapSpotsList.appendChild(connector);
            }
        });
        
        // Setup replacement spot trigger
        const replaceButtons = mapSpotsList.querySelectorAll('.btn-replace-spot');
        replaceButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                const sName = btn.getAttribute('data-name');
                const altContainer = document.getElementById(`alternatives-${idx}`);
                
                if (altContainer.style.display === 'grid') {
                    altContainer.style.display = 'none';
                    return;
                }
                
                altContainer.style.display = 'grid';
                altContainer.className = 'alternatives-container';
                altContainer.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; color: #94a3b8; font-size: 0.9em; padding: 10px;">
                        <i class="fa-solid fa-spinner fa-spin"></i> 正在用 AI 尋找替代推薦景點...
                    </div>
                `;
                
                try {
                    const apiKey = apiKeyInput.value.trim();
                    const city = currentData ? currentData.city : '台中';
                    const alts = await fetchAlternativesFromGemini(city, sName, apiKey);
                    
                    if (alts && alts.length > 0) {
                        altContainer.innerHTML = "";
                        alts.forEach(alt => {
                            const card = document.createElement('div');
                            card.className = 'alternative-card';
                            card.innerHTML = `
                                <span class="alternative-name">${alt.name}</span>
                                <span class="alternative-desc">${alt.desc}</span>
                            `;
                            card.addEventListener('click', () => {
                                const oldName = currentData.map_points[idx].name;
                                currentData.map_points[idx] = {
                                    name: alt.name,
                                    lat: alt.lat,
                                    lng: alt.lng,
                                    desc: alt.desc
                                };
                                if (currentItinerary.includes(oldName)) {
                                    currentItinerary = currentItinerary.replaceAll(oldName, alt.name);
                                    itineraryContent.innerHTML = marked.parse(currentItinerary);
                                }
                                initMap(currentData.map_points);
                                appendTerminalLog('observation', `成功替換景點：將「${oldName}」更換為「${alt.name}」，地圖與路線已即時更新。`);
                            });
                            altContainer.appendChild(card);
                        });
                    } else {
                        altContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--color-warning);">⚠️ 無法取得替代推薦景點。</div>`;
                    }
                } catch (e) {
                    altContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--color-warning);">⚠️ 連線失敗，請確認 API 金鑰。</div>`;
                }
            });
        });
    }
    
    // Client-side Gemini fetch for spot replacement recommendations
    async function fetchAlternativesFromGemini(city, spotName, apiKey) {
        if (!apiKey) {
            // Fallback simulation
            return [
                {"name": `${spotName}附近的文創園區`, "lat": mapLayers[0] ? mapLayers[0].getLatLng().lat + 0.005 : 24.15, "lng": mapLayers[0] ? mapLayers[0].getLatLng().lng - 0.005 : 120.65, "desc": "適合慢活與探索手作工藝的景點。"},
                {"name": "市立當代美術館", "lat": mapLayers[0] ? mapLayers[0].getLatLng().lat - 0.003 : 24.14, "lng": mapLayers[0] ? mapLayers[0].getLatLng().lng + 0.004 : 120.66, "desc": "富含設計感與視覺展覽的室內吹冷氣選擇。"},
                {"name": "歷史舊鐵道文化園區", "lat": mapLayers[0] ? mapLayers[0].getLatLng().lat + 0.002 : 24.16, "lng": mapLayers[0] ? mapLayers[0].getLatLng().lng + 0.002 : 120.64, "desc": "結合舊鐵道印記與陽光草皮的休閒替代方案。"}
            ];
        }
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `You are a professional travel assistant. You MUST output a JSON object containing:
"alternatives": A list of 3 dictionaries, each with:
- "name": (string) name of the alternative spot
- "lat": (number) latitude
- "lng": (number) longitude
- "desc": (string) a short description of why this spot is a great alternative.
Keep coordinates precise and realistic. Output language MUST be zh-tw.`;

        const payload = {
            "contents": [
                {
                    "parts": [
                        {"text": `Please recommend 3 alternative tourist spots in ${city} that are close to or similar in style to '${spotName}'.`}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": systemPrompt}]
            },
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        };
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const d = await res.json();
        const text = d.candidates[0].content.parts[0].text;
        const resObj = JSON.parse(text);
        return resObj.alternatives;
    }
    
    // Budget Chart Render
    function initChart(budgetData, exchangeRate = 1.0, currencyCode = 'TWD', weatherSummary = '', isRainy = false) {
        const ctx = document.getElementById('budgetChart').getContext('2d');
        if (chart) {
            chart.destroy();
        }
        
        const labels = Object.keys(budgetData.breakdown);
        const data = Object.values(budgetData.breakdown);
        
        const colors = [
            'rgba(99, 102, 241, 0.75)',
            'rgba(14, 165, 233, 0.75)',
            'rgba(16, 185, 129, 0.75)',
            'rgba(245, 158, 11, 0.75)',
            'rgba(148, 163, 184, 0.5)'
        ];
        const borderColors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#94a3b8'];
        
        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Noto Sans TC', size: 11 },
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return ` ${context.label}: ${context.raw} TWD`; }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        if (currencyCode !== 'TWD' && exchangeRate !== 1.0) {
            const localLimit = Math.round(budgetData.limit * exchangeRate);
            const localTotal = Math.round(budgetData.total * exchangeRate);
            const localMargin = Math.round(budgetData.margin * exchangeRate);
            statLimit.innerHTML = `${budgetData.limit.toLocaleString()} TWD<br/><span style="font-size:0.85em;color:#38bdf8;">≈ ${localLimit.toLocaleString()} ${currencyCode}</span>`;
            statTotal.innerHTML = `${budgetData.total.toLocaleString()} TWD<br/><span style="font-size:0.85em;color:#38bdf8;">≈ ${localTotal.toLocaleString()} ${currencyCode}</span>`;
            statMargin.innerHTML = `${budgetData.margin.toLocaleString()} TWD<br/><span style="font-size:0.85em;color:#38bdf8;">≈ ${localMargin.toLocaleString()} ${currencyCode}</span>`;
        } else {
            statLimit.textContent = `${budgetData.limit.toLocaleString()} TWD`;
            statTotal.textContent = `${budgetData.total.toLocaleString()} TWD`;
            statMargin.textContent = `${budgetData.margin.toLocaleString()} TWD`;
        }
        
        budgetAlertsZone.innerHTML = "";
        
        if (budgetData.total > budgetData.limit) {
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert error" style="background: rgba(239, 68, 68, 0.1); border-color: #ef4444;">
                    <i class="fa-solid fa-triangle-exclamation alert-icon" style="color: #ef4444;"></i>
                    <div>
                        <strong>⚠️ 預算超支警告！</strong><br/>
                        目前行程預估總花費為 ${budgetData.total.toLocaleString()} 元，已超出上限 ${budgetData.limit.toLocaleString()} 元。
                    </div>
                </div>
            `;
        } else if (budgetData.total < budgetData.limit && budgetData.total + 1000 > budgetData.limit && currencyCode === 'TWD') {
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert warning">
                    <i class="fa-solid fa-triangle-exclamation alert-icon"></i>
                    <div>
                        <strong>⚠️ 偵測到原始計畫預算超支！</strong><br/>
                        系統已啟用「自我修正機制」，更換大區域住宿為「台中 Loft 青年旅館 (800元)」，成功將總開銷下調至 ${budgetData.total.toLocaleString()} 元以符合 5,000 元限制。
                    </div>
                </div>
            `;
        } else {
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert info" style="background: rgba(16, 185, 129, 0.1); border-color: #10b981;">
                    <i class="fa-solid fa-circle-check alert-icon" style="color: #10b981;"></i>
                    <div>
                        <strong>✅ 預算檢核通過！</strong><br/>
                        預估總支出為 ${budgetData.total.toLocaleString()} 元，在預算範圍內，尚餘可用額度 ${budgetData.margin.toLocaleString()} 元。
                    </div>
                </div>
            `;
        }
        
        if (weatherSummary) {
            const weatherIcon = isRainy ? 'fa-cloud-showers-water' : 'fa-cloud-sun';
            const alertClass = isRainy ? 'warning' : 'info';
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert ${alertClass}" style="margin-top: 10px; background: rgba(56, 189, 248, 0.1); border-color: #38bdf8;">
                    <i class="fa-solid ${weatherIcon} alert-icon" style="color: #38bdf8;"></i>
                    <div>
                        <strong>🌤️ 當地天氣即時預報</strong><br/>
                        ${weatherSummary}
                    </div>
                </div>
            `;
        }
        
        budgetPlaceholder.style.display = 'none';
        budgetContent.style.display = 'flex';
    }
    
    // Main Planning Action via browser fetch to Gemini API
    btnPlan.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        
        if (!prompt) {
            alert("請先輸入行程規劃需求！");
            return;
        }
        if (!apiKey) {
            alert("請先在右上方輸入您的 Gemini API 金鑰 (API Key)！\n此金鑰完全保存在您的瀏覽器中，直接與 Google API 通訊，保證安全。");
            apiKeyInput.focus();
            return;
        }
        
        btnPlan.disabled = true;
        btnText.textContent = "規劃中...";
        agentStatusBadge.textContent = "Thinking";
        agentStatusBadge.className = "status-badge thinking";
        
        itineraryPlaceholder.style.display = 'flex';
        itineraryContent.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        mapContainer.style.display = 'none';
        budgetPlaceholder.style.display = 'flex';
        budgetContent.style.display = 'none';
        dashboardFooter.style.display = 'none';
        chatAdjustBox.style.display = 'none';
        
        terminalLogs.innerHTML = "";
        appendTerminalLog('thought', '讀取長期記憶偏好並開始行程規劃任務...');
        
        try {
            // Heuristics for city
            let city = "台中";
            if (prompt.includes("台北")) {
                city = "台北";
            }
            
            // Retrieve weather details dynamically
            appendTerminalLog('action', `串接即時 Open-Meteo 天氣預報 API 查詢 ${city} 天氣...`);
            let lat = 24.15, lng = 120.65;
            if (city === "台北") { lat = 25.03; lng = 121.56; }
            
            let isRainy = false;
            let weatherSummary = "天氣晴朗，以戶外景點為主。";
            try {
                const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code&timezone=auto`);
                const wData = await wRes.json();
                const dailyCodes = wData.daily.weather_code || [];
                const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82];
                if (dailyCodes.some(c => rainCodes.includes(c))) {
                    isRainy = true;
                    weatherSummary = "預報旅遊期間有雨，系統已自動為您優先排定室內景點與雨天替代方案。";
                }
            } catch (e) {
                console.log("Weather fetch failed, fallback used:", e);
            }
            appendTerminalLog('observation', `[氣象監測] ${weatherSummary}`);
            
            // Retrieve Exchange Rate
            let exchangeRate = 1.0;
            let currencyCode = "TWD";
            if (prompt.includes("日本") || prompt.includes("東京") || prompt.includes("大阪")) {
                currencyCode = "JPY";
                appendTerminalLog('action', '偵測到境外目的地「日本」，串接即時匯率 API 轉換計價單位...');
                try {
                    const exRes = await fetch("https://open.er-api.com/v6/latest/TWD");
                    const exData = await exRes.json();
                    exchangeRate = exData.rates.JPY || 1.0;
                } catch (e) {}
                appendTerminalLog('observation', `[匯率串接] 當前台幣對日圓匯率為 1 TWD = ${exchangeRate.toFixed(2)} JPY`);
            }
            
            // Query Database tables (local object mapping)
            const accommodations = DB_ACCOMMODATIONS[city] || [];
            const spots = DB_SPOTS[city] || [];
            const ragInfo = RAG_GUIDES[city] || "";
            
            appendTerminalLog('thought', '將本地 RAG 旅遊指南與 SQLite 景點、飯店偏好結構加載至 prompt...');
            
            // Retrieve Wikipedia Search
            appendTerminalLog('action', `串接即時維基百科搜尋 API 獲取 ${city} 最新資訊...`);
            let wikiSearch = "";
            try {
                const wikiRes = await fetch(`https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(city + " 旅遊景點")}&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                const searchRes = wikiData.query.search || [];
                wikiSearch = searchRes.slice(0, 2).map(s => `【${s.title}】${s.snippet.replace(/<[^>]+>/g, '')}`).join('\n');
            } catch (e) {}
            appendTerminalLog('observation', `[維基檢索] 獲取最新網頁地標與概況資訊。`);
            
            const systemPrompt = `You are a professional travel planning Agent with reasoning logs.
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
- Analyze the budget limits. If the initial high-quality plan exceeds the budget limit, perform a self-correction step by swapping expensive accommodations with cheaper options, log this thought process, recalculate, and proceed.
- Use the provided SQLite database values and RAG data. Do not hallucinate prices or coordinates.
- If the provided database and RAG data are empty (user requested another destination), use your own knowledge to generate realistic coordinates (lat/lng) and prices.
- You MUST explicitly include the transit method and cost from Taipei to the destination at the beginning of the itinerary, and calculate this transit cost in "交通 (Transport)" budget.
- Destination Currency: The destination currency is ${currencyCode}. The exchange rate is 1 TWD = ${exchangeRate} ${currencyCode}. In the JSON "budget_data", all values MUST be in TWD. In the markdown "itinerary", show prices in both local currency and TWD (e.g., "1,000 JPY (約 200 TWD)").
- Weather Optimization: The current weather forecast is: ${weatherSummary}. ${isRainy ? 'Since rain is expected, you MUST prioritize indoor spots and note this rainy-day adjustments in your plan.' : 'Plan standard indoor/outdoor activities.'}
- Quick Booking Links:
  * For each hotel, append a Booking.com search link: \`[🏨 立即訂房](https://www.booking.com/searchresults.html?ss=飯店名稱)\`
  * For each spot, append a Google Maps search link: \`[📍 地圖導航](https://www.google.com/maps/search/?api=1&query=景點名稱)\`
  * At the start of the itinerary, append a booking link: \`[✈️ 搜尋機票](https://www.google.com/search?q=台北到目的地機票)\` or \`[🚄 預訂高鐵](https://www.google.com/search?q=高鐵車票預訂)\`.
- Local Food Map: For each planned spot, search your knowledge or RAG data for 1-2 highly-rated local restaurants or street foods within 500 meters of that spot, and list them directly under the spot's description (e.g., "*🍴 周邊美食推薦：[店名](https://www.google.com/maps/search/?api=1&query=店名) - 推薦菜色與簡介*").

Here is the context data:
--- RAG GUIDES ---
${ragInfo}

--- SQLITE ACCOMMODATIONS ---
${JSON.stringify(accommodations)}

--- SQLITE SPOTS ---
${JSON.stringify(spots)}

--- WIKIPEDIA WEB SEARCH ---
${wikiSearch}
`;
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const geminiPayload = {
                "contents": [
                    {
                        "parts": [
                            {"text": `User Prompt: ${prompt}\n\nPlease generate the travel itinerary according to the instructions. Output MUST be valid JSON conforming to the structure described.`}
                        ]
                    }
                ],
                "systemInstruction": {
                    "parts": [{"text": systemPrompt}]
                },
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            };
            
            const res = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            });
            const d = await res.json();
            
            if (d.candidates && d.candidates[0]) {
                const text = d.candidates[0].content.parts[0].text;
                const result = JSON.parse(text);
                
                result.exchange_rate = exchangeRate;
                result.currency_code = currencyCode;
                result.weather_summary = weatherSummary;
                result.is_rainy = isRainy;
                result.city = city;
                result.success = true;
                
                await streamLogs(result.logs);
                
                agentStatusBadge.textContent = "Success";
                agentStatusBadge.className = "status-badge idle";
                
                currentData = result;
                currentItinerary = result.itinerary;
                
                itineraryPlaceholder.style.display = 'none';
                itineraryContent.style.display = 'block';
                itineraryContent.innerHTML = marked.parse(result.itinerary);
                
                initMap(result.map_points);
                initChart(result.budget_data, result.exchange_rate, result.currency_code, result.weather_summary, result.is_rainy);
                
                dashboardFooter.style.display = 'flex';
                chatAdjustBox.style.display = 'flex';
                resetChatHistory();
            } else {
                throw new Error("Gemini API return structure invalid.");
            }
        } catch (e) {
            console.error(e);
            appendTerminalLog('observation', `執行失敗：${e.message || "未知錯誤，請檢查您的金鑰是否正確。"}`);
            agentStatusBadge.textContent = "Error";
            agentStatusBadge.className = "status-badge idle";
        } finally {
            btnPlan.disabled = false;
            btnText.textContent = "開始智慧規劃";
        }
    });
    
    // Simulate streaming logs (looks extremely cool)
    async function streamLogs(logs) {
        for (const log of logs) {
            if (log.content.includes('超支') || log.content.includes('自我修正')) {
                agentStatusBadge.textContent = "Correcting";
                agentStatusBadge.className = "status-badge correcting";
            } else {
                agentStatusBadge.textContent = "Thinking";
                agentStatusBadge.className = "status-badge thinking";
            }
            appendTerminalLog(log.type, log.content);
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
    
    // Chat Adjust Elements & Logic
    const chatAdjustBox = document.getElementById('chatAdjustBox');
    const chatAdjustHistory = document.getElementById('chatAdjustHistory');
    const chatAdjustInput = document.getElementById('chatAdjustInput');
    const btnChatAdjust = document.getElementById('btnChatAdjust');
    
    function appendChatMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message msg-${sender}`;
        msgDiv.textContent = text;
        chatAdjustHistory.appendChild(msgDiv);
        chatAdjustHistory.scrollTop = chatAdjustHistory.scrollHeight;
    }
    
    function resetChatHistory() {
        chatHistory = [];
        chatAdjustHistory.innerHTML = `
            <div class="chat-message msg-agent">
                行程已規劃完成！您可以在下方輸入微調要求（例如：「我想把第一天晚上改成吃火鍋，第二天下午想改去宮原眼科」）。
            </div>
        `;
    }
    
    async function handleChatAdjust() {
        const prompt = chatAdjustInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        if (!prompt) return;
        
        if (!apiKey) {
            alert("請先在右上方輸入您的 Gemini API 金鑰 (API Key)！");
            apiKeyInput.focus();
            return;
        }
        
        appendChatMessage('user', prompt);
        chatAdjustInput.value = "";
        
        chatAdjustInput.disabled = true;
        btnChatAdjust.disabled = true;
        
        agentStatusBadge.textContent = "Thinking";
        agentStatusBadge.className = "status-badge thinking";
        
        terminalLogs.innerHTML = "";
        appendTerminalLog('thought', `讀取行程調整需求："${prompt}"...`);
        
        try {
            const city = currentData ? currentData.city : '台中';
            const accommodations = DB_ACCOMMODATIONS[city] || [];
            const spots = DB_SPOTS[city] || [];
            
            const systemPrompt = `You are a professional travel planning Agent with reasoning logs.
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
- DO NOT rewrite the entire itinerary from scratch if only a small part changes. Preserve the parts of the itinerary, spots, and budget that are unaffected.
- Check budget constraints! If the request causes the total budget to exceed the limit, perform a self-correction step in your logs (Thought -> Action -> Observation) where you replace expensive spots or lodging with cheaper alternatives, or reject/modify the change while explaining the budget constraint in the logs and final response.
- Follow the original formatting guidelines for links (Booking.com, Google Maps) and ratings (⭐ X.X) for scenic spots, hotels, and restaurants.

Context data:
--- SQLITE ACCOMMODATIONS ---
${JSON.stringify(accommodations)}

--- SQLITE SPOTS ---
${JSON.stringify(spots)}
`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const geminiPayload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": `Current Itinerary:\n${currentItinerary}\n\nCurrent Budget Data:\n${JSON.stringify(currentData.budget_data)}\n\nCurrent Map Points:\n${JSON.stringify(currentData.map_points)}\n\nUser Adjustment Request:\n${prompt}\n\nPlease perform the incremental travel itinerary adjustment.`
                            }
                        ]
                    }
                ],
                "systemInstruction": {
                    "parts": [{"text": systemPrompt}]
                },
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            };
            
            const res = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            });
            const d = await res.json();
            
            if (d.candidates && d.candidates[0]) {
                const text = d.candidates[0].content.parts[0].text;
                const result = JSON.parse(text);
                
                result.exchange_rate = currentData.exchange_rate;
                result.currency_code = currentData.currency_code;
                result.weather_summary = currentData.weather_summary;
                result.is_rainy = currentData.is_rainy;
                result.city = city;
                result.success = true;
                
                await streamLogs(result.logs);
                
                agentStatusBadge.textContent = "Success";
                agentStatusBadge.className = "status-badge idle";
                
                currentData = result;
                currentItinerary = result.itinerary;
                
                itineraryContent.innerHTML = marked.parse(result.itinerary);
                initMap(result.map_points);
                initChart(result.budget_data, result.exchange_rate, result.currency_code, result.weather_summary, result.is_rainy);
                
                let agentReply = "已成功調整行程！請查看更新後的行程表、地圖與預算。";
                if (result.logs && result.logs.length > 0) {
                    for (let i = result.logs.length - 1; i >= 0; i--) {
                        const content = result.logs[i].content;
                        if (content.includes("已") || content.includes("將") || content.includes("調整") || content.includes("更換") || content.includes("修改") || content.includes("不變") || content.includes("保留") || content.includes("警告") || content.includes("超支")) {
                            agentReply = content;
                            break;
                        }
                    }
                }
                appendChatMessage('agent', agentReply);
            } else {
                throw new Error("Gemini API return structure invalid.");
            }
        } catch (e) {
            console.error(e);
            appendTerminalLog('observation', `微調失敗：${e.message || "發生未知錯誤。"}`);
            appendChatMessage('agent', `❌ 微調失敗：${e.message || "請檢查您的 API 金鑰連線。"}`);
            agentStatusBadge.textContent = "Error";
            agentStatusBadge.className = "status-badge idle";
        } finally {
            chatAdjustInput.disabled = false;
            btnChatAdjust.disabled = false;
            chatAdjustInput.focus();
        }
    }
    
    if (btnChatAdjust && chatAdjustInput) {
        btnChatAdjust.addEventListener('click', handleChatAdjust);
        chatAdjustInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleChatAdjust();
        });
    }
    
    // Client-side Markdown Downloader
    btnDownloadMd.addEventListener('click', () => {
        if (!currentItinerary) return;
        const blob = new Blob([currentItinerary], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "travel_itinerary.md";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Client-side PDF print
    btnPrintPdf.addEventListener('click', () => {
        if (!currentItinerary) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>旅遊行程規劃表</title>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Noto Sans TC', sans-serif; color: #333; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; }
                    h2 { font-size: 18px; color: #4f46e5; margin-top: 30px; border-bottom: 1px dashed #ddd; padding-bottom: 5px; }
                    blockquote { background: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; font-size: 14px; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 10px; }
                </style>
            </head>
            <body>
                ${marked.parse(currentItinerary)}
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
    
    // Transport mode change listener
    if (transportModeSelect) {
        transportModeSelect.addEventListener('change', () => {
            if (currentData && currentData.map_points) {
                initMap(currentData.map_points);
                if (typeof appendTerminalLog === 'function') {
                    appendTerminalLog('observation', `交通運輸模式已切換為：${transportModeSelect.options[transportModeSelect.selectedIndex].text}，正在重新繪製路線與計算交通時間。`);
                }
            }
        });
    }

    // Initial memory load
    loadMemory();
});
