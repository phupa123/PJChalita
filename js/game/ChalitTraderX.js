document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loadingScreen = document.getElementById('loading-screen');
    const userCoinsEl = document.getElementById('user-coins');
    const assetSelect = document.getElementById('asset-select');
    const chartTypeSelect = document.getElementById('chart-type-select');
    const marketStatusEl = document.getElementById('market-status');
    const chartCanvas = document.getElementById('trade-chart');
    const timeBtns = document.querySelectorAll('.time-btn');
    const tradeAmountInput = document.getElementById('trade-amount');
    const singleBuyToggle = document.getElementById('single-buy-toggle');
    const buyBtn = document.getElementById('buy-btn');
    const sellBtn = document.getElementById('sell-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownTimerEl = document.getElementById('countdown-timer');
    const activeTradesContainer = document.getElementById('active-trades');
    const historyLogContainer = document.getElementById('history-log');
    const activeTradesCountEl = document.getElementById('active-trades-count');
    const resultModalEl = new bootstrap.Modal(document.getElementById('resultModal'));
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');


    // --- Game State ---
    let chart;
    let userCoins = initialUserCoins || 0;
    let selectedTime = 5; // Default 5 seconds
    let activeTrades = [];
    let historyTrades = [];
    let dataInterval;
    let candleInterval;
    let candleCountdownInterval;
    let chartUpdateSpeed = 1000; // Default 1 second
    let candleFormationTime = 30000; // 30 seconds for candlestick
    let currentCandleData = null;
    let candleCountdown = 30;
    const MAX_DATA_POINTS = 50;


    // --- Chart Configuration ---
    let chartConfig = {
        type: 'line',
        data: {
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    ticks: {
                        color: '#8b949e',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        color: '#8b949e',
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                annotation: {
                    annotations: {}
                }
            },
            animation: {
                duration: 500 // Smoother animation
            }
        }
    };

    // Candlestick configuration
    const candlestickConfig = {
        type: 'candlestick',
        data: {
            datasets: [{
                label: 'Candlestick',
                data: [],
                color: {
                    up: '#00C853',
                    down: '#FF1744',
                    unchanged: '#999'
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    ticks: {
                        color: '#8b949e',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        color: '#8b949e',
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            animation: {
                duration: 500
            }
        }
    };

    // --- Functions ---

    /**
     * Initializes the chart and starts data simulation.
     */
    function initChart() {
        const ctx = chartCanvas.getContext('2d');
        chart = new Chart(ctx, chartConfig);
        generateInitialData();
        startDataStream();
        loadTradeHistory();
    }

    /**
     * Loads trade history from the server.
     */
    async function loadTradeHistory() {
        try {
            const response = await fetch('../api/trader-api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_history' })
            });
            const result = await response.json();
            if (result.success) {
                historyTrades = result.trades.map(trade => ({
                    ...trade,
                    status: 'closed',
                    result: trade.result,
                    payout: trade.payout
                }));
                renderHistoryTrades();
            }
        } catch (error) {
            console.error('Failed to load trade history:', error);
        }
    }

    /**
     * Generates initial random data for the chart.
     */
    function generateInitialData() {
        const data = [];
        let value = 100 + Math.random() * 20;
        const now = Date.now();
        for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
            if (chart.config.type === 'candlestick') {
                // Generate OHLC data for candlestick
                const open = value;
                const close = open + (Math.random() - 0.5) * 4;
                const high = Math.max(open, close) + Math.random() * 2;
                const low = Math.min(open, close) - Math.random() * 2;
                data.push({
                    x: now - i * 1000,
                    o: open,
                    h: high,
                    l: low,
                    c: close
                });
                value = close;
            } else {
                data.push({
                    x: now - i * 1000,
                    y: value
                });
                value += (Math.random() - 0.5) * 2;
            }
        }
        chart.data.datasets[0].data = data;
        chart.update();
    }

    /**
     * Simulates a live data stream by adding new data points every second.
     */
    function startDataStream() {
        if (dataInterval) clearInterval(dataInterval);
        dataInterval = setInterval(() => {
            const data = chart.data.datasets[0].data;
            let newDataPoint;

            if (chart.config.type === 'candlestick') {
                // Generate OHLC data for candlestick
                const lastCandle = data.length > 0 ? data[data.length - 1] : { c: 100 };
                const open = lastCandle.c;
                const close = open + (Math.random() - 0.5) * 4;
                const high = Math.max(open, close) + Math.random() * 2;
                const low = Math.min(open, close) - Math.random() * 2;
                newDataPoint = {
                    x: Date.now(),
                    o: open,
                    h: high,
                    l: low,
                    c: close
                };
            } else {
                const lastValue = data.length > 0 ? data[data.length - 1].y : 100;
                const newValue = lastValue + (Math.random() - 0.5) * 2;
                newDataPoint = {
                    x: Date.now(),
                    y: newValue
                };
            }

            data.push(newDataPoint);

            // Keep the chart clean
            if (data.length > MAX_DATA_POINTS) {
                data.shift();
            }

            chart.update('quiet');
        }, 1000);
    }

    /**
     * Handles placing a new trade.
     * @param {'buy' | 'sell'} direction - The direction of the trade.
     */
    async function placeTrade(direction) {
        const amount = parseFloat(tradeAmountInput.value);

        // --- Validation ---
        if (isNaN(amount) || amount < 5) {
            alert('จำนวน Coins ขั้นต่ำคือ 5');
            return;
        }
        if (amount > userCoins) {
            alert('คุณมี Coins ไม่เพียงพอ');
            return;
        }

        // Allow rapid buying if single buy toggle is off
        if (!singleBuyToggle.checked) {
            setControlsDisabled(false);
        } else {
            setControlsDisabled(true);
        }

        const trade = {
            id: `trade_${Date.now()}`,
            asset: assetSelect.value,
            direction,
            amount,
            time: selectedTime,
            entryPrice: chart.data.datasets[0].data.slice(-1)[0].y || chart.data.datasets[0].data.slice(-1)[0].c,
            startTime: Date.now(),
            status: 'active'
        };

        // --- API Call (Simulated) ---
        try {
            // Deduct coins locally first for responsiveness
            userCoins -= amount;
            updateUserCoins();

            const response = await fetch('../api/trader-api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'place_trade', trade: trade })
            });

            const result = await response.json();

            if (!result.success) {
                // Revert coins if API call fails
                userCoins += amount;
                updateUserCoins();
                throw new Error(result.message || 'Server error');
            }

            // If API call is successful, start the trade process
            activeTrades.push(trade);
            renderActiveTrades();
            startTradeCountdown(trade);

        } catch (error) {
            alert(`ไม่สามารถวางเดิมพันได้: ${error.message}`);
            setControlsDisabled(false);
        }
    }

    /**
     * Starts the visual countdown on the chart for an active trade.
     * @param {object} trade - The trade object.
     */
    function startTradeCountdown(trade) {
        let timeLeft = trade.time;
        countdownOverlay.style.display = 'flex';
        countdownTimerEl.textContent = timeLeft;

        const countdownInterval = setInterval(() => {
            timeLeft--;
            countdownTimerEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                resolveTrade(trade);
            }
        }, 1000);
    }

    /**
     * Resolves a trade after the countdown finishes.
     * @param {object} trade - The trade object to resolve.
     */
    async function resolveTrade(trade) {
        trade.exitPrice = chart.data.datasets[0].data.slice(-1)[0].y || chart.data.datasets[0].data.slice(-1)[0].c;

        // Determine win/loss
        if (trade.direction === 'buy') {
            trade.result = trade.exitPrice > trade.entryPrice ? 'win' : 'loss';
        } else { // sell
            trade.result = trade.exitPrice < trade.entryPrice ? 'win' : 'loss';
        }

        // --- API Call to resolve (Simulated) ---
        try {
            const response = await fetch('../api/trader-api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resolve_trade', trade: trade })
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to resolve trade on server');
            }

            // Update coins based on result from server
            userCoins = result.newCoins;
            trade.payout = result.payout;
            updateUserCoins();
            showResultModal(trade);

        } catch (error) {
            alert(`เกิดข้อผิดพลาดในการจบการเทรด: ${error.message}`);
            // In a real app, you'd have a mechanism to retry or handle this gracefully
        }


        // Move from active to history
        activeTrades = activeTrades.filter(t => t.id !== trade.id);
        trade.status = 'closed';
        historyTrades.unshift(trade); // Add to the beginning of history
        renderActiveTrades();
        renderHistoryTrades();
        setControlsDisabled(false);
    }
    
    /**
     * Displays the result of a trade in a modal.
     * @param {object} trade - The resolved trade object.
     */
    function showResultModal(trade) {
        if (trade.result === 'win') {
            resultTitle.className = 'text-success';
            resultTitle.textContent = 'You Won!';
            resultMessage.textContent = `ยินดีด้วย! คุณได้รับ ${trade.payout.toFixed(2)} Coins.`;
        } else {
            resultTitle.className = 'text-danger';
            resultTitle.textContent = 'You Lost';
            resultMessage.textContent = `เสียใจด้วย! คุณเสีย ${trade.amount.toFixed(2)} Coins.`;
        }
        resultModalEl.show();
    }


    /**
     * Updates the user's coin balance display.
     */
    function updateUserCoins() {
        userCoinsEl.textContent = userCoins.toFixed(2);
    }

    /**
     * Renders the list of active trades.
     */
    function renderActiveTrades() {
        activeTradesCountEl.textContent = activeTrades.length;
        if (activeTrades.length === 0) {
            activeTradesContainer.innerHTML = '<p class="no-trades">No active trades.</p>';
            return;
        }

        activeTradesContainer.innerHTML = activeTrades.map(trade => `
            <div class="trade-item active">
                <span>${trade.asset}</span>
                <span class="direction ${trade.direction}">${trade.direction.toUpperCase()}</span>
                <span>${trade.amount} Coins</span>
                <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    /**
     * Renders the list of historical trades.
     */
    function renderHistoryTrades() {
        if (historyTrades.length === 0) {
            historyLogContainer.innerHTML = '<p class="no-trades">No trade history yet.</p>';
            return;
        }
        
        historyLogContainer.innerHTML = historyTrades.map(trade => `
             <div class="trade-item history ${trade.result}">
                <span>${trade.asset}</span>
                <span class="direction ${trade.direction}">${trade.direction.toUpperCase()}</span>
                <span>${trade.amount} Coins</span>
                <span class="result">${trade.result === 'win' ? `+${trade.payout.toFixed(2)}` : `-${trade.amount.toFixed(2)}`}</span>
            </div>
        `).join('');
    }


    /**
     * Enables or disables trading controls.
     * @param {boolean} isDisabled - True to disable, false to enable.
     */
    function setControlsDisabled(isDisabled) {
        buyBtn.disabled = isDisabled;
        sellBtn.disabled = isDisabled;
        tradeAmountInput.disabled = isDisabled;
        timeBtns.forEach(btn => btn.disabled = isDisabled);
        assetSelect.disabled = isDisabled;
    }


    // --- Event Listeners ---
    window.addEventListener('load', () => {
        loadingScreen.classList.add('hidden');
        document.body.classList.add('loaded');
        initChart();
    });

    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTime = parseInt(btn.dataset.time);
        });
    });

    assetSelect.addEventListener('change', () => {
        // In a real app, this would fetch new data for the selected asset
        generateInitialData();
    });

    chartTypeSelect.addEventListener('change', () => {
        updateChartType();
    });

    singleBuyToggle.addEventListener('change', () => {
        // Handle single buy toggle if needed
    });

    buyBtn.addEventListener('click', () => placeTrade('buy'));
    sellBtn.addEventListener('click', () => placeTrade('sell'));

    /**
     * Updates the chart type based on the select dropdown.
     */
    function updateChartType() {
        const selectedType = chartTypeSelect.value;
        if (selectedType === 'candlestick') {
            chart.destroy();
            const ctx = chartCanvas.getContext('2d');
            chart = new Chart(ctx, candlestickConfig);
        } else {
            chartConfig.type = selectedType;
            chart.destroy();
            const ctx = chartCanvas.getContext('2d');
            chart = new Chart(ctx, chartConfig);
        }
        generateInitialData();
        startDataStream();
    }

});