/* =============================================
   ECOTRACK – Carbon Footprint Awareness Platform
   Main JavaScript Application
   ============================================= */

'use strict';

// ===================== STATE =====================
const state = {
  currentSection: 'dashboard',
  currentStep: 0,
  totalSteps: 5,
  results: null,
  completedActions: [],
  activeChallenges: [],
  streak: 0,
  loggedDays: [],
  totalSavedKg: 0,
  pledgeTaken: false,
  tipIndex: 0,
  breakdownChartType: 'donut',
  charts: {},
};

// Data is now loaded via ES modules in index.html and attached to window

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initParticles();
  initNavScroll();
  initTipDots();
  renderAchievements();
  renderActions('all');
  renderChallenges();
  renderInsights();
  renderTrackerUI();
  updateNavScore();
  calculateAllPreviews();
  animateInsightRing();
  animateSourceBars();
  animateCountryBars();

  // Auto-calculate on range/chip changes
  document.querySelectorAll('input[type=range]').forEach(r => {
    r.addEventListener('input', () => { calculateAllPreviews(); updateLiveTotal(); });
  });
});

// ===================== NAVIGATION =====================
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');
  const navLink = document.getElementById(`nav-${name}`);
  if (navLink) navLink.classList.add('active');
  state.currentSection = name;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lazy chart init
  if (name === 'tracker') renderTrackerCharts();
  if (name === 'map') initMap();
  if (name === 'dashboard') {
    renderDashboardCharts();
    animateInsightRing();
  }
  if (name === 'insights') {
    setTimeout(() => { animateSourceBars(); animateCountryBars(); }, 200);
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

function initNavScroll() {
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
}

// ===================== PARTICLES =====================
function initParticles() {
  const container = document.getElementById('particles');
  const count = 20;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*15+10}s;
      animation-delay:${Math.random()*15}s;
      opacity:0;
    `;
    container.appendChild(p);
  }
}

// ===================== TIPS CAROUSEL =====================
function initTipDots() {
  const dots = document.getElementById('tipDots');
  dots.innerHTML = '';
  TIPS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = `tip-dot ${i === 0 ? 'active' : ''}`;
    d.onclick = () => goToTip(i);
    dots.appendChild(d);
  });
  renderTip();
}

function renderTip() {
  const t = TIPS[state.tipIndex];
  document.getElementById('tipIcon').textContent = t.icon;
  document.getElementById('tipText').innerHTML = t.text;
  document.querySelector('.savings-val').textContent = t.savings;
  document.querySelectorAll('.tip-dot').forEach((d, i) => d.classList.toggle('active', i === state.tipIndex));
}
function nextTip() { state.tipIndex = (state.tipIndex + 1) % TIPS.length; renderTip(); }
function prevTip() { state.tipIndex = (state.tipIndex - 1 + TIPS.length) % TIPS.length; renderTip(); }
function goToTip(i) { state.tipIndex = i; renderTip(); }

// ===================== CALCULATOR =====================
function getChipVal(groupId) {
  const active = document.querySelector(`#${groupId} .chip.active`);
  return active ? active.getAttribute('data-val') : null;
}

function selectChip(groupId, el) {
  document.querySelectorAll(`#${groupId} .chip`).forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  calculateAllPreviews();
  updateLiveTotal();
}

function updateRangeDisplay(rangeId, displayId) {
  const val = document.getElementById(rangeId).value;
  document.getElementById(displayId).textContent = val;
}

function calcTransportDOM() {
  const miles = parseInt(document.getElementById('carMiles').value);
  const carType = getChipVal('carType') || 'petrol';
  const ptHours = parseInt(document.getElementById('publicTransport').value);
  const cycle = parseInt(document.getElementById('cycleWalk').value);
  return window.calcTransport(miles, carType, ptHours, cycle);
}

function calcHomeDOM() {
  const heating = getChipVal('heatingType') || 'gas';
  const kwh = parseInt(document.getElementById('electricityKwh').value);
  const size = getChipVal('homeSize') || 'medium';
  const renew = getChipVal('renewableEnergy') || 'no';
  return window.calcHome(heating, kwh, size, renew);
}

function calcFoodDOM() {
  const diet = getChipVal('dietType') || 'omnivore';
  const waste = getChipVal('foodWaste') || 'medium';
  const local = getChipVal('localFood') || 'sometimes';
  return window.calcFood(diet, waste, local);
}

function calcShoppingDOM() {
  const clothing = parseInt(document.getElementById('clothingBuys').value);
  const elec = getChipVal('electronics') || 'none';
  const habit = getChipVal('shoppingHabit') || 'average';
  const sh = getChipVal('secondHand') || 'sometimes';
  return window.calcShopping(clothing, elec, habit, sh);
}

function calcTravelDOM() {
  const sf = parseInt(document.getElementById('shortFlights').value);
  const lf = parseInt(document.getElementById('longFlights').value);
  const cls = getChipVal('flightClass') || 'economy';
  const offset = getChipVal('flightOffset') || 'never';
  return window.calcTravel(sf, lf, cls, offset);
}

function calculateAllPreviews() {
  const t = calcTransportDOM();
  const h = calcHomeDOM();
  const f = calcFoodDOM();
  const s = calcShoppingDOM();
  const tr = calcTravelDOM();
  document.getElementById('transport-preview').textContent = `${t.toFixed(2)} t CO₂/yr`;
  document.getElementById('home-preview').textContent = `${h.toFixed(2)} t CO₂/yr`;
  document.getElementById('food-preview').textContent = `${f.toFixed(2)} t CO₂/yr`;
  document.getElementById('shopping-preview').textContent = `${s.toFixed(2)} t CO₂/yr`;
  document.getElementById('travel-preview').textContent = `${tr.toFixed(2)} t CO₂/yr`;
  return { transport: t, home: h, food: f, shopping: s, travel: tr };
}

function updateLiveTotal() {
  const vals = calculateAllPreviews();
  const total = Object.values(vals).reduce((a,b) => a+b, 0);
  document.getElementById('liveTotalVal').textContent = total.toFixed(1);
}

function goToStep(i) {
  const total = calculateAllPreviews();
  document.getElementById(`calc-step-${state.currentStep}`).classList.remove('active');
  document.getElementById(`step-indicator-${state.currentStep}`).classList.remove('active');
  for (let j = 0; j <= state.currentStep; j++) {
    document.getElementById(`step-indicator-${j}`).classList.add('completed');
  }
  state.currentStep = i;
  document.getElementById(`calc-step-${i}`).classList.add('active');
  document.getElementById(`step-indicator-${i}`).classList.remove('completed');
  document.getElementById(`step-indicator-${i}`).classList.add('active');
  document.getElementById('prevStepBtn').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('nextStepBtn').textContent = i === state.totalSteps - 1 ? 'Calculate →' : 'Next →';
}

function nextStep() {
  if (state.currentStep < state.totalSteps - 1) {
    goToStep(state.currentStep + 1);
  } else {
    showResults();
  }
}

function prevStep() {
  if (state.currentStep > 0) goToStep(state.currentStep - 1);
}

function showResults() {
  const vals = calculateAllPreviews();
  const total = Object.values(vals).reduce((a,b) => a+b, 0);
  state.results = { ...vals, total };

  document.getElementById('resultsPanel').classList.remove('hidden');
  document.getElementById('resultTotal').textContent = total.toFixed(1);

  // Rating
  let rating, ratingClass;
  if (total < 2) { rating = '🌱 Eco Champion'; ratingClass = 'badge-success'; }
  else if (total < 4) { rating = '✅ Below Average'; ratingClass = 'badge-success'; }
  else if (total < 6) { rating = '⚠️ Average Footprint'; ratingClass = 'badge-warning'; }
  else if (total < 10) { rating = '🔴 Above Average'; ratingClass = 'badge-danger'; }
  else { rating = '🚨 High Footprint'; ratingClass = 'badge-danger'; }

  const ratingEl = document.getElementById('resultRating');
  ratingEl.textContent = rating;
  ratingEl.className = `result-rating badge ${ratingClass}`;

  // Breakdown bars
  const colors = { transport: '#10b981', home: '#0891b2', food: '#34d399', shopping: '#8b5cf6', travel: '#f59e0b' };
  const labels = { transport: 'Transport', home: 'Home', food: 'Food', shopping: 'Shopping', travel: 'Travel' };
  const barsEl = document.getElementById('breakdownBars');
  barsEl.innerHTML = '';
  Object.entries(vals).forEach(([key, val]) => {
    const pct = total > 0 ? (val / total * 100) : 0;
    barsEl.innerHTML += `
      <div class="breakdown-bar-item">
        <div class="bb-label">${labels[key]}</div>
        <div class="bb-bar-wrap"><div class="bb-bar" style="background:${colors[key]};width:0%" data-pct="${pct.toFixed(0)}%"></div></div>
        <div class="bb-val">${val.toFixed(2)}t</div>
      </div>`;
  });
  setTimeout(() => {
    document.querySelectorAll('.bb-bar').forEach(b => b.style.width = b.getAttribute('data-pct'));
  }, 100);

  // Comparison
  const comparisons = [
    { label: 'You', val: total, color: total < 4.7 ? '#10b981' : '#ef4444' },
    { label: 'Global Avg', val: 4.7, color: '#f59e0b' },
    { label: 'US Avg', val: 14.2, color: '#ef4444' },
    { label: 'Paris 2°C', val: 2.0, color: '#10b981' },
  ];
  const maxVal = Math.max(...comparisons.map(c => c.val));
  const compEl = document.getElementById('comparisonVisual');
  compEl.innerHTML = comparisons.map(c => `
    <div class="compare-bar-item">
      <div class="cbi-label">${c.label}</div>
      <div class="cbi-bar-col">
        <div class="cbi-fill" style="height:${(c.val/maxVal*100).toFixed(0)}%;background:${c.color}"></div>
      </div>
      <div class="cbi-val">${c.val.toFixed(1)}t</div>
    </div>`).join('');

  document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveResults() {
  if (!state.results) return;
  localStorage.setItem('ecotrack_results', JSON.stringify(state.results));
  localStorage.setItem('ecotrack_results_date', new Date().toISOString());
  updateNavScore();
  renderDashboardCharts();
  unlockAchievement('first_calc');
  if (state.results.total < 3) unlockAchievement('eco_hero');
  showToast('💾 Results saved! Visit your Dashboard to see insights.', '✅');
  setTimeout(() => showSection('dashboard'), 1500);
}

// ===================== DASHBOARD CHARTS =====================
function renderDashboardCharts() {
  if (!state.results) return;
  document.getElementById('breakdownPlaceholder').style.display = 'none';
  document.getElementById('breakdownChartWrapper').style.display = 'block';

  const vals = state.results;
  const colors = ['#10b981', '#0891b2', '#34d399', '#8b5cf6', '#f59e0b'];
  const labels = ['Transport', 'Home', 'Food', 'Shopping', 'Travel'];
  const data = [vals.transport, vals.home, vals.food, vals.shopping, vals.travel];

  if (state.charts.breakdown) state.charts.breakdown.destroy();

  const ctx = document.getElementById('breakdownChart').getContext('2d');
  const isDonut = state.breakdownChartType === 'donut';

  state.charts.breakdown = new Chart(ctx, {
    type: isDonut ? 'doughnut' : 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'bb'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: isDonut ? 0 : 6,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: isDonut ? '65%' : 0,
      plugins: {
        legend: {
          position: isDonut ? 'bottom' : 'none',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 16, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw.toFixed(2)}t CO₂/yr`
          },
          backgroundColor: '#1f2937',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#374151',
          borderWidth: 1,
        }
      },
      scales: isDonut ? {} : {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', callback: v => `${v}t` }, grid: { color: 'rgba(255,255,255,0.04)' } }
      },
      animation: { duration: 800, easing: 'easeInOutQuart' }
    }
  });

  // Gauge
  updateGauge(vals.total);
}

function updateGauge(value) {
  document.getElementById('gaugeValue').textContent = value.toFixed(1);
  document.getElementById('navScoreVal').textContent = value.toFixed(1);

  // Rating badge
  let label, cls;
  if (value < 2) { label = '🌱 Excellent'; cls = 'badge-success'; }
  else if (value < 4.7) { label = '✅ Good'; cls = 'badge-success'; }
  else if (value < 7) { label = '⚠️ Average'; cls = 'badge-warning'; }
  else { label = '🔴 High'; cls = 'badge-danger'; }
  const badge = document.getElementById('scoreBadgeLabel');
  badge.textContent = label;
  badge.className = `badge ${cls}`;

  if (state.charts.gauge) state.charts.gauge.destroy();
  const maxVal = 20;
  const clampedVal = Math.min(value, maxVal);
  const ctx = document.getElementById('gaugeChart').getContext('2d');

  const getColor = (v) => {
    if (v < 2) return '#10b981';
    if (v < 4.7) return '#34d399';
    if (v < 7) return '#f59e0b';
    return '#ef4444';
  };

  state.charts.gauge = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [clampedVal, maxVal - clampedVal],
        backgroundColor: [getColor(value), 'rgba(255,255,255,0.04)'],
        borderWidth: 0,
        borderRadius: 8,
      }]
    },
    options: {
      rotation: -180,
      circumference: 180,
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 1000, easing: 'easeInOutCubic' }
    }
  });

  // Add range markers
  const globalPct = 4.7 / maxVal;
  const targetPct = 2.0 / maxVal;
}

function switchBreakdownChart(type) {
  state.breakdownChartType = type;
  document.getElementById('toggleDonut').classList.toggle('active', type === 'donut');
  document.getElementById('toggleBar').classList.toggle('active', type === 'bar');
  renderDashboardCharts();
}

function updateNavScore() {
  const saved = localStorage.getItem('ecotrack_results');
  if (saved) {
    const r = JSON.parse(saved);
    state.results = r;
    document.getElementById('navScoreVal').textContent = r.total.toFixed(1);
  }
}

// ===================== TRACKER =====================
function renderTrackerUI() {
  // Streak calendar (last 21 days)
  const cal = document.getElementById('streakCalendar');
  cal.innerHTML = '';
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toDateString();
    const isLogged = state.loggedDays.includes(key);
    const isToday = i === 0;
    const el = document.createElement('div');
    el.className = `cal-day ${isLogged ? 'logged' : ''} ${isToday ? 'today' : ''}`;
    el.title = key;
    el.textContent = d.getDate();
    cal.appendChild(el);
  }
  document.getElementById('streakNumber').textContent = state.streak;

  // Savings equivalents
  const kg = state.totalSavedKg;
  document.getElementById('totalSavedKg').textContent = kg.toFixed(0);
  document.getElementById('treesEq').textContent = Math.max(0, (kg / 21).toFixed(1));
  document.getElementById('drivingEq').textContent = Math.max(0, (kg / 0.404).toFixed(0));
  document.getElementById('bulbEq').textContent = Math.max(0, (kg / 0.006).toFixed(0));

  // Challenges in tracker
  const cl = document.getElementById('challengesList');
  cl.innerHTML = '';
  if (state.activeChallenges.length === 0) {
    cl.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px 0;font-size:0.87rem">No active challenges yet.<br>Start one from the Actions Hub!</div>`;
  } else {
    state.activeChallenges.slice(0, 3).forEach(id => {
      const ch = CHALLENGES.find(c => c.id === id);
      if (!ch) return;
      const pct = Math.floor(Math.random() * 60 + 20);
      cl.innerHTML += `
        <div class="challenge-item">
          <div class="challenge-icon">${ch.icon}</div>
          <div class="challenge-info">
            <div class="challenge-name">${ch.title}</div>
            <div class="challenge-progress">
              <div class="challenge-bar-wrap"><div class="challenge-bar" style="width:${pct}%"></div></div>
              <div class="challenge-days">${Math.ceil(ch.days * pct / 100)}/${ch.days} days</div>
            </div>
          </div>
        </div>`;
    });
  }
}

function renderTrackerCharts() {
  // Trend chart
  const labels = [];
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
    const base = state.results ? state.results.total / 52 * 7 : 4;
    data.push((base + (Math.random() - 0.4) * 1.5).toFixed(2));
  }

  if (state.charts.trend) state.charts.trend.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(16,185,129,0.3)');
  gradient.addColorStop(1, 'rgba(16,185,129,0)');

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'kg CO₂/day',
        data,
        borderColor: '#10b981',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0d1526',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#10b981',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.raw} kg CO₂` }
        }
      },
      scales: {
        x: { ticks: { color: '#475569' }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#475569', callback: v => `${v}kg` }, grid: { color: 'rgba(255,255,255,0.03)' } }
      },
      animation: { duration: 800, easing: 'easeInOutQuart' }
    }
  });
}

function switchTrend(period) {
  document.getElementById('trendWeek').classList.toggle('active', period === 'week');
  document.getElementById('trendMonth').classList.toggle('active', period === 'month');
  renderTrackerCharts();
}

function logToday() {
  const today = new Date().toDateString();
  if (!state.loggedDays.includes(today)) {
    state.loggedDays.push(today);
    state.streak++;
    state.totalSavedKg += (Math.random() * 2 + 0.5);
    saveToStorage();
    renderTrackerUI();
    showToast('🔥 Today logged! Keep the streak alive!', '✅');
    if (state.streak >= 7) unlockAchievement('streak_week');
  } else {
    showToast('✅ Already logged today! Come back tomorrow.', 'ℹ️');
  }
}

// ===================== ACTIONS =====================
function renderActions(filter) {
  const grid = document.getElementById('actionsGrid');
  const filtered = filter === 'all' ? ACTIONS : ACTIONS.filter(a => a.category === filter);
  grid.innerHTML = filtered.map(a => {
    const isDone = state.completedActions.includes(a.id);
    return `
    <div class="action-card ${isDone ? 'completed' : ''}" id="action-${a.id}" style="--card-color:${a.color}">
      <div class="action-top">
        <div class="action-emoji">${a.emoji}</div>
        <div class="action-check" onclick="toggleAction('${a.id}')">${isDone ? '✅' : ''}</div>
      </div>
      <div class="action-title">${a.title}</div>
      <div class="action-desc">${a.desc}</div>
      <div class="action-meta">
        <div class="action-saving">🌿 Saves ${a.saving}</div>
        <div class="action-diff diff-${a.difficulty}">${a.difficulty}</div>
      </div>
    </div>`;
  }).join('');
}

function filterActions(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderActions(filter);
}

function toggleAction(id) {
  if (state.completedActions.includes(id)) {
    state.completedActions = state.completedActions.filter(i => i !== id);
    showToast('Action unmarked.', 'ℹ️');
  } else {
    state.completedActions.push(id);
    const action = ACTIONS.find(a => a.id === id);
    const kgMatch = action?.saving.match(/[\d.]+/);
    if (kgMatch) state.totalSavedKg += parseFloat(kgMatch[0]) * 1000;
    showToast(`✅ Action completed! ${action?.saving} saved.`, '🌿');
    if (state.completedActions.length >= 3) unlockAchievement('action_taker');
  }
  saveToStorage();
  renderTrackerUI();
  // Re-render current filter
  const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
  renderActions(activeFilter);
}

// ===================== CHALLENGES =====================
function renderChallenges() {
  const el = document.getElementById('challengesCards');
  el.innerHTML = CHALLENGES.map(ch => {
    const isActive = state.activeChallenges.includes(ch.id);
    return `
    <div class="challenge-card" id="challenge-${ch.id}">
      <div class="challenge-card-header">
        <div class="challenge-card-icon">${ch.icon}</div>
        <div>
          <div class="challenge-card-title">${ch.title}</div>
          <div class="challenge-card-days">⏱️ ${ch.days}-Day Challenge</div>
        </div>
      </div>
      <div class="challenge-card-desc">${ch.desc}</div>
      <div class="challenge-card-reward">🏆 ${ch.reward}</div>
      <button class="start-challenge-btn ${isActive ? 'active-challenge' : ''}"
        onclick="toggleChallenge('${ch.id}')" id="ch-btn-${ch.id}">
        ${isActive ? '✅ In Progress – Keep Going!' : '🚀 Start Challenge'}
      </button>
    </div>`;
  }).join('');
}

function toggleChallenge(id) {
  if (state.activeChallenges.includes(id)) {
    state.activeChallenges = state.activeChallenges.filter(i => i !== id);
    showToast('Challenge paused. You can restart anytime!', 'ℹ️');
  } else {
    state.activeChallenges.push(id);
    unlockAchievement('challenger');
    showToast('🚀 Challenge started! Good luck!', '🎯');
  }
  saveToStorage();
  renderChallenges();
  renderTrackerUI();
}

// ===================== INSIGHTS =====================
function renderInsights() {
  renderFacts();
  renderCountryList();
  renderImpactItems();
  animateCountUp('insightCountUp', 37.4, 1.5, 1);

  const pledgeTaken = localStorage.getItem('ecotrack_pledge');
  if (pledgeTaken) {
    const btn = document.getElementById('takePledgeBtn');
    btn.textContent = '✅ Pledged! Thank You!';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }
}

function renderFacts() {
  const el = document.getElementById('factsList');
  const shuffled = [...CLIMATE_FACTS].sort(() => Math.random() - 0.5).slice(0, 4);
  el.innerHTML = shuffled.map(f => `
    <div class="fact-item">
      <div class="fact-number">${f.number}</div>
      <div class="fact-text">${f.text}</div>
    </div>`).join('');
}

function shuffleFacts() {
  renderFacts();
}

function renderCountryList() {
  const el = document.getElementById('countryList');
  const maxVal = COUNTRIES.reduce((m, c) => Math.max(m, c.val), 0);
  el.innerHTML = COUNTRIES.map(c => `
    <div class="country-row">
      <div class="country-flag">${c.flag}</div>
      <div class="country-name">${c.name}</div>
      <div class="country-bar-wrap">
        <div class="country-bar" style="width:0%;background:${c.color}" data-pct="${(c.val/maxVal*100).toFixed(0)}%"></div>
      </div>
      <div class="country-val" style="color:${c.color}">${c.val}t</div>
    </div>`).join('');
}

function animateCountryBars() {
  setTimeout(() => {
    document.querySelectorAll('.country-bar').forEach(b => {
      b.style.width = b.getAttribute('data-pct');
      b.style.transition = 'width 1.5s ease';
    });
  }, 200);
}

function renderImpactItems() {
  const el = document.getElementById('impactItems');
  el.innerHTML = IMPACT_ITEMS.map(i => `
    <div class="impact-item">
      <div class="impact-icon">${i.icon}</div>
      <div class="impact-text">
        <h4>${i.title}</h4>
        <p>${i.text}</p>
      </div>
    </div>`).join('');
}

function animateInsightRing() {
  setTimeout(() => {
    const circle = document.getElementById('progressRingCircle');
    const pctEl = document.getElementById('ringPct');
    if (!circle) return;
    // Current global reduction progress ~25% toward Paris target (simplified illustrative)
    const pct = 25;
    const circumference = 502;
    const offset = circumference - (pct / 100) * circumference;
    circle.style.transition = 'stroke-dashoffset 2s ease';
    circle.style.strokeDashoffset = offset;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      pctEl.textContent = `${current}%`;
      if (current >= pct) clearInterval(timer);
    }, 2000 / pct);
  }, 300);
}

function animateSourceBars() {
  document.querySelectorAll('.source-bar').forEach(b => {
    b.style.width = '0';
    setTimeout(() => { b.style.width = getComputedStyle(b).getPropertyValue('--pct'); }, 200);
  });
}

function animateCountUp(id, target, duration, decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = target / (duration * 60);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = start.toFixed(decimals);
    if (start >= target) clearInterval(timer);
  }, 1000 / 60);
}

function takePledge() {
  localStorage.setItem('ecotrack_pledge', 'true');
  const btn = document.getElementById('takePledgeBtn');
  btn.textContent = '✅ Pledged! Thank You!';
  btn.disabled = true;
  btn.style.opacity = '0.7';
  showToast('🌱 Thank you for pledging! Together we make a difference.', '🌍');
  // Increment counter display
  const countEl = document.getElementById('pledgeCount');
  countEl.innerHTML = `Join <strong>2,848</strong> people who've pledged`;
}

// ===================== ACHIEVEMENTS =====================
function renderAchievements() {
  document.querySelectorAll('.achievement-item').forEach(el => {
    const id = el.getAttribute('data-id');
    const earned = JSON.parse(localStorage.getItem('ecotrack_achievements') || '[]');
    if (earned.includes(id)) el.classList.replace('locked', 'unlocked');
    else el.classList.add('locked');
    el.classList.remove('unlocked');
    if (earned.includes(id)) { el.classList.remove('locked'); el.classList.add('unlocked'); }
  });
}

function unlockAchievement(id) {
  const earned = JSON.parse(localStorage.getItem('ecotrack_achievements') || '[]');
  if (!earned.includes(id)) {
    earned.push(id);
    localStorage.setItem('ecotrack_achievements', JSON.stringify(earned));
    renderAchievements();
    const names = {
      first_calc: 'First Measure 🧮',
      action_taker: 'Action Taker ⚡',
      eco_hero: 'Eco Hero 🌿',
      streak_week: 'Week Streak 🔥',
      reducer: 'Reducer 📉',
      challenger: 'Challenger 🏅',
    };
    showToast(`🏆 Achievement Unlocked: ${names[id] || id}`, '🏅');
  }
}

// ===================== TOAST =====================
function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===================== PERSISTENCE =====================
function saveToStorage() {
  localStorage.setItem('ecotrack_state', JSON.stringify({
    completedActions: state.completedActions,
    activeChallenges: state.activeChallenges,
    streak: state.streak,
    loggedDays: state.loggedDays,
    totalSavedKg: state.totalSavedKg,
  }));
}

function loadFromStorage() {
  const saved = localStorage.getItem('ecotrack_state');
  if (saved) {
    const data = JSON.parse(saved);
    Object.assign(state, data);
  }
  const results = localStorage.getItem('ecotrack_results');
  if (results) {
    state.results = JSON.parse(results);
    setTimeout(() => {
      renderDashboardCharts();
    }, 100);
  }
}

// =====================================================================
//  ENHANCEMENTS: PWA, NOTIFICATIONS, SHARE, WEEKLY REPORT, MAP, AI TIPS
// =====================================================================

// ---- PWA INSTALL ----
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const dismissed = localStorage.getItem('ecotrack_pwa_dismissed');
  if (!dismissed) {
    setTimeout(() => document.getElementById('pwaBanner').classList.add('show'), 3000);
  }
});

window.addEventListener('appinstalled', () => {
  document.getElementById('pwaBanner').classList.remove('show');
  showToast('📱 EcoTrack installed successfully!', '🎉');
});

function installPWA() {
  if (!deferredPrompt) {
    showToast('Open this page in Chrome/Edge to install as an app.', 'ℹ️');
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') showToast('📱 Installing EcoTrack…', '🎉');
    deferredPrompt = null;
    document.getElementById('pwaBanner').classList.remove('show');
  });
}

function dismissPWABanner() {
  document.getElementById('pwaBanner').classList.remove('show');
  localStorage.setItem('ecotrack_pwa_dismissed', '1');
}

// ---- SERVICE WORKER REGISTRATION ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[EcoTrack] Service Worker registered:', reg.scope);
        // Listen for messages from SW (e.g., LOG_TODAY action from notification)
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'LOG_TODAY') logToday();
        });
      })
      .catch(err => console.warn('[EcoTrack] SW registration failed:', err));
  });
}

// ---- NOTIFICATIONS ----
function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Your browser does not support notifications.', '⚠️');
    dismissNotifBanner();
    return;
  }
  Notification.requestPermission().then(perm => {
    dismissNotifBanner();
    if (perm === 'granted') {
      localStorage.setItem('ecotrack_notif', 'granted');
      showToast('🔔 Daily reminders enabled! You\'ll be notified at 8 PM.', '✅');
      // Show an immediate confirmation notification
      new Notification('🌍 EcoTrack Reminders On!', {
        body: 'You\'ll get a daily nudge to log your eco actions.',
        icon: './icon-192.svg',
      });
    } else {
      showToast('Notifications blocked. You can enable them in browser settings.', 'ℹ️');
    }
  });
}

function dismissNotifBanner() {
  document.getElementById('notifBanner').classList.remove('show');
  localStorage.setItem('ecotrack_notif_dismissed', '1');
}

function checkNotifBanner() {
  const granted = localStorage.getItem('ecotrack_notif');
  const dismissed = localStorage.getItem('ecotrack_notif_dismissed');
  if (!granted && !dismissed && 'Notification' in window && Notification.permission === 'default') {
    setTimeout(() => document.getElementById('notifBanner').classList.add('show'), 6000);
  }
}

// ---- SOCIAL SHARING ----
function shareScore() {
  if (!state.results) {
    showToast('Calculate your score first!', 'ℹ️');
    showSection('calculator');
    return;
  }
  buildShareCard();
  document.getElementById('shareModal').classList.add('open');
}

function buildShareCard() {
  const score = state.results.total.toFixed(1);
  const ratings = [
    { max: 2, label: '🌱 Eco Champion', color: '#10b981' },
    { max: 4, label: '✅ Below Average', color: '#34d399' },
    { max: 6, label: '⚠️ Average Footprint', color: '#f59e0b' },
    { max: 10, label: '🔴 Above Average', color: '#ef4444' },
    { max: Infinity, label: '🚨 High Footprint', color: '#ef4444' },
  ];
  const rating = ratings.find(r => state.results.total < r.max);
  document.getElementById('shareCardPreview').innerHTML = `
    <div class="share-card-brand">🌍 ECOTRACK</div>
    <div class="share-card-score">${score}</div>
    <div class="share-card-unit">tonnes CO₂ per year</div>
    <div class="share-card-rating" style="color:${rating.color}">${rating.label}</div>
    <div class="share-card-msg">Global average: 4.7t · Paris target: 2.0t</div>`;
  // Show share button on score card
  if (document.getElementById('shareScoreBtn')) {
    document.getElementById('shareScoreBtn').style.display = 'flex';
  }
}

function closeShareModal() { document.getElementById('shareModal').classList.remove('open'); }

function getShareText() {
  const score = state.results ? state.results.total.toFixed(1) : '?';
  return `My annual carbon footprint is ${score}t CO₂ – measured with EcoTrack! 🌍 What's yours? #CarbonFootprint #ClimateAction #EcoTrack`;
}

function shareToTwitter() {
  const text = encodeURIComponent(getShareText());
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

function shareToWhatsApp() {
  const text = encodeURIComponent(getShareText());
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function copyShareLink() {
  const text = getShareText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Copied to clipboard!', '✅');
    closeShareModal();
  }).catch(() => {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('📋 Copied to clipboard!', '✅');
    closeShareModal();
  });
}

function nativeShare() {
  if (navigator.share) {
    navigator.share({
      title: 'My Carbon Footprint – EcoTrack',
      text: getShareText(),
      url: window.location.href,
    }).then(() => closeShareModal())
      .catch(() => {});
  } else {
    showToast('Native sharing not supported. Try copy link.', 'ℹ️');
  }
}

// ---- WEEKLY REPORT ----
let reportChart = null;

function openWeeklyReport() {
  populateReport();
  document.getElementById('weeklyReportModal').classList.add('open');
  setTimeout(() => renderReportChart(), 100);
}

function closeWeeklyReport() {
  document.getElementById('weeklyReportModal').classList.remove('open');
}

function populateReport() {
  // Date range
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  const fmt = d => d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  document.getElementById('reportDateRange').textContent = `${fmt(weekAgo)} – ${fmt(today)}`;

  // Stats
  document.getElementById('reportStreak').textContent = state.streak;
  document.getElementById('reportActions').textContent = state.completedActions.length;
  document.getElementById('reportSaved').textContent = `${state.totalSavedKg.toFixed(1)} kg`;
  document.getElementById('reportChallenges').textContent = state.activeChallenges.length;

  // AI Tips
  renderAITips();
}

function renderReportChart() {
  if (reportChart) { reportChart.destroy(); reportChart = null; }
  const ctx = document.getElementById('reportTrendChart');
  if (!ctx) return;
  const labels = [];
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
    const base = state.results ? state.results.total / 52 * 7 : 4;
    data.push((base + (Math.random() - 0.45) * 1.2).toFixed(2));
  }
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(16,185,129,0.3)');
  gradient.addColorStop(1, 'rgba(16,185,129,0)');
  reportChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#10b981',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0d1526',
        pointBorderWidth: 2,
        pointRadius: 4,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#10b981',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.raw} kg CO₂` }
        }
      },
      scales: {
        x: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#475569', callback: v => `${v}kg`, font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// ---- AI-STYLE PERSONALIZED TIPS ----
const AI_TIPS_DB = {
  transport: [
    { priority: 'high', title: 'Your biggest opportunity: Transport', text: 'Transport is your largest emission source. Try replacing just 2 car trips per week with cycling or public transit.', saving: 'Save up to 0.8t CO₂/yr' },
    { priority: 'high', title: 'Consider an EV', text: 'If your car is petrol/diesel, switching to electric could cut your transport emissions by 60–70%.', saving: 'Save 1.0–1.5t CO₂/yr' },
  ],
  home: [
    { priority: 'high', title: 'Switch to green energy', text: 'Your home energy is a major source. Switching to a renewable tariff is one of the fastest wins available.', saving: 'Save 0.5–1.5t CO₂/yr' },
    { priority: 'medium', title: 'Insulate your home', text: 'Better insulation reduces heating demand by up to 30%, especially in older homes.', saving: 'Save 0.2–0.6t CO₂/yr' },
  ],
  food: [
    { priority: 'high', title: 'Diet is your top lever', text: 'Food is your highest emission category. Even one meat-free day per week makes a measurable difference.', saving: 'Save 0.3–0.5t CO₂/yr' },
    { priority: 'medium', title: 'Reduce food waste', text: 'An estimated 30% of food is wasted globally. Plan meals, freeze leftovers, and compost scraps.', saving: 'Save 0.2t CO₂/yr' },
  ],
  shopping: [
    { priority: 'medium', title: 'Slow down on fast fashion', text: 'Your shopping footprint is notable. Try a clothing swap, thrift shopping, or a 30-day no-buy challenge.', saving: 'Save 0.2–0.4t CO₂/yr' },
    { priority: 'low', title: 'Repair before replacing', text: 'Extending the life of electronics by 2 years cuts their lifetime carbon impact by almost half.', saving: 'Save 0.07–0.15t CO₂/yr' },
  ],
  travel: [
    { priority: 'high', title: 'Flight-free holidays', text: 'Flights dominate your footprint. One fewer long-haul flight is the single biggest impact you can make.', saving: 'Save 1.5–3t CO₂/trip' },
    { priority: 'medium', title: 'Take the train', text: 'For European routes, rail emits 6x less CO₂ per km than flying. Many journeys are just as fast door-to-door.', saving: 'Save 0.5–1t CO₂/trip' },
  ],
  general: [
    { priority: 'low', title: 'Great progress!', text: 'Your footprint is below the global average. Focus on your top categories for the next step down.', saving: 'Keep going!' },
  ],
};

function renderAITips() {
  const el = document.getElementById('reportAITips');
  if (!el) return;
  let tips = [];

  if (state.results) {
    // Find top 2 categories
    const cats = Object.entries(state.results)
      .filter(([k]) => k !== 'total')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);

    cats.forEach(cat => {
      const catTips = AI_TIPS_DB[cat] || [];
      if (catTips.length > 0) tips.push(catTips[0]);
    });

    // Add a general tip
    tips.push(AI_TIPS_DB.general[0]);
  } else {
    tips = [AI_TIPS_DB.general[0], AI_TIPS_DB.transport[0]];
  }

  el.innerHTML = tips.map(t => `
    <div class="ai-tip-item">
      <div class="ai-tip-priority ${t.priority}">${t.priority}</div>
      <div class="ai-tip-body">
        <h4>${t.title}</h4>
        <p>${t.text}</p>
        <div class="ai-tip-saving">🌿 ${t.saving}</div>
      </div>
    </div>`).join('');
}

// Also render AI tips on dashboard after score saved
function renderDashboardAITips() {
  if (!state.results) return;
  const cats = Object.entries(state.results)
    .filter(([k]) => k !== 'total')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([k]) => k);

  if (cats.length && AI_TIPS_DB[cats[0]]) {
    const tip = AI_TIPS_DB[cats[0]][0];
    // Update the tip carousel to show the most relevant tip first
    const relevantTipIndex = TIPS.findIndex(t => {
      const catMap = { transport: '🚲', home: '💡', food: '🌱', shopping: '🛍️', travel: '✈️' };
      return t.icon === catMap[cats[0]];
    });
    if (relevantTipIndex >= 0) { state.tipIndex = relevantTipIndex; renderTip(); }
  }
}

function shareReport() {
  closeWeeklyReport();
  shareScore();
}

// ---- OFFSET MAP ----
const OFFSET_PROJECTS = [
  { id: 'p1', name: 'Amazon Rainforest Conservation', location: 'Brazil', type: 'forest', icon: '🌳', x: 175, y: 310, tonnes: '2.4M', cost: '$8/t', standard: 'Gold Standard', verified: true, desc: 'Protecting 500,000 hectares of primary Amazon rainforest from deforestation through indigenous community partnerships and sustainable livelihood programs.', sdgs: ['Climate', 'Biodiversity', 'Communities'], color: '#10b981' },
  { id: 'p2', name: 'Rajasthan Solar Farm', location: 'India', type: 'solar', icon: '☀️', x: 650, y: 165, tonnes: '1.1M', cost: '$9/t', standard: 'VCS', verified: true, desc: 'A 200MW solar farm providing clean electricity to 300,000 homes, displacing coal-fired power and reducing local air pollution.', sdgs: ['Energy', 'Climate', 'Jobs'], color: '#f59e0b' },
  { id: 'p3', name: 'North Sea Wind Array', location: 'Denmark/UK', type: 'wind', icon: '💨', x: 460, y: 72, tonnes: '800K', cost: '$11/t', standard: 'Gold Standard', verified: true, desc: 'An offshore wind project generating 1.5GW of clean power, providing renewable energy to over 1 million European homes.', sdgs: ['Energy', 'Climate', 'Innovation'], color: '#0891b2' },
  { id: 'p4', name: 'Great Barrier Reef Seagrass', location: 'Australia', type: 'ocean', icon: '🌊', x: 820, y: 335, tonnes: '350K', cost: '$15/t', standard: 'Puro Standard', verified: true, desc: 'Restoring seagrass meadows which capture carbon up to 35x faster than tropical rainforests, while supporting marine ecosystems.', sdgs: ['Ocean', 'Biodiversity', 'Climate'], color: '#8b5cf6' },
  { id: 'p5', name: 'Kenya Clean Cookstoves', location: 'Kenya', type: 'community', icon: '🏠', x: 510, y: 290, tonnes: '600K', cost: '$6/t', standard: 'Gold Standard', verified: true, desc: 'Distributing efficient cookstoves to 50,000 households, reducing wood fuel use by 50% and cutting indoor air pollution.', sdgs: ['Health', 'Gender', 'Climate'], color: '#ef4444' },
  { id: 'p6', name: 'BC Forest Carbon Initiative', location: 'Canada', type: 'forest', icon: '🌲', x: 110, y: 100, tonnes: '1.8M', cost: '$12/t', standard: 'VCS', verified: true, desc: 'Sustainable forest management across 300,000 hectares of British Columbia boreal forest, preventing logging and storing carbon for 100+ years.', sdgs: ['Climate', 'Biodiversity', 'Indigenous Rights'], color: '#10b981' },
  { id: 'p7', name: 'Mongolia Wind Power', location: 'Mongolia', type: 'wind', icon: '💨', x: 760, y: 95, tonnes: '420K', cost: '$10/t', standard: 'CDM', verified: true, desc: 'Wind farm replacing coal power in Mongolia\'s energy grid, reducing emissions while providing reliable clean electricity in remote areas.', sdgs: ['Energy', 'Climate', 'Development'], color: '#0891b2' },
  { id: 'p8', name: 'Indonesia Peatland Protection', location: 'Indonesia', type: 'forest', icon: '🌿', x: 790, y: 200, tonnes: '3.2M', cost: '$7/t', standard: 'VCS', verified: true, desc: 'Protecting 200,000 ha of tropical peatlands which store 20x more carbon per hectare than tropical forests. Critical for global climate stability.', sdgs: ['Climate', 'Biodiversity', 'Water'], color: '#10b981' },
  { id: 'p9', name: 'Morocco Solar Valley', location: 'Morocco', type: 'solar', icon: '☀️', x: 420, y: 150, tonnes: '950K', cost: '$8/t', standard: 'Gold Standard', verified: true, desc: 'Concentrated solar power plant in the Sahara providing clean energy to Morocco and exporting to Europe via undersea cable.', sdgs: ['Energy', 'Jobs', 'Climate'], color: '#f59e0b' },
  { id: 'p10', name: 'Himalayan Community Forests', location: 'Nepal', type: 'community', icon: '⛰️', x: 685, y: 148, tonnes: '280K', cost: '$5/t', standard: 'Plan Vivo', verified: true, desc: 'Community-led reforestation of degraded slopes across 400 villages, reducing erosion, improving water supply, and storing carbon.', sdgs: ['Communities', 'Water', 'Climate'], color: '#ef4444' },
];

let allMapProjects = [...OFFSET_PROJECTS];

function initMap() {
  renderMapPins(OFFSET_PROJECTS);
  renderProjectList(OFFSET_PROJECTS);
}

function renderMapPins(projects) {
  const pinsGroup = document.getElementById('projectPins');
  if (!pinsGroup) return;
  pinsGroup.innerHTML = '';
  projects.forEach(p => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-pin');
    g.setAttribute('id', `pin-${p.id}`);
    g.setAttribute('onclick', `openProjectModal('${p.id}')`);
    g.setAttribute('onkeydown', `if(event.key === 'Enter' || event.key === ' ') openProjectModal('${p.id}')`);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `Project: ${p.name}`);
    g.setAttribute('title', p.name);

    // Pulse ring
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y); ring.setAttribute('r', '12');
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', p.color); ring.setAttribute('stroke-width', '1.5');
    ring.setAttribute('class', 'map-pin-ring'); ring.setAttribute('opacity', '0.5');

    // Main dot
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y); circle.setAttribute('r', '9');
    circle.setAttribute('fill', p.color); circle.setAttribute('class', 'pin-circle');

    // Icon text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', p.x); text.setAttribute('y', p.y + 5);
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('font-size', '9');
    text.textContent = { forest: '🌳', solar: '☀️', wind: '💨', ocean: '🌊', community: '👥' }[p.type] || '●';

    g.appendChild(ring); g.appendChild(circle); g.appendChild(text);
    pinsGroup.appendChild(g);

    // Stagger animation
    setTimeout(() => { g.style.opacity = '1'; g.style.transition = 'opacity 0.5s ease'; }, Math.random() * 800);
  });
}

function renderProjectList(projects) {
  const el = document.getElementById('projectList');
  if (!el) return;
  el.innerHTML = '';
  const typeColors = { forest: '#10b981', solar: '#f59e0b', wind: '#0891b2', ocean: '#8b5cf6', community: '#ef4444' };
  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.setAttribute('onclick', `openProjectModal('${p.id}')`);
    item.innerHTML = `
      <div class="project-dot" style="background:${typeColors[p.type]};color:${typeColors[p.type]}"></div>
      <div style="flex:1">
        <div class="project-name">${p.name}</div>
        <div class="project-location">📍 ${p.location}</div>
        <div class="project-meta">
          <span class="project-tag" style="background:${typeColors[p.type]}22;color:${typeColors[p.type]}">${p.type}</span>
          <span class="project-tag" style="background:rgba(255,255,255,0.05);color:#94a3b8">${p.tonnes} t offset</span>
          <span class="project-tag" style="background:rgba(16,185,129,0.1);color:#10b981">${p.cost}</span>
        </div>
      </div>`;
    el.appendChild(item);
  });
  document.getElementById('totalProjects').textContent = projects.length;
}

function filterMapProjects(type, btn) {
  document.querySelectorAll('.map-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all' ? OFFSET_PROJECTS : OFFSET_PROJECTS.filter(p => p.type === type);
  renderMapPins(filtered);
  renderProjectList(filtered);
}

function openProjectModal(id) {
  const p = OFFSET_PROJECTS.find(pr => pr.id === id);
  if (!p) return;
  const typeColors = { forest: '#10b981', solar: '#f59e0b', wind: '#0891b2', ocean: '#8b5cf6', community: '#ef4444' };
  const color = typeColors[p.type];
  document.getElementById('projectModalBody').innerHTML = `
    <div class="project-modal-hero">
      <div class="project-modal-icon">${p.icon}</div>
      <div class="project-modal-name">${p.name}</div>
      <div class="project-modal-loc">📍 ${p.location} · ${p.standard} Verified ✅</div>
    </div>
    <div class="project-modal-stats">
      <div class="pms-item"><div class="pms-val" style="color:${color}">${p.tonnes}</div><div class="pms-label">Tonnes Offset/yr</div></div>
      <div class="pms-item"><div class="pms-val" style="color:${color}">${p.cost}</div><div class="pms-label">Per Tonne</div></div>
      <div class="pms-item"><div class="pms-val" style="color:${color}">${p.sdgs.length}</div><div class="pms-label">UN SDGs Supported</div></div>
    </div>
    <div class="project-modal-desc">${p.desc}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
      ${p.sdgs.map(s => `<span class="project-tag" style="background:rgba(16,185,129,0.1);color:#10b981;padding:4px 10px;border-radius:4px">✓ ${s}</span>`).join('')}
    </div>
    <div class="project-modal-actions">
      <button class="btn-primary" onclick="offsetWithProject('${p.id}')" id="offsetProjectBtn-${p.id}">🌱 Offset with this Project</button>
      <button class="btn-ghost" onclick="closeProjectModal()">Close</button>
    </div>`;
  document.getElementById('projectModal').classList.add('open');
}

function closeProjectModal() {
  document.getElementById('projectModal').classList.remove('open');
}

function offsetWithProject(id) {
  const p = OFFSET_PROJECTS.find(pr => pr.id === id);
  closeProjectModal();
  const kg = state.results ? state.results.total * 1000 : 1000;
  state.totalSavedKg += kg * 0.1;
  saveToStorage();
  renderTrackerUI();
  showToast(`🌱 Offset contribution logged for "${p.name}"!`, '✅');
  unlockAchievement('reducer');
}

// ---- INIT all new features on load ----
document.addEventListener('DOMContentLoaded', () => {
  checkNotifBanner();
  // Share button visibility
  if (state.results) {
    const shareBtn = document.getElementById('shareScoreBtn');
    if (shareBtn) shareBtn.style.display = 'flex';
  }
});

