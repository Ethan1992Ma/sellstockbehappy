(function () {
  'use strict';

  // ─── SVG icons ───
  function makeTrendIcon(direction) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('xmlns', ns);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    const poly = document.createElementNS(ns, 'polyline');
    if (direction === 'up') {
      poly.setAttribute('points', '23 6 13.5 15.5 8.5 10.5 1 18');
    } else {
      poly.setAttribute('points', '23 18 13.5 8.5 8.5 13.5 1 6');
    }
    svg.appendChild(poly);
    const cap = document.createElementNS(ns, 'polyline');
    cap.setAttribute('points', direction === 'up' ? '17 6 23 6 23 12' : '17 18 23 18 23 12');
    svg.appendChild(cap);
    return svg;
  }

  // ─── Preset 對應 ───
  const PRESETS = {
    story:     { lot1: 50, lot2: 100, lot3: 25 },
    growth:    { lot1: 25, lot2: 60,  lot3: 15 },
    defensive: { lot1: 15, lot2: 30,  lot3: 10 },
  };

  const $ = (id) => document.getElementById(id);

  function fmtUsd(n)  { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtTwd(n)  { return 'NT$' + Math.round(n).toLocaleString('zh-TW'); }
  function fmtPct(n)  { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }

  // ─── 盈虧主計算 ───
  function recompute() {
    const avgCost = parseFloat($('avgCost').value) || 0;
    const price   = parseFloat($('currentPrice').value) || 0;
    const shares  = parseFloat($('shares').value) || 0;
    const fx      = parseFloat($('fxRate').value) || 0;
    const peak    = parseFloat($('peakPrice').value) || price;

    const lot1Pct = parseFloat($('lot1Pct').value) || 0;
    const lot2Pct = parseFloat($('lot2Pct').value) || 0;
    const lot3Pct = parseFloat($('lot3Pct').value) || 0;

    // 基本盈虧
    const totalCost  = avgCost * shares;
    const totalValue = price   * shares;
    const pnl        = totalValue - totalCost;
    const pnlPct     = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    const isProfit   = pnl >= 0;

    $('totalCost').textContent         = fmtTwd(totalCost * fx);
    $('totalValue').textContent        = fmtTwd(totalValue * fx);
    $('totalCostUsd').textContent      = fmtUsd(totalCost) + ' USD';
    $('totalValueUsd').textContent     = fmtUsd(totalValue) + ' USD';
    $('unrealizedPnlValue').textContent = fmtTwd(pnl * fx);
    $('unrealizedPnlPct').textContent  = fmtPct(pnlPct) + ' · ' + fmtUsd(pnl) + ' USD';

    const pnlBox = $('unrealizedPnlBox');
    pnlBox.classList.remove('profit', 'loss');
    pnlBox.classList.add(isProfit ? 'profit' : 'loss');

    // 替換 trend icon
    const iconSpan = $('trendingIconSpan');
    while (iconSpan.firstChild) iconSpan.removeChild(iconSpan.firstChild);
    iconSpan.appendChild(makeTrendIcon(isProfit ? 'up' : 'down'));

    // 女友分紅
    const gfTwd = isProfit ? pnl * fx * 0.15 : 0;
    $('girlfriendShare').textContent = fmtTwd(gfTwd);

    // Lot 配比：30 / 30 / 40
    const lot1Shares = Math.floor(shares * 0.30);
    const lot2Shares = Math.floor(shares * 0.30);
    const lot3Shares = shares - lot1Shares - lot2Shares;

    // Lot 1 & 2：avgCost × (1 + pct)
    const lot1Trigger = avgCost * (1 + lot1Pct / 100);
    const lot2Trigger = avgCost * (1 + lot2Pct / 100);

    // Lot 3：peak × (1 - pct)
    const lot3Trigger = peak * (1 - lot3Pct / 100);

    // 各段實現獲利（USD × FX）
    const lot1Profit = (lot1Trigger - avgCost) * lot1Shares * fx;
    const lot2Profit = (lot2Trigger - avgCost) * lot2Shares * fx;
    const lot3Profit = (lot3Trigger - avgCost) * lot3Shares * fx;

    $('lot1Trigger').textContent = fmtUsd(lot1Trigger);
    $('lot2Trigger').textContent = fmtUsd(lot2Trigger);
    $('lot3Trigger').textContent = fmtUsd(lot3Trigger);

    $('lot1Shares').textContent = lot1Shares.toLocaleString() + ' 股';
    $('lot2Shares').textContent = lot2Shares.toLocaleString() + ' 股';
    $('lot3Shares').textContent = lot3Shares.toLocaleString() + ' 股';

    $('lot1Profit').textContent = fmtTwd(lot1Profit);
    $('lot2Profit').textContent = fmtTwd(lot2Profit);
    $('lot3Profit').textContent = fmtTwd(lot3Profit);

    $('lot1PctLabel').textContent = lot1Pct;
    $('lot2PctLabel').textContent = lot2Pct;
    $('lot3PctLabel').textContent = lot3Pct;

    // 觸發狀態
    setStatus('lot1Status', price >= lot1Trigger, '✅ 已到價,可賣出免費化', '尚未觸發');
    setStatus('lot2Status', price >= lot2Trigger, '✅ 已到價,建議落袋主目標', '尚未觸發');
    
    // Lot 3：peak 超越入場 + 回檔到 trigger 以下才賣
    const lot3Armed = peak > avgCost * 1.2;
    const lot3Fired = lot3Armed && price <= lot3Trigger;
    setStatus(
      'lot3Status',
      lot3Fired,
      '🚨 高點回檔達標,跑者出場',
      lot3Armed ? '追蹤中 · 待回檔觸發' : '高點未夠高,尚未啟動追蹤'
    );

    // 三段總和
    const totalTwd = lot1Profit + lot2Profit + lot3Profit;
    const totalUsd = totalTwd / (fx || 1);
    
    const totalRealizedEl = $('totalRealized');
    totalRealizedEl.textContent = fmtTwd(totalTwd);
    $('totalRealizedUsd').textContent = fmtUsd(totalUsd) + ' USD';

    // Remove and re-add pulse animation to re-trigger it
    totalRealizedEl.classList.remove('animate-pulse');
    void totalRealizedEl.offsetWidth; // trigger reflow
    totalRealizedEl.classList.add('animate-pulse');
  }

  function setStatus(id, fired, firedText, idleText) {
    const el = $(id);
    el.textContent = fired ? firedText : idleText;
    el.classList.remove('status-active', 'status-warning');
    if (fired) {
      el.classList.add(id === 'lot3Status' ? 'status-warning' : 'status-active');
    }
  }

  // ─── Preset 觸發 ───
  $('stockType').addEventListener('change', (e) => {
    const preset = PRESETS[e.target.value];
    if (!preset) return;
    $('lot1Pct').value = preset.lot1;
    $('lot2Pct').value = preset.lot2;
    $('lot3Pct').value = preset.lot3;
    recompute();
  });

  // ─── 24 小時 localStorage 快取 ───
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (_) { return null; }
  }
  function cacheSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
  }

  // ─── 自動校準:多重資料源 + 多重 proxy fallback ───
  async function tryFetch(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      
      // Handle allorigins /get wrapper
      if (url.includes('allorigins.win/get')) {
        const json = await r.json();
        return json.contents && json.contents.length > 50 ? json.contents : null;
      }
      
      const t = await r.text();
      return t && t.length > 50 ? t : null;
    } catch (_) { return null; }
  }

  function proxyList(baseUrl) {
    let vercelProxyUrl = baseUrl;
    // Route through Vercel Edge Rewrites for deployment
    if (baseUrl.includes('query1.finance.yahoo.com')) {
      vercelProxyUrl = baseUrl.replace('https://query1.finance.yahoo.com', '/api/yahoo');
    } else if (baseUrl.includes('stooq.com')) {
      vercelProxyUrl = baseUrl.replace('https://stooq.com', '/api/stooq');
    }

    return [
      vercelProxyUrl,
      baseUrl,
      'https://api.allorigins.win/get?url=' + encodeURIComponent(baseUrl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(baseUrl),
      'https://corsproxy.io/?' + encodeURIComponent(baseUrl)
    ];
  }

  // ─── USD → TWD 匯率 (Yahoo USDTWD=X) ───
  async function fetchFxRate() {
    const cached = cacheGet('fx:usdtwd');
    if (cached) return { rate: cached, fromCache: true };

    const base = 'https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?range=5d&interval=1d';
    for (const u of proxyList(base)) {
      const txt = await tryFetch(u);
      if (!txt) continue;
      try {
        const j = JSON.parse(txt);
        const closes = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (!closes || closes.length === 0) continue;
        const latest = [...closes].reverse().find(c => c != null);
        if (!latest) continue;
        cacheSet('fx:usdtwd', latest);
        return { rate: latest, fromCache: false };
      } catch (_) {}
    }
    return null;
  }

  async function fetchYahooChart(symbol) {
    const base = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2mo&interval=1d`;
    for (const u of proxyList(base)) {
      const txt = await tryFetch(u);
      if (!txt) continue;
      try {
        const j = JSON.parse(txt);
        const res = j?.chart?.result?.[0];
        const quote = res?.indicators?.quote?.[0];
        if (!quote || !quote.high || !quote.low || !quote.close) continue;
        const rows = [];
        for (let i = 0; i < quote.close.length; i++) {
          if (quote.high[i] != null && quote.low[i] != null && quote.close[i] != null) {
            rows.push({ high: quote.high[i], low: quote.low[i], close: quote.close[i] });
          }
        }
        if (rows.length >= 15) return rows;
      } catch (_) { }
    }
    return null;
  }

  async function fetchStooq(symbol) {
    const base = `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&i=d`;
    for (const u of proxyList(base)) {
      const txt = await tryFetch(u);
      if (!txt || !txt.toLowerCase().includes('date')) continue;
      const lines = txt.trim().split('\n');
      if (lines.length < 20) continue;
      const rows = lines.slice(1).map((ln) => {
        const p = ln.split(',');
        return { high: parseFloat(p[2]), low: parseFloat(p[3]), close: parseFloat(p[4]) };
      }).filter((r) => !isNaN(r.close));
      if (rows.length >= 15) return rows;
    }
    return null;
  }

  async function fetchStockData(symbol) {
    const cacheKey = 'stock:' + symbol.toUpperCase();
    const cached = cacheGet(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    let rows = await fetchYahooChart(symbol);
    let source = 'Yahoo';
    if (!rows) { rows = await fetchStooq(symbol); source = 'Stooq'; }
    if (!rows) {
      if (window.location.protocol === 'file:') {
        throw new Error('本地檔案 CORS 阻擋，請開啟 Local Server (例如 VS Code Live Server) 或改用手動輸入');
      }
      throw new Error('所有資料源皆失敗,請確認代號或改用手動輸入');
    }

    const trs = [];
    for (let i = 1; i < rows.length; i++) {
      const tr = Math.max(
        rows[i].high - rows[i].low,
        Math.abs(rows[i].high - rows[i - 1].close),
        Math.abs(rows[i].low  - rows[i - 1].close)
      );
      trs.push(tr);
    }
    const last14 = trs.slice(-14);
    const atr14 = last14.reduce((a, b) => a + b, 0) / last14.length;
    const lastClose = rows[rows.length - 1].close;
    const atrPct = (atr14 / lastClose) * 100;
    const periodHigh = rows.reduce((m, r) => Math.max(m, r.high), 0);

    const data = { atrPct, lastClose, periodHigh, bars: rows.length, source };
    cacheSet(cacheKey, data);
    return { ...data, fromCache: false };
  }

  function atrToThresholds(atrPct) {
    return {
      lot1: Math.max(5,  Math.round(atrPct * 8)),
      lot2: Math.max(10, Math.round(atrPct * 18)),
      lot3: Math.max(5,  Math.round(atrPct * 4)),
    };
  }

  // ─── 手動 ATR 套用 ───
  $('applyManualAtrBtn').addEventListener('click', () => {
    const atrPct = parseFloat($('manualAtr').value);
    if (!atrPct || atrPct <= 0) return;
    const t = atrToThresholds(atrPct);
    $('lot1Pct').value = t.lot1;
    $('lot2Pct').value = t.lot2;
    $('lot3Pct').value = t.lot3;
    $('stockType').value = 'custom';
    
    const status = $('fetchStatus');
    status.textContent = `✅ 手動 ATR=${atrPct.toFixed(1)}% → Lot +${t.lot1}/+${t.lot2}/-${t.lot3}%`;
    status.className = 'status-badge success';
    recompute();
  });

  async function runCalibrate(sym, { silent = false } = {}) {
    const status = $('fetchStatus');
    if (!silent) {
      status.textContent = '⏳ 抓取 ' + sym + ' 資料中...';
      status.className = 'status-badge';
    }
    try {
      const stock = await fetchStockData(sym);
      const fx    = await fetchFxRate();
      const t     = atrToThresholds(stock.atrPct);

      $('lot1Pct').value      = t.lot1;
      $('lot2Pct').value      = t.lot2;
      $('lot3Pct').value      = t.lot3;
      $('stockType').value    = 'custom';
      $('currentPrice').value = stock.lastClose.toFixed(2);
      $('peakPrice').value    = stock.periodHigh.toFixed(2);
      if (fx?.rate) $('fxRate').value = fx.rate.toFixed(2);

      const cacheTag = stock.fromCache && (!fx || fx.fromCache) ? ' 💾' : '';
      status.textContent =
        `✅ [${stock.source}] ATR ${stock.atrPct.toFixed(2)}% · 價 $${stock.lastClose.toFixed(2)} · 高 $${stock.periodHigh.toFixed(2)}` +
        (fx ? ` · 匯率 ${fx.rate.toFixed(2)}` : '') +
        ` → +${t.lot1}/+${t.lot2}/-${t.lot3}%${cacheTag}`;
      status.className = 'status-badge success';
      
      recompute();
    } catch (err) {
      status.textContent = '❌ ' + (err.message || '抓取失敗,請確認代號');
      status.className = 'status-badge error';
    }
  }

  $('calibrateBtn').addEventListener('click', () => {
    const sym = $('symbol').value.trim();
    if (sym) runCalibrate(sym);
  });

  // 頁面載入時有快取就直接套用,0 網路請求
  window.addEventListener('load', () => {
    const sym = $('symbol').value.trim();
    if (sym && cacheGet('stock:' + sym.toUpperCase())) runCalibrate(sym, { silent: true });
  });

  // ─── 綁定即時重算 ───
  ['avgCost', 'currentPrice', 'shares', 'fxRate', 'peakPrice',
   'lot1Pct', 'lot2Pct', 'lot3Pct'].forEach((id) => {
    $(id).addEventListener('input', recompute);
  });

  // Setup simple pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-custom {
      0% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.02); filter: brightness(1.2); }
      100% { transform: scale(1); filter: brightness(1); }
    }
    .animate-pulse { animation: pulse-custom 0.5s ease; }
  `;
  document.head.appendChild(style);

  // Initial compute
  recompute();
})();
