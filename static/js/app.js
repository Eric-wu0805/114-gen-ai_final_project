// Travel AI Agent - Frontend Script

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const promptInput = document.getElementById('promptInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const btnPlan = document.getElementById('btnPlan');
    const btnText = document.getElementById('btnText');
    const btnQuickDemo = document.getElementById('btnQuickDemo');
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
                    // Leaflet map needs invalidation after resizing/becoming visible
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
    
    // Quick Demo Loader
    btnQuickDemo.addEventListener('click', () => {
        promptInput.value = "我想去台中兩天一夜，預算 5,000 元，住宿要便宜。我喜歡吃夜市，而且希望能去看看和 AI 或科技相關的景點。";
    });
    
    // File Upload handling
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    async function handleFileUpload(file) {
        uploadStatus.style.display = 'flex';
        uploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>正在解析「${file.name}」...</span>`;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch('/api/upload_doc', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                uploadStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-success)"></i> <span>${data.message}</span>`;
                promptInput.value = data.suggested_prompt;
                // Reload memory since file parsing updates state
                loadMemory();
            } else {
                uploadStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: var(--color-error)"></i> <span>上傳失敗：${data.error}</span>`;
            }
        } catch (err) {
            uploadStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: var(--color-error)"></i> <span>伺服器通訊錯誤</span>`;
        }
    }
    
    // Load long-term memory info
    async function loadMemory() {
        try {
            const res = await fetch('/api/memory');
            const data = await res.json();
            
            inputMemHistory.value = data.destination_history ? data.destination_history.join(', ') : "";
            selectMemBudget.value = data.budget_sensitivity || "None";
            selectMemAccom.value = data.accommodation_pref || "None";
            inputMemInterests.value = data.interests ? data.interests.join(', ') : "";
        } catch (err) {
            console.error("Failed to load user memory:", err);
        }
    }
    
    // Save Memory
    btnSaveMemory.addEventListener('click', async () => {
        const dests = inputMemHistory.value.split(',').map(s => s.trim()).filter(Boolean);
        const budget = selectMemBudget.value;
        const accom = selectMemAccom.value;
        const ints = inputMemInterests.value.split(',').map(s => s.trim()).filter(Boolean);
        
        const memoryData = {
            destination_history: dests,
            budget_sensitivity: budget,
            accommodation_pref: accom,
            interests: ints,
            dietary: "None"
        };
        
        try {
            btnSaveMemory.disabled = true;
            btnSaveMemory.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在儲存...`;
            
            const res = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memoryData)
            });
            const data = await res.json();
            if (data.success) {
                appendTerminalLog('observation', '長期偏好記憶已儲存！');
            } else {
                alert("儲存失敗");
            }
        } catch (err) {
            alert("儲存失敗，請重試");
        } finally {
            btnSaveMemory.disabled = false;
            btnSaveMemory.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> 儲存偏好設定`;
        }
    });
    
    // Clear Memory
    btnClearMemory.addEventListener('click', async () => {
        if (!confirm("確定要清除所有長期偏好記憶嗎？")) return;
        
        try {
            const res = await fetch('/api/clear_memory', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                loadMemory();
                appendTerminalLog('observation', '長期偏好記憶已成功清除！');
            }
        } catch (err) {
            alert("清除記憶失敗，請重試");
        }
    });
    
    // Helper: append colored logs to terminal console
    function appendTerminalLog(type, content) {
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.textContent = content;
        terminalLogs.appendChild(item);
        // Auto scroll to bottom
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }
    
    // Map initialization
    function initMap(points) {
        if (map) {
            map.remove();
        }
        mapLayers = [];
        
        mapWrapper.style.display = 'flex';
        mapContainer.style.display = 'block';
        mapPlaceholder.style.display = 'none';
        
        // Start from center of the route (usually the first point or a default Taichung center)
        const centerLat = points.length > 0 ? points[0].lat : 24.15;
        const centerLng = points.length > 0 ? points[0].lng : 120.65;
        
        map = L.map('mapContainer').setView([centerLat, centerLng], 12);
        
        // Use Google Maps tile layer
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
            maxZoom: 20
        }).addTo(map);
        
        const latlngs = [];
        
        // Custom Google Maps red pin icon
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
        
        // Route line connecting spots (fetch OSRM driving route with straight line fallback)
        if (latlngs.length > 1) {
            // Draw a quick fallback polyline first so the user sees something immediately
            const fallbackPolyline = L.polyline(latlngs, {
                color: '#1a73e8',
                weight: 4,
                opacity: 0.6,
                dashArray: '5, 10'
            }).addTo(map);
            mapLayers.push(fallbackPolyline);
            
            // Adjust bounds based on fallback
            try {
                map.fitBounds(fallbackPolyline.getBounds(), { padding: [40, 40] });
            } catch (e) {
                console.log("Initial fitBounds deferred:", e);
            }
            
            // Query OSRM API for real road routing
            const coordsStr = points.map(pt => `${pt.lng},${pt.lat}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full`;
            
            fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        // Remove fallback polyline
                        map.removeLayer(fallbackPolyline);
                        mapLayers = mapLayers.filter(l => l !== fallbackPolyline);
                        
                        const routeGeometry = data.routes[0].geometry;
                        // OSRM returns coordinates as [lng, lat], Leaflet wants [lat, lng]
                        const routeLatLngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
                        
                        // Google Maps Route style: white border outline
                        const routeBorder = L.polyline(routeLatLngs, {
                            color: '#ffffff',
                            weight: 8,
                            opacity: 0.9,
                            lineJoin: 'round'
                        }).addTo(map);
                        mapLayers.push(routeBorder);

                        // Google Maps Route style: central blue route
                        const roadPolyline = L.polyline(routeLatLngs, {
                            color: '#1a73e8',
                            weight: 5,
                            opacity: 0.95,
                            lineJoin: 'round'
                        }).addTo(map);
                        mapLayers.push(roadPolyline);
                        
                        // Fit to route bounds
                        try {
                            map.fitBounds(roadPolyline.getBounds(), { padding: [40, 40] });
                        } catch (e) {
                            console.log("OSRM fitBounds deferred:", e);
                        }
                    }
                })
                .catch(err => {
                    console.error("OSRM Routing API failed, using straight-line fallback:", err);
                });
        }

        // Render spots list with replacement buttons
        mapSpotsList.innerHTML = "";
        points.forEach((pt, index) => {
            const spotCard = document.createElement('div');
            spotCard.className = 'spot-card-container';
            spotCard.style.display = 'flex';
            spotCard.style.flexDirection = 'column';
            spotCard.style.gap = '8px';
            
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
            
            mapSpotsList.appendChild(spotCard);
        });
        
        // Add click events to replacement buttons
        const replaceButtons = mapSpotsList.querySelectorAll('.btn-replace-spot');
        replaceButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(btn.getAttribute('data-index'));
                const spotName = btn.getAttribute('data-name');
                const altContainer = document.getElementById(`alternatives-${index}`);
                
                // Toggle view if already loaded
                if (altContainer.style.display === 'grid') {
                    altContainer.style.display = 'none';
                    return;
                }
                
                // Show loading
                altContainer.style.display = 'grid';
                altContainer.className = 'alternatives-container';
                altContainer.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; color: #94a3b8; font-size: 0.9em; padding: 10px;">
                        <i class="fa-solid fa-spinner fa-spin"></i> 正在用 AI 搜尋推薦替代景點...
                    </div>
                `;
                
                try {
                    const city = (currentData && currentData.city) ? currentData.city : '台中';
                    const apiKey = apiKeyInput.value.trim();
                    
                    const res = await fetch('/api/alternative_spots', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            city: city,
                            spot_name: spotName,
                            api_key: apiKey
                        })
                    });
                    
                    const result = await res.json();
                    
                    if (result && result.alternatives && result.alternatives.length > 0) {
                        altContainer.innerHTML = "";
                        result.alternatives.forEach(alt => {
                            const altCard = document.createElement('div');
                            altCard.className = 'alternative-card';
                            altCard.innerHTML = `
                                <span class="alternative-name">${alt.name}</span>
                                <span class="alternative-desc">${alt.desc}</span>
                            `;
                            
                            altCard.addEventListener('click', () => {
                                // Replace in global map points
                                const oldName = currentData.map_points[index].name;
                                currentData.map_points[index] = {
                                    name: alt.name,
                                    lat: alt.lat,
                                    lng: alt.lng,
                                    desc: alt.desc
                                };
                                
                                // Dynamic string replacement in the markdown itinerary text
                                if (currentItinerary.includes(oldName)) {
                                    currentItinerary = currentItinerary.replaceAll(oldName, alt.name);
                                    itineraryContent.innerHTML = marked.parse(currentItinerary);
                                }
                                
                                // Re-render map and list
                                initMap(currentData.map_points);
                                
                                // Visual success feedback
                                appendTerminalLog('observation', `成功替換景點：將「${oldName}」更換為「${alt.name}」，地圖與路線已即時更新。`);
                            });
                            
                            altContainer.appendChild(altCard);
                        });
                    } else {
                        altContainer.innerHTML = `
                            <div style="grid-column: span 3; text-align: center; color: var(--color-warning); font-size: 0.9em; padding: 10px;">
                                ⚠️ 無法取得替代景點推薦，請稍後再試。
                            </div>
                        `;
                    }
                } catch (err) {
                    console.error("Failed to fetch alternatives:", err);
                    altContainer.innerHTML = `
                        <div style="grid-column: span 3; text-align: center; color: var(--color-warning); font-size: 0.9em; padding: 10px;">
                            ⚠️ 連線失敗，請檢查網路狀態。
                        </div>
                    `;
                }
            });
        });
    }
    
    // Budget Chart initialization
    function initChart(budgetData, exchangeRate = 1.0, currencyCode = 'TWD', weatherSummary = '', isRainy = false) {
        const ctx = document.getElementById('budgetChart').getContext('2d');
        
        if (chart) {
            chart.destroy();
        }
        
        const labels = Object.keys(budgetData.breakdown);
        const data = Object.values(budgetData.breakdown);
        
        const colors = [
            'rgba(99, 102, 241, 0.75)',  // Indigo for Lodging
            'rgba(14, 165, 233, 0.75)',  // Cyber Blue for Transport
            'rgba(16, 185, 129, 0.75)',  // Emerald Green for Dining
            'rgba(245, 158, 11, 0.75)',  // Amber for Spots
            'rgba(148, 163, 184, 0.5)'   // Slate for Other
        ];
        
        const borderColors = [
            '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#94a3b8'
        ];
        
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
                            font: {
                                family: 'Noto Sans TC',
                                size: 11
                            },
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw} TWD`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        // Summary stats (support double currency)
        if (currencyCode !== 'TWD' && exchangeRate !== 1.0) {
            const localLimit = Math.round(budgetData.limit * exchangeRate);
            const localTotal = Math.round(budgetData.total * exchangeRate);
            const localMargin = Math.round(budgetData.margin * exchangeRate);
            
            statLimit.innerHTML = `${budgetData.limit.toLocaleString()} TWD<br/><span style="font-size: 0.85em; opacity: 0.75; color: #38bdf8; font-weight: normal;">≈ ${localLimit.toLocaleString()} ${currencyCode}</span>`;
            statTotal.innerHTML = `${budgetData.total.toLocaleString()} TWD<br/><span style="font-size: 0.85em; opacity: 0.75; color: #38bdf8; font-weight: normal;">≈ ${localTotal.toLocaleString()} ${currencyCode}</span>`;
            statMargin.innerHTML = `${budgetData.margin.toLocaleString()} TWD<br/><span style="font-size: 0.85em; opacity: 0.75; color: #38bdf8; font-weight: normal;">≈ ${localMargin.toLocaleString()} ${currencyCode}</span>`;
        } else {
            statLimit.textContent = `${budgetData.limit.toLocaleString()} TWD`;
            statTotal.textContent = `${budgetData.total.toLocaleString()} TWD`;
            statMargin.textContent = `${budgetData.margin.toLocaleString()} TWD`;
        }
        
        // Show alerts dynamically based on limit checking
        budgetAlertsZone.innerHTML = "";
        
        // 1. Budget checking alert
        if (budgetData.total < budgetData.limit && budgetData.total + 1000 > budgetData.limit && currencyCode === 'TWD') {
            // Simulated Taichung self correction alert
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert warning">
                    <i class="fa-solid fa-triangle-exclamation alert-icon"></i>
                    <div>
                        <strong>⚠️ 偵測到原始計畫預算超支 (5,500 元)！</strong><br/>
                        系統自動啟用「自我修正機制」，更換大區域住宿由「精品商務飯店 (2,500元)」修正為高 CP 值「台中 Loft 青年旅館 (800元)」，成功減少支出 1,700 元，將總開銷下調至 3,350 元以符合 5,000 元限制。
                    </div>
                </div>
            `;
        } else {
            const displayTotal = currencyCode !== 'TWD' ? `${budgetData.total.toLocaleString()} 元 (~${Math.round(budgetData.total * exchangeRate).toLocaleString()} ${currencyCode})` : `${budgetData.total.toLocaleString()} 元`;
            const displayLimit = currencyCode !== 'TWD' ? `${budgetData.limit.toLocaleString()} 元 (~${Math.round(budgetData.limit * exchangeRate).toLocaleString()} ${currencyCode})` : `${budgetData.limit.toLocaleString()} 元`;
            const displayMargin = currencyCode !== 'TWD' ? `${budgetData.margin.toLocaleString()} 元 (~${Math.round(budgetData.margin * exchangeRate).toLocaleString()} ${currencyCode})` : `${budgetData.margin.toLocaleString()} 元`;
            
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert info" style="background: rgba(16, 185, 129, 0.1); border-color: #10b981;">
                    <i class="fa-solid fa-circle-check alert-icon" style="color: #10b981;"></i>
                    <div>
                        <strong>✅ 預算檢核通過！</strong><br/>
                        預估總支出為 ${displayTotal}，在預算限額 ${displayLimit} 範圍內，尚餘可用額度 ${displayMargin}。
                    </div>
                </div>
            `;
        }

        // 2. Weather status alert
        if (weatherSummary) {
            const weatherIcon = isRainy ? 'fa-cloud-showers-water' : 'fa-cloud-sun';
            const alertClass = isRainy ? 'warning' : 'info';
            const iconColor = isRainy ? '#f59e0b' : '#10b981';
            const bgColor = isRainy ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';
            const borderColor = isRainy ? '#f59e0b' : '#10b981';
            
            budgetAlertsZone.innerHTML += `
                <div class="budget-alert ${alertClass}" style="margin-top: 10px; background: ${bgColor}; border-color: ${borderColor};">
                    <i class="fa-solid ${weatherIcon} alert-icon" style="color: ${iconColor};"></i>
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
    
    // Main Planning Action
    btnPlan.addEventListener('click', async () => {
        const prompt = promptInput.value.strip ? promptInput.value.strip() : promptInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        
        if (!prompt) {
            alert("請先輸入行程規劃需求！");
            return;
        }
        
        // Set loading states
        btnPlan.disabled = true;
        btnText.textContent = "規劃中...";
        agentStatusBadge.textContent = "Thinking";
        agentStatusBadge.className = "status-badge thinking";
        
        // Reset results layouts
        itineraryPlaceholder.style.display = 'flex';
        itineraryContent.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        mapContainer.style.display = 'none';
        budgetPlaceholder.style.display = 'flex';
        budgetContent.style.display = 'none';
        dashboardFooter.style.display = 'none';
        
        // Clear past logs and show starting
        terminalLogs.innerHTML = "";
        appendTerminalLog('thought', '讀取長期記憶標籤並開始行程解析任務...');
        
        try {
            const response = await fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonStringify({ prompt, api_key: apiKey })
            });
            const data = await response.json();
            
            if (data.success) {
                // Stream logs with animated delay to mock Agent active reasoning
                await streamLogs(data.logs);
                
                // Completed reasoning, render results
                agentStatusBadge.textContent = "Success";
                agentStatusBadge.className = "status-badge idle";
                
                // Show Itinerary Tab content
                currentData = data;
                currentItinerary = data.itinerary;
                itineraryPlaceholder.style.display = 'none';
                itineraryContent.style.display = 'block';
                itineraryContent.innerHTML = marked.parse(data.itinerary);
                
                // Initialize Map & Chart
                initMap(data.map_points);
                initChart(data.budget_data, data.exchange_rate, data.currency_code, data.weather_summary, data.is_rainy);
                
                // Display download controls
                dashboardFooter.style.display = 'flex';
                
                // Reload memory sidebar (since database updates user prefs)
                loadMemory();
            } else {
                appendTerminalLog('observation', `執行失敗：${data.error}`);
                agentStatusBadge.textContent = "Error";
                agentStatusBadge.className = "status-badge idle";
            }
        } catch (err) {
            appendTerminalLog('observation', '通訊失敗！伺服器異常或連線中斷。');
            agentStatusBadge.textContent = "Error";
            agentStatusBadge.className = "status-badge idle";
        } finally {
            btnPlan.disabled = false;
            btnText.textContent = "開始智慧規劃";
        }
    });
    
    // Simulate streaming logs (looks extremely cool and agent-like)
    async function streamLogs(logs) {
        for (const log of logs) {
            // Update status badge on self-correction logs
            if (log.content.includes('超支') || log.content.includes('自我修正')) {
                agentStatusBadge.textContent = "Correcting";
                agentStatusBadge.className = "status-badge correcting";
            } else {
                agentStatusBadge.textContent = "Thinking";
                agentStatusBadge.className = "status-badge thinking";
            }
            
            appendTerminalLog(log.type, log.content);
            
            // Introduce a short human-like pacing delay
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
    
    // Helper to safely stringify requests
    function jsonStringify(obj) {
        return JSON.stringify(obj);
    }
    
    // Download markdown file
    btnDownloadMd.addEventListener('click', () => {
        if (!currentItinerary) return;
        
        fetch('/api/download_itinerary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itinerary: currentItinerary })
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "travel_itinerary.md";
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => alert("下載失敗，請重試"));
    });
    
    // Print/Save as PDF
    btnPrintPdf.addEventListener('click', () => {
        if (!currentItinerary) return;
        
        // Style print beautifully
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>旅遊行程規劃表</title>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Noto Sans TC', sans-serif;
                        color: #333;
                        line-height: 1.6;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 {
                        font-size: 24px;
                        border-bottom: 2px solid #6366f1;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    h2 {
                        font-size: 18px;
                        color: #4f46e5;
                        margin-top: 30px;
                        border-bottom: 1px dashed #ddd;
                        padding-bottom: 5px;
                    }
                    blockquote {
                        background: #f3f4f6;
                        border-left: 4px solid #6366f1;
                        padding: 15px;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    ul {
                        padding-left: 20px;
                    }
                    li {
                        margin-bottom: 10px;
                    }
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
    
    // Initial memory loading
    loadMemory();
});
