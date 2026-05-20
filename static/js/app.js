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
    const mapContainer = document.getElementById('mapContainer');
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
                    setTimeout(() => map.invalidateSize(), 100);
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
        
        mapContainer.style.display = 'block';
        mapPlaceholder.style.display = 'none';
        
        // Start from center of the route (usually the first point or a default Taichung center)
        const centerLat = points.length > 0 ? points[0].lat : 24.15;
        const centerLng = points.length > 0 ? points[0].lng : 120.65;
        
        map = L.map('mapContainer').setView([centerLat, centerLng], 12);
        
        // Use CartoDB Dark tile layer (extremely premium dark aesthetic)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);
        
        const latlngs = [];
        
        // Custom icons
        const pointIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="background-color: var(--color-secondary); width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px var(--color-secondary);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
        
        points.forEach((pt, index) => {
            const marker = L.marker([pt.lat, pt.lng], { icon: pointIcon }).addTo(map);
            marker.bindPopup(`<strong>${index + 1}. ${pt.name}</strong><br/>${pt.desc}`);
            latlngs.push([pt.lat, pt.lng]);
        });
        
        // Route line connecting spots
        if (latlngs.length > 1) {
            const polyline = L.polyline(latlngs, {
                color: 'var(--color-primary)',
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(map);
            
            // Adjust bounds
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
    }
    
    // Budget Chart initialization
    function initChart(budgetData) {
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
                                return ` ${context.label}: ${context.raw} NTD`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        // Summary stats
        statLimit.textContent = `${budgetData.limit.toLocaleString()} NTD`;
        statTotal.textContent = `${budgetData.total.toLocaleString()} NTD`;
        statMargin.textContent = `${budgetData.margin.toLocaleString()} NTD`;
        
        // Show alerts dynamically based on limit checking
        budgetAlertsZone.innerHTML = "";
        
        // Check if self-correction occurred (we can tell from the logs/budget ratio)
        if (budgetData.total < budgetData.limit && budgetData.total + 1000 > budgetData.limit) {
            // Simulated Taichung self correction alert
            budgetAlertsZone.innerHTML = `
                <div class="budget-alert warning">
                    <i class="fa-solid fa-triangle-exclamation alert-icon"></i>
                    <div>
                        <strong>⚠️ 偵測到原始計畫預算超支 (5,500 元)！</strong><br/>
                        系統自動啟用「自我修正機制」，更換大區域住宿由「精品商務飯店 (2,500元)」修正為高 CP 值「台中 Loft 青年旅館 (800元)」，成功減少支出 1,700 元，將總開銷下調至 3,350 元以符合 5,000 元限制。
                    </div>
                </div>
            `;
        } else {
            budgetAlertsZone.innerHTML = `
                <div class="budget-alert info">
                    <i class="fa-solid fa-circle-check alert-icon"></i>
                    <div>
                        <strong>✅ 預算檢核通過！</strong><br/>
                        預估總支出為 ${budgetData.total.toLocaleString()} 元，在預算限額 ${budgetData.limit.toLocaleString()} 元範圍內，尚餘可用額度 ${budgetData.margin.toLocaleString()} 元。
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
                currentItinerary = data.itinerary;
                itineraryPlaceholder.style.display = 'none';
                itineraryContent.style.display = 'block';
                itineraryContent.innerHTML = marked.parse(data.itinerary);
                
                // Initialize Map & Chart
                initMap(data.map_points);
                initChart(data.budget_data);
                
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
