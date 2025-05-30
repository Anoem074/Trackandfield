// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// API URL constant
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;

// Import Chart.js date adapter
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js';
document.head.appendChild(script);

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const registerForm = document.getElementById('register-form');
const appDiv = document.getElementById('app');

// Auth tabs functionality
const authTabs = document.querySelectorAll('.auth-tab');

authTabs.forEach(tab => {
  tab.onclick = () => {
    // Update active tab
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show correct form
    if (tab.dataset.tab === 'login') {
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
    }
  };
});

// Navbar & pages
const navLinks = document.querySelectorAll('.nav-link[data-page]');
const pageSections = {
  home: document.getElementById('page-home'),
  trainingen: document.getElementById('page-trainingen'),
  scores: document.getElementById('page-scores'),
  gezondheid: document.getElementById('page-gezondheid'),
  profiel: document.getElementById('page-profiel')
};
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

// Check if we have a stored token and user
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

if (storedToken && storedUser) {
  try {
    currentUser = JSON.parse(storedUser);
    loginOverlay.style.display = 'none';
    appDiv.style.display = 'block';
    showPage('home');
  } catch (err) {
    // If stored user is invalid JSON, clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
} else {
  loginOverlay.style.display = 'flex';
  appDiv.style.display = 'none';
}

const ONDERDELEN = [
  '100m', '200m', '400m', '800m', '1500m', '5km', '10km',
  'verspringen', 'hoogspringen', 'kogelstoten', 'speerwerpen', 'discuswerpen', 'hinkstapsprong'
];

// Global chart instances
let radarChart = null;
let sleepChart = null;

function showPage(page) {
  // First fade out all pages
  Object.keys(pageSections).forEach(p => {
    if (pageSections[p].style.display !== 'none') {
      pageSections[p].style.opacity = '0';
      pageSections[p].style.transform = 'scale(0.98)';
    }
  });

  // After fade out, switch pages
  setTimeout(() => {
  Object.keys(pageSections).forEach(p => {
    pageSections[p].style.display = (p === page) ? 'block' : 'none';
  });
    
    // Fade in new page
    if (pageSections[page]) {
      pageSections[page].style.opacity = '0';
      pageSections[page].style.transform = 'scale(0.98)';
      
      requestAnimationFrame(() => {
        pageSections[page].style.opacity = '1';
        pageSections[page].style.transform = 'scale(1)';
      });
    }
    
    // Update navigation
  navLinks.forEach(link => {
      if (link.dataset.page === page) {
        link.classList.add('active');
        link.style.transform = 'translateY(-2px)';
      } else {
        link.classList.remove('active');
        link.style.transform = 'none';
      }
    });
  }, 200);

  // Render the page content
  if (page === 'home') renderHome();
  if (page === 'trainingen') renderTrainingen();
  if (page === 'scores') renderScores();
  if (page === 'gezondheid') renderGezondheid();
  if (page === 'profiel') renderProfiel();
}

navLinks.forEach(link => {
  link.onclick = () => {
    if (link.id !== 'logout-btn') showPage(link.dataset.page);
  };
});

// Login form handler
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  // Validate input
  if (!username || !password) {
    loginError.textContent = 'Vul beide velden in';
    return;
  }
  
  // Clear previous error
  loginError.textContent = '';
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.textContent = 'Inloggen...';
  
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.msg || 'Login mislukt');
    }

    // Store auth data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;

    // Show main app
    loginOverlay.style.display = 'none';
    appDiv.style.display = 'block';
    showPage('home');

  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = err.message || 'Er is een fout opgetreden bij het inloggen';
    loginError.style.display = 'block';
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = 'Login';
  }
};

// Logout handler
logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  loginOverlay.style.display = 'flex';
  appDiv.style.display = 'none';
  
  // Clear form and error
  loginForm.reset();
  loginError.textContent = '';
  
  // Reset any page state
  Object.values(pageSections).forEach(section => {
    section.innerHTML = '';
  });
};

// Enhanced loading animation
function showLoading(element, message = 'Laden...') {
  element.innerHTML = `
    <div class="loading-placeholder">
      <div class="loading-spinner"></div>
      <span class="loading-text">${message}</span>
    </div>
  `;
}

// Enhanced error display
function showError(message, duration = 5000) {
  const errorDiv = document.getElementById('error-message') || document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.className = 'error-message';
  
  errorDiv.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  if (!document.getElementById('error-message')) {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
  
  // Fade in
  errorDiv.style.opacity = '0';
  errorDiv.style.transform = 'translateY(-20px)';
  
  requestAnimationFrame(() => {
    errorDiv.style.opacity = '1';
    errorDiv.style.transform = 'translateY(0)';
  });
  
  // Auto hide with fade out
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      errorDiv.remove();
    }, 300);
  }, duration);
}

// Enhanced success message
function showSuccess(message, duration = 3000) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  
  successDiv.innerHTML = `
    <div class="success-content">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(successDiv);
  
  // Fade in
  successDiv.style.opacity = '0';
  successDiv.style.transform = 'translateY(20px)';
  
  requestAnimationFrame(() => {
    successDiv.style.opacity = '1';
    successDiv.style.transform = 'translateY(0)';
  });
  
  // Auto hide with fade out
  setTimeout(() => {
    successDiv.style.opacity = '0';
    successDiv.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      successDiv.remove();
    }, 300);
  }, duration);
}

// Enhanced chart configurations
const chartConfig = {
  radar: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 25, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(124, 124, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw.toFixed(1)}/10`;
          }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        beginAtZero: true,
        grid: {
          color: 'rgba(124, 124, 255, 0.1)'
        },
        angleLines: {
          color: 'rgba(124, 124, 255, 0.1)'
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: '600'
          }
        },
        ticks: {
          stepSize: 2,
          color: 'rgba(255, 255, 255, 0.6)',
          backdropColor: 'transparent',
          z: 100
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.4
      },
      point: {
        radius: 4,
        borderWidth: 2,
        hoverRadius: 6,
        hoverBorderWidth: 2
      }
    }
  },
  line: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 25, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(124, 124, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(124, 124, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(124, 124, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: function(value) {
            return value + 'u';
          }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2,
        borderColor: 'rgba(124, 124, 255, 0.8)',
        backgroundColor: 'rgba(124, 124, 255, 0.2)',
        fill: true
      },
      point: {
        radius: 4,
        hitRadius: 6,
        hoverRadius: 6,
        backgroundColor: 'rgba(124, 124, 255, 1)',
        borderColor: '#fff',
        borderWidth: 2
      }
    }
  }
};

// SPA: render functies per pagina
function renderHome() {
  pageSections.home.innerHTML = `
    <div class="page-section">
      <div class="welcome-banner">
        <h1>
          <span class="greeting">
            <i class="fas fa-hand-wave"></i>
            Welkom terug
          </span>
          <span class="athlete-name">${currentUser ? currentUser.username : 'Atleet'}</span>
        </h1>
        <div class="today-status">
          <div class="status-icon">
            <i class="fas fa-calendar-day"></i>
          </div>
          <div class="status-text">
            <span class="today-date">${new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span class="training-status">Je voortgang voor vandaag</span>
          </div>
        </div>
      </div>

      <div class="dashboard-stats-grid">
        <div class="dashboard-stat-box">
          <div class="stat-header">
            <div class="card-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <span class="stat-label">Training Score</span>
          </div>
          <div id="score-value" class="stat-value">-</div>
        </div>
        <div class="dashboard-stat-box">
          <div class="stat-header">
            <div class="card-icon">
              <i class="fas fa-fire-alt"></i>
            </div>
            <span class="stat-label">Volume per Week</span>
          </div>
          <div id="volume-value" class="stat-value">-</div>
        </div>
        <div class="dashboard-stat-box">
          <div class="stat-header">
            <div class="card-icon">
              <i class="fas fa-heartbeat"></i>
            </div>
            <span class="stat-label">Gezondheid Status</span>
          </div>
          <div id="health-value" class="stat-value">-</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>
              <i class="fas fa-calendar-day"></i>
              Vandaag
            </h3>
          </div>
          <div id="dashboard-today" class="card-content">
            <div class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Trainingen laden...</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>
              <i class="fas fa-chart-radar"></i>
              Prestatie Radar
            </h3>
          </div>
          <div class="card-content">
            <canvas id="fitnessRadar"></canvas>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>
              <i class="fas fa-moon"></i>
              Slaap Trend
            </h3>
            <div class="card-actions">
              <button class="button-icon" title="Vorige week">
                <i class="fas fa-chevron-circle-left"></i>
              </button>
              <span id="sleep-date-range">Deze week</span>
              <button class="button-icon" title="Volgende week">
                <i class="fas fa-chevron-circle-right"></i>
              </button>
            </div>
          </div>
          <div class="card-content">
            <canvas id="sleep-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>
              <i class="fas fa-award"></i>
              Prestaties & Badges
            </h3>
          </div>
          <div id="dashboard-badges" class="card-content">
            <div class="loading-placeholder">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Prestaties laden...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize dashboard
  setTimeout(() => {
    loadDashboard();
    loadDashboardToday();
    renderBadges();
  }, 100);
}

async function loadDashboard() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token');
    }
    
    // Load all required data
    const [dashRes, healthRes, sleepRes, fitnessRes] = await Promise.all([
      fetch(`${API_URL}/user/dashboard`, { headers: { 'x-auth-token': token } }),
      fetch(`${API_URL}/user/health`, { headers: { 'x-auth-token': token } }),
      fetch(`${API_URL}/user/sleep`, { headers: { 'x-auth-token': token } }),
      fetch(`${API_URL}/user/fitness`, { headers: { 'x-auth-token': token } })
    ]);

    // Check if any requests failed
    if (!dashRes.ok || !healthRes.ok || !sleepRes.ok || !fitnessRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const [dashData, healthData, sleepData, fitnessData] = await Promise.all([
      dashRes.json(),
      healthRes.json(),
      sleepRes.json(),
      fitnessRes.json()
    ]);

    // Ensure we have arrays and proper date objects
    const healthArray = Array.isArray(healthData) ? healthData : [];
    const sleepArray = Array.isArray(sleepData) ? sleepData : [];

    // Calculate recent stats with proper date handling
    const recentHealth = healthArray.length > 0 ? 
      healthArray
        .map(h => ({
          ...h,
          datum: new Date(h.datum)
        }))
        .sort((a, b) => b.datum - a.datum)[0]
      : null;

    const avgSleep = sleepArray.length ? 
      (sleepArray.reduce((a, b) => a + (Number(b.uren) || 0), 0) / sleepArray.length).toFixed(1) : null;

    // Update stat values with fallbacks
    const scoreValue = document.getElementById('score-value');
    const volumeValue = document.getElementById('volume-value');
    const healthValue = document.getElementById('health-value');

    if (scoreValue) {
      scoreValue.textContent = dashData.avgScore ? dashData.avgScore.toFixed(1) : '-';
    }
    if (volumeValue) {
      volumeValue.textContent = dashData.volume ? `${Math.round(dashData.volume)}min` : '-';
    }
    if (healthValue) {
      healthValue.textContent = recentHealth ? recentHealth.status : '-';
    }

    // Update radar chart if it exists
    if (dashData.radar) {
      const radarCtx = document.getElementById('fitnessRadar');
      if (radarCtx) {
        // Get the container div
        const container = radarCtx.closest('.card-content');
        if (container) {
          container.innerHTML = `
            <div class="radar-container">
              <div class="radar-header">
                <div class="radar-title">
                  <i class="fas fa-chart-radar"></i>
                  Prestatie Metrics
                </div>
                <div class="radar-actions">
                  <button class="button-icon" title="Vorige week">
                    <i class="fas fa-chevron-circle-left"></i>
                  </button>
                  <span id="radar-date-range">Deze week</span>
                  <button class="button-icon" title="Volgende week">
                    <i class="fas fa-chevron-circle-right"></i>
                  </button>
                </div>
              </div>
              <div class="radar-chart-wrapper">
                <canvas id="fitnessRadar"></canvas>
              </div>
              <div class="chart-legend">
                <div class="legend-item">
                  <span class="legend-color" style="background: rgba(124, 124, 255, 0.8)"></span>
                  <span>Huidige Week</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background: rgba(255, 255, 255, 0.2)"></span>
                  <span>Vorige Week</span>
                </div>
              </div>
              <div class="fitness-scores">
                <div class="fitness-score">
                  <div class="score-label">
                    <i class="fas fa-bolt"></i>
                    Kracht Score
                  </div>
                  <div class="score-value">${fitnessData.strength.toFixed(1)}</div>
                  <div class="score-trend ${getTrendClass(fitnessData.strengthTrend)}">
                    ${getTrendIcon(fitnessData.strengthTrend)}
                    ${fitnessData.strengthTrend > 0 ? '+' : ''}${fitnessData.strengthTrend.toFixed(1)}%
                  </div>
                </div>
                <div class="fitness-score">
                  <div class="score-label">
                    <i class="fas fa-running"></i>
                    Conditie Score
                  </div>
                  <div class="score-value">${fitnessData.endurance.toFixed(1)}</div>
                  <div class="score-trend ${getTrendClass(fitnessData.enduranceTrend)}">
                    ${getTrendIcon(fitnessData.enduranceTrend)}
                    ${fitnessData.enduranceTrend > 0 ? '+' : ''}${fitnessData.enduranceTrend.toFixed(1)}%
                  </div>
                </div>
                <div class="fitness-score">
                  <div class="score-label">
                    <i class="fas fa-balance-scale"></i>
                    Balans Score
                  </div>
                  <div class="score-value">${fitnessData.balance.toFixed(1)}</div>
                  <div class="score-trend ${getTrendClass(fitnessData.balanceTrend)}">
                    ${getTrendIcon(fitnessData.balanceTrend)}
                    ${fitnessData.balanceTrend > 0 ? '+' : ''}${fitnessData.balanceTrend.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          `;

          // Destroy existing chart if it exists
          if (radarChart) {
            radarChart.destroy();
          }

          // Create new chart
          const newRadarCtx = document.getElementById('fitnessRadar');
        const radarData = {
          labels: Object.keys(dashData.radar),
            datasets: [
              {
                label: 'Deze Week',
            data: Object.values(dashData.radar),
            fill: true,
            backgroundColor: 'rgba(124, 124, 255, 0.2)',
            borderColor: 'rgba(124, 124, 255, 0.8)',
            pointBackgroundColor: 'rgba(124, 124, 255, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(124, 124, 255, 1)'
              },
              {
                label: 'Vorige Week',
                data: Object.values(dashData.previousRadar || {}),
                fill: true,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                pointBackgroundColor: 'rgba(255, 255, 255, 0.5)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)'
              }
            ]
          };

          radarChart = new Chart(newRadarCtx, {
          type: 'radar',
          data: radarData,
            options: chartConfig.radar
          });
        }
      }
    }

    // Update sleep chart if it exists
    const sleepCtx = document.getElementById('sleep-chart');
    if (sleepCtx && sleepArray.length > 0) {
      try {
        // Destroy existing chart if it exists
        if (sleepChart) {
          sleepChart.destroy();
        }

        const last7Days = sleepArray
          .map(s => ({
            ...s,
            datum: new Date(s.datum)
          }))
          .sort((a, b) => a.datum - b.datum)
          .slice(-7);

        // Create new chart
        const ctx = sleepCtx.getContext('2d');
        if (!ctx) {
          console.error('Could not get sleep chart context');
          return;
        }

        sleepChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: last7Days.map(s => s.datum.toLocaleDateString('nl-NL', { weekday: 'short' })),
            datasets: [{
              label: 'Slaap (uren)',
              data: last7Days.map(s => Number(s.uren) || 0),
              borderColor: 'rgba(124, 124, 255, 0.8)',
              backgroundColor: 'rgba(124, 124, 255, 0.2)',
              tension: 0.4,
              fill: true
            }]
          },
          options: chartConfig.line
        });
      } catch (err) {
        console.error('Error creating sleep chart:', err);
        if (sleepCtx.parentNode) {
          sleepCtx.parentNode.innerHTML = `
            <div class="error-state">
              <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <div class="error-content">
                <p class="error-message">Fout bij laden slaapgrafiek</p>
              </div>
            </div>
          `;
        }
      }
    }

  } catch (err) {
    console.error('Error loading dashboard:', err);
    // Show error state in dashboard
    const errorStates = document.querySelectorAll('.dashboard-stat-box .stat-value');
    errorStates.forEach(el => {
      el.textContent = '-';
      el.classList.add('error');
    });

    // Show error message in charts
    const chartContainers = ['fitnessRadar', 'sleep-chart'].map(id => document.getElementById(id));
    chartContainers.forEach(container => {
      if (container) {
        container.innerHTML = `
          <div class="error-state">
            <div class="error-icon">
              <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="error-content">
              <p class="error-message">Fout bij laden data</p>
            </div>
          </div>
        `;
      }
    });
  }
}

async function loadDashboardToday() {
  const todayDiv = document.getElementById('dashboard-today');
  todayDiv.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Trainingen laden...</span>
    </div>
  `;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/training`, {
      headers: { 'x-auth-token': token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Fout bij ophalen trainingen');
    
    const today = new Date().toISOString().slice(0, 10);
    const vandaag = data.filter(t => t.date && t.date.slice(0,10) === today);
    
    if (vandaag.length === 0) {
      todayDiv.innerHTML = `
        <div class="no-trainings">
          <div class="no-trainings-icon">
            <i class="fas fa-calendar-plus"></i>
          </div>
          <div class="no-trainings-text">
            <p>Geen trainingen gepland voor vandaag</p>
            <p class="no-trainings-sub">Perfect moment om te herstellen of een nieuwe training in te plannen!</p>
          </div>
        </div>
      `;
      return;
    }

    todayDiv.innerHTML = `
      <div class="today-trainings">
        <ul class="training-list">
          ${vandaag.map(training => `
            <li class="training-item${training.completed ? ' completed' : ''}">
              <div class="training-info">
                <div class="training-header">
                  <span class="training-type">
                    ${getTrainingTypeIcon(training.type)} ${training.type}
                  </span>
                </div>
                <div class="training-details">
                  <span class="training-duration">
                    <i class="fas fa-clock"></i>
                    ${training.duration} min
                  </span>
                  ${training.description ? `
                    <span class="training-desc">
                      <i class="fas fa-info-circle"></i>
                      ${training.description}
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="training-status">
                ${training.completed ? `
                  <span class="status-completed">
                    <i class="fas fa-check-circle"></i>
                    Afgerond
                  </span>
                ` : `
                  <button class="btn-afvinken" onclick="completeTraining('${training._id}')">
                    <i class="fas fa-check"></i>
                    Afvinken
                  </button>
                `}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  } catch (err) {
    todayDiv.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="error-content">
          <h4 class="error-title">Fout bij ophalen trainingen</h4>
          <p class="error-message">${err.message}</p>
        </div>
      </div>
    `;
  }
}

function getTrainingTypeIcon(type) {
    const icons = {
        'kracht': '<i class="fas fa-dumbbell"></i>',
        'sprint': '<i class="fas fa-bolt"></i>',
        'looptechniek': '<i class="fas fa-running"></i>',
        'hordentraining': '<i class="fas fa-stream"></i>',
        'herstel': '<i class="fas fa-hot-tub"></i>',
        'interval': '<i class="fas fa-stopwatch"></i>',
        'duurloop': '<i class="fas fa-road"></i>',
        'overig': '<i class="fas fa-layer-group"></i>'
    };
    return icons[type] || '<i class="fas fa-layer-group"></i>';
}

function renderBadges() {
  const badgesDiv = document.getElementById('dashboard-badges');
  let badges = [];
  
  if (currentUser && currentUser.points > 0) {
    badges.push({
      icon: '<i class="fas fa-crown"></i>',
      name: 'Consistency King',
      description: '7 dagen achter elkaar getraind'
    });
  }
  
  badges.push(
    {
      icon: '<i class="fas fa-bullseye"></i>',
      name: 'Goal Setter',
      description: '5 doelen behaald'
    },
    {
      icon: '<i class="fas fa-bolt"></i>',
      name: 'Speed Demon',
      description: 'PR verbeterd op 100m'
    }
  );

  badgesDiv.innerHTML = badges.length ? `
    <div class="badges-grid">
      ${badges.map(badge => `
        <div class="badge">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-info">
            <h4 class="badge-name">${badge.name}</h4>
            <p class="badge-description">${badge.description}</p>
          </div>
        </div>
      `).join('')}
    </div>
  ` : `
    <div class="no-badges">
      <div class="badge-icon">
        <i class="fas fa-trophy"></i>
      </div>
      <p>Begin met trainen om badges te verdienen!</p>
    </div>
  `;
}

function renderTrainingen() {
  pageSections.trainingen.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h1>
          <span class="section-icon">
            <i class="fas fa-dumbbell"></i>
          </span>
          Trainingen
        </h1>
        <div class="section-actions">
          <button class="button-secondary">
            <i class="fas fa-filter"></i>
            Filter
          </button>
          <button class="button-primary">
            <i class="fas fa-plus-circle"></i>
            Nieuwe Training
          </button>
        </div>
      </div>

      <div class="stats-overview">
        <div id="trainingen-stats" class="stat-row"></div>
      </div>

      <div class="content-grid">
        <div class="main-content">
          <div class="card">
            <div class="card-header">
              <h3>
                <span class="card-icon">
                  <i class="fas fa-th-list"></i>
                </span>
                Trainingsoverzicht
              </h3>
              <div class="card-actions">
                <div class="view-options">
                  <button class="button-icon active" title="Lijst weergave">
                    <i class="fas fa-th-list"></i>
                  </button>
                  <button class="button-icon" title="Kalender weergave">
                    <i class="fas fa-calendar-week"></i>
                  </button>
                </div>
              </div>
            </div>
            <div id="trainingen-content" class="card-content">
              <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Trainingen laden...</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="side-content">
          <div id="add-training-block"></div>
        </div>
      </div>
    </div>
  `;
  
  loadTrainingen();
  renderAddTrainingForm();
}

async function loadTrainingen() {
  const content = document.getElementById('trainingen-content');
  const stats = document.getElementById('trainingen-stats');
  
  if (!content || !stats) {
    console.error('Required elements not found');
    return;
  }

  // Show loading state
  content.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Trainingen laden...</span>
    </div>
  `;
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token');
    }

    const res = await fetch(`${API_URL}/training`, {
      headers: { 'x-auth-token': token }
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.msg || 'Fout bij ophalen trainingen');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Ongeldig antwoord van server');
    }

    // Update statistics
    const totaal = data.length;
    const totaalMinuten = data.reduce((acc, t) => acc + (parseInt(t.duration)||0), 0);
    const afgerond = data.filter(t => t.completed).length;
    
    stats.innerHTML = `
      <div class="stat-box">Totaal: <b>${totaal}</b></div>
      <div class="stat-box">Afgerond: <b>${afgerond}</b></div>
      <div class="stat-box">Totaal min: <b>${totaalMinuten}</b></div>
    `;

    // Show empty state if no trainings
    if (data.length === 0) {
      content.innerHTML = `
        <div class="no-trainings">
          <div class="no-trainings-icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div class="no-trainings-text">
            <p>Nog geen trainingen toegevoegd</p>
            <p class="no-trainings-sub">Begin met het toevoegen van je eerste training!</p>
          </div>
        </div>
      `;
      return;
    }

    // Render training list
    content.innerHTML = `<ul class="training-list"></ul>`;
    const ul = content.querySelector('ul');
    
    // Sort trainings by date descending
    data.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    // Create training items
    data.forEach(training => {
      const li = document.createElement('li');
      li.className = 'training-item' + (training.completed ? ' completed' : '');
      li.innerHTML = `
        <div class="training-info">
          <div class="training-header">
            <span class="training-name">${training.name}</span>
            <span class="training-type">${getTrainingTypeIcon(training.type)} ${training.type}</span>
          </div>
          <div class="training-details">
            <span class="training-date">
              <i class="fas fa-calendar"></i>
              ${training.date ? new Date(training.date).toLocaleDateString() : '-'}
            </span>
            <span class="training-duration">
              <i class="fas fa-clock"></i>
              ${training.duration} min
            </span>
            ${training.description ? `
              <span class="training-desc">
                <i class="fas fa-info-circle"></i>
                ${training.description}
              </span>
            ` : ''}
          </div>
        </div>
        <div class="training-actions">
          ${!training.completed ? `
            <button class="btn-afvinken" onclick="completeTraining('${training._id}')">
              <i class="fas fa-check"></i>
              Afvinken
            </button>
          ` : `
            <span class="status-completed">
              <i class="fas fa-check-circle"></i>
              Afgerond
            </span>
          `}
        </div>
      `;
      ul.appendChild(li);
    });

  } catch (err) {
    console.error('Error loading trainingen:', err);
    content.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="error-content">
          <h4 class="error-title">Fout bij laden trainingen</h4>
          <p class="error-message">${err.message}</p>
        </div>
      </div>
    `;
  }
}

function renderAddTrainingForm() {
  const block = document.getElementById('add-training-block');
  block.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>
          <i class="fas fa-dumbbell"></i>
          Nieuwe Training
        </h3>
      </div>
      <form id="training-form" class="training-form">
        <div class="form-group">
          <label>
            <i class="fas fa-heading"></i>
            Naam
          </label>
          <input 
            type="text" 
            id="training-name" 
            placeholder="Bijv. Intervaltraining" 
            required 
          />
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-tags"></i>
            Type Training
          </label>
          <select id="training-type" required>
            <option value="">Selecteer type</option>
            <option value="kracht">Kracht</option>
            <option value="sprint">Sprint</option>
            <option value="looptechniek">Looptechniek</option>
            <option value="hordentraining">Hordentraining</option>
            <option value="interval">Interval</option>
            <option value="duurloop">Duurloop</option>
            <option value="herstel">Herstel</option>
            <option value="overig">Overig</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>
              <i class="fas fa-calendar"></i>
              Datum
            </label>
            <input 
              type="date" 
              id="training-date" 
              required 
            />
          </div>

          <div class="form-group">
            <label>
              <i class="fas fa-clock"></i>
              Duur (minuten)
            </label>
            <input 
              type="number" 
              id="training-duration" 
              min="1" 
              required 
            />
          </div>
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-align-left"></i>
            Beschrijving
          </label>
          <textarea 
            id="training-desc" 
            rows="3" 
            placeholder="Optionele beschrijving van de training"
          ></textarea>
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-repeat"></i>
            Herhaling
          </label>
          <div id="repeat-days" class="repeat-days-grid">
            ${['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, index) => `
              <label class="day-checkbox">
                <input 
                  type="checkbox" 
                  value="${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]}"
                />
                <span>${day}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="button-secondary">
            <i class="fas fa-times"></i>
            Annuleren
          </button>
          <button type="submit" class="button-primary">
            <i class="fas fa-plus-circle"></i>
            Training Toevoegen
          </button>
        </div>

        <div id="add-training-error" class="error" style="display: none;"></div>
      </form>
    </div>
  `;

  const form = document.getElementById('training-form');
  const errorDiv = document.getElementById('add-training-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = document.getElementById('training-name').value.trim();
    const description = document.getElementById('training-desc').value.trim();
    const date = document.getElementById('training-date').value;
    const duration = document.getElementById('training-duration').value;
    const type = document.getElementById('training-type').value;
    const repeat = Array.from(document.querySelectorAll('#repeat-days input:checked')).map(cb => cb.value);

    errorDiv.style.display = 'none';
    
    if (!name || !date || !duration || !type) {
      errorDiv.textContent = 'Vul alle verplichte velden in';
      errorDiv.style.display = 'flex';
      return;
    }

    try {
      const res = await fetch(`${API_URL}/training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ name, description, date, duration, type, repeat })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Fout bij toevoegen training');
      }

      // Success feedback
      form.reset();
      
      // Show success message
      showSuccess('✅ Training succesvol toegevoegd!');

      // Reload trainings list
      loadTrainingen();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'flex';
    }
  };

  // Cancel button handler
  const cancelBtn = form.querySelector('button.button-secondary');
  cancelBtn.onclick = () => {
    form.reset();
    errorDiv.style.display = 'none';
  };
}

async function completeTraining(id) {
  const token = localStorage.getItem('token');
  
  try {
    // Haal eerst de training op om de datum te controleren
    const trainingRes = await fetch(`${API_URL}/training/${id}`, {
      headers: { 'x-auth-token': token }
    });
    
    if (!trainingRes.ok) {
      throw new Error('Kon training niet ophalen');
    }
    
    const training = await trainingRes.json();
    const trainingDate = new Date(training.date);
    const today = new Date();
    
    // Check of het vandaag is
    if (trainingDate.toDateString() !== today.toDateString()) {
      showError('Je kunt een training alleen afvinken op de dag zelf');
      return;
    }

    // Toon het formulier
    const formHtml = `
      <div class="modal-overlay">
        <div class="modal training-complete-modal">
          <div class="modal-header">
            <h3>Training Afronden</h3>
            <button class="modal-close" onclick="document.querySelector('.modal-overlay').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form id="complete-training-form" class="training-form">
            <div class="form-group">
              <label>
                <i class="fas fa-star"></i>
                Score (1-10)
              </label>
              <input 
                type="number" 
                id="training-score" 
                min="1" 
                max="10" 
                required 
                placeholder="Hoe ging de training? (1-10)"
              />
            </div>

            <div class="form-group">
              <label>
                <i class="fas fa-fire"></i>
                Intensiteit (1-10)
              </label>
              <input 
                type="number" 
                id="training-intensity" 
                min="1" 
                max="10" 
                required 
                placeholder="Hoe intensief was de training? (1-10)"
              />
            </div>

            <div class="form-group">
              <label>
                <i class="fas fa-battery-three-quarters"></i>
                Energie Level
              </label>
              <select id="training-energy" required>
                <option value="">Kies je energie level</option>
                <option value="hoog">Hoog</option>
                <option value="normaal">Normaal</option>
                <option value="laag">Laag</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                <i class="fas fa-smile"></i>
                Algemeen Gevoel
              </label>
              <select id="training-feeling" required>
                <option value="">Hoe voel je je?</option>
                <option value="uitstekend">Uitstekend</option>
                <option value="goed">Goed</option>
                <option value="matig">Matig</option>
                <option value="slecht">Slecht</option>
              </select>
            </div>

            <div class="metrics-grid">
              <div class="form-group">
                <label>
                  <i class="fas fa-dumbbell"></i>
                  Kracht Score (1-10)
                </label>
                <input 
                  type="number" 
                  id="metric-strength" 
                  min="1" 
                  max="10" 
                  required 
                  placeholder="Kracht prestatie"
                />
              </div>

              <div class="form-group">
                <label>
                  <i class="fas fa-running"></i>
                  Uithouding Score (1-10)
                </label>
                <input 
                  type="number" 
                  id="metric-endurance" 
                  min="1" 
                  max="10" 
                  required 
                  placeholder="Uithouding prestatie"
                />
              </div>

              <div class="form-group">
                <label>
                  <i class="fas fa-bullseye"></i>
                  Techniek Score (1-10)
                </label>
                <input 
                  type="number" 
                  id="metric-technique" 
                  min="1" 
                  max="10" 
                  required 
                  placeholder="Techniek prestatie"
                />
              </div>
            </div>

            <div class="form-group">
              <label>
                <i class="fas fa-comment"></i>
                Notities
              </label>
              <textarea 
                id="training-notes" 
                rows="4" 
                placeholder="Hoe ging de training? Wat ging er goed/minder goed?"
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="button" class="button-secondary" onclick="document.querySelector('.modal-overlay').remove()">
                Annuleren
              </button>
              <button type="submit" class="button-primary">
                <i class="fas fa-check"></i>
                Training Afronden
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Voeg het formulier toe aan de pagina
    document.body.insertAdjacentHTML('beforeend', formHtml);

    // Handle form submit
    document.getElementById('complete-training-form').onsubmit = async (e) => {
      e.preventDefault();
      
      const completionData = {
        completed: true,
        score: parseInt(document.getElementById('training-score').value),
        completionDetails: {
          completedAt: new Date(),
          notes: document.getElementById('training-notes').value.trim(),
          intensity: parseInt(document.getElementById('training-intensity').value),
          energy: document.getElementById('training-energy').value,
          feeling: document.getElementById('training-feeling').value,
          metrics: {
            strength: parseInt(document.getElementById('metric-strength').value),
            endurance: parseInt(document.getElementById('metric-endurance').value),
            technique: parseInt(document.getElementById('metric-technique').value)
          }
        }
      };

      try {
        const res = await fetch(`${API_URL}/training/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token 
          },
          body: JSON.stringify(completionData)
        });

        if (!res.ok) {
          throw new Error('Kon training niet afronden');
        }

        // Verwijder het formulier
        document.querySelector('.modal-overlay').remove();
        
        // Toon success message
        showSuccess('Training succesvol afgerond! 💪');
        
        // Herlaad de trainingen
        loadTrainingen();
        
      } catch (err) {
        showError('Er ging iets mis bij het afronden van de training');
        console.error('Complete training error:', err);
      }
    };

  } catch (err) {
    showError('Er ging iets mis');
    console.error('Complete training error:', err);
  }
}

function renderScores() {
  pageSections.scores.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h1>
          <span class="section-icon">
            <i class="fas fa-trophy"></i>
          </span>
          Scores & PR's
        </h1>
        <div class="section-actions">
          <button class="button-primary">
            <i class="fas fa-plus-circle"></i>
            Nieuwe Score
          </button>
        </div>
      </div>

      <div class="content-grid">
        <div class="main-content">
          <div class="card">
            <div class="card-header">
              <h3>
                <span class="card-icon">
                  <i class="fas fa-medal"></i>
                </span>
                Persoonlijke Records
              </h3>
              <div class="card-actions">
                <button class="button-icon" title="Filter">
                  <i class="fas fa-filter"></i>
                </button>
                <button class="button-icon" title="Vernieuwen">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
            <div id="scores-list" class="card-content">
              <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Scores laden...</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="side-content">
          <div id="add-score-block"></div>
        </div>
      </div>
    </div>
  `;
  
  loadScores();
  renderAddScoreForm();
}

async function loadScores() {
  const listDiv = document.getElementById('scores-list');
  if (!listDiv) return; // Guard against null element

  listDiv.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Scores laden...</span>
    </div>
  `;

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token');

    const res = await fetch(`${API_URL}/user/scores`, {
      headers: { 'x-auth-token': token }
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.msg || 'Fout bij ophalen scores');
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Ongeldig antwoord van server');
    }

    // Per onderdeel: beste score (laagste tijd/hoogste afstand)
    let html = `
      <table class="scores-table">
        <thead>
          <tr>
            <th>Onderdeel</th>
            <th>Beste PR</th>
            <th>Datum</th>
          </tr>
        </thead>
        <tbody>
    `;

    ONDERDELEN.forEach(onderdeel => {
      const scores = data.filter(s => s && s.type === onderdeel);
      if (scores.length === 0) {
        html += `
          <tr>
            <td>${onderdeel}</td>
            <td>-</td>
            <td>-</td>
          </tr>
        `;
      } else {
        // Voor tijdsonderdelen: laagste waarde is beste, voor springen/werpen: hoogste is beste
        let beste;
        if ([
          'verspringen','hoogspringen','kogelstoten','speerwerpen','discuswerpen','hinkstapsprong'
        ].includes(onderdeel)) {
          beste = scores.reduce((a,b) => (Number(a.waarde) || 0) > (Number(b.waarde) || 0) ? a : b);
        } else {
          beste = scores.reduce((a,b) => (Number(a.waarde) || 0) < (Number(b.waarde) || 0) ? a : b);
        }
        html += `
          <tr>
            <td>${onderdeel}</td>
            <td>${Number(beste.waarde).toFixed(2)}</td>
            <td>${beste.datum ? new Date(beste.datum).toLocaleDateString() : '-'}</td>
          </tr>
        `;
      }
    });

    html += '</tbody></table>';

    // --- Scoregeschiedenis per onderdeel ---
    html += '<div class="score-history-sections">';
    ONDERDELEN.forEach(onderdeel => {
      const scores = data.filter(s => s && s.type === onderdeel);
      if (scores.length > 1) {
        // Sorteer scores op datum oplopend
        scores.sort((a, b) => new Date(a.datum) - new Date(b.datum));
        html += `<div class="score-history-section"><h4>Geschiedenis: ${onderdeel}</h4><table class="score-history-table"><thead><tr><th>#</th><th>Datum</th><th>Score</th><th>Verschil</th></tr></thead><tbody>`;
        for (let i = 0; i < scores.length; i++) {
          const score = scores[i];
          const prev = i > 0 ? scores[i-1] : null;
          let verschil = '';
          let verschilClass = '';
          if (prev) {
            // Voor tijdsonderdelen: lager is beter, voor springen/werpen: hoger is beter
            let isTijd = !['verspringen','hoogspringen','kogelstoten','speerwerpen','discuswerpen','hinkstapsprong'].includes(onderdeel);
            let diff = Number(score.waarde) - Number(prev.waarde);
            if (isTijd) {
              if (diff < 0) {
                verschil = `${diff.toFixed(2)}s`;
                verschilClass = 'positive';
              } else if (diff > 0) {
                verschil = `+${diff.toFixed(2)}s`;
                verschilClass = 'negative';
              } else {
                verschil = '0.00s';
                verschilClass = 'neutral';
              }
            } else {
              if (diff > 0) {
                verschil = `+${diff.toFixed(2)}m`;
                verschilClass = 'positive';
              } else if (diff < 0) {
                verschil = `${diff.toFixed(2)}m`;
                verschilClass = 'negative';
              } else {
                verschil = '0.00m';
                verschilClass = 'neutral';
              }
            }
          }
          html += `<tr><td>${i+1}</td><td>${new Date(score.datum).toLocaleDateString()}</td><td>${score.waarde}</td><td class="score-trend ${verschilClass}">${verschil}</td></tr>`;
        }
        html += '</tbody></table></div>';
      }
    });
    html += '</div>';

    listDiv.innerHTML = html;
  } catch (err) {
    console.error('Error loading scores:', err);
    listDiv.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="error-content">
          <h4 class="error-title">Fout bij laden scores</h4>
          <p class="error-message">${err.message}</p>
        </div>
      </div>
    `;
  }
}

function renderAddScoreForm() {
  const block = document.getElementById('add-score-block');
  block.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>
          <i class="fas fa-trophy"></i>
          Nieuwe PR toevoegen
        </h3>
      </div>
      <form id="score-form" class="score-form">
        <div class="form-group">
          <label>
            <i class="fas fa-running"></i>
            Onderdeel
          </label>
          <select id="score-type" required>
            <option value="">Kies onderdeel</option>
            ${ONDERDELEN.map(o => `
              <option value="${o}">
                ${getEventIcon(o)} ${o}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-stopwatch"></i>
            Prestatie
          </label>
          <input 
            type="number" 
            id="score-waarde" 
            placeholder="Tijd (seconden) of afstand (meter)" 
            step="0.01" 
            min="0" 
            required 
          />
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-calendar"></i>
            Datum
          </label>
          <input 
            type="date" 
            id="score-datum" 
            required 
          />
        </div>

        <div class="form-actions">
          <button type="submit" class="button-primary">
            <i class="fas fa-plus-circle"></i>
            PR Toevoegen
          </button>
        </div>

        <div id="add-score-error" class="error" style="display: none;"></div>
      </form>
    </div>
  `;

  // Helper function to get appropriate icon for each event type
  function getEventIcon(event) {
    const icons = {
      '100m': '🏃',
      '200m': '🏃',
      '400m': '🏃',
      '800m': '🏃',
      '1500m': '🏃',
      '5km': '🏃',
      '10km': '🏃',
      'verspringen': '↗️',
      'hoogspringen': '↑',
      'kogelstoten': '🏋️',
      'speerwerpen': '🎯',
      'discuswerpen': '🥏',
      'hinkstapsprong': '↗️'
    };
    return icons[event] || '📊';
  }

  const form = document.getElementById('score-form');
  const errorDiv = document.getElementById('add-score-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const type = document.getElementById('score-type').value;
    const waarde = document.getElementById('score-waarde').value;
    const datum = document.getElementById('score-datum').value;

    errorDiv.style.display = 'none';
    
    if (!type || !waarde || !datum) {
      errorDiv.textContent = 'Vul alle verplichte velden in';
      errorDiv.style.display = 'flex';
      return;
    }

    try {
      const res = await fetch(`${API_URL}/user/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ type, waarde, datum })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Fout bij toevoegen PR');
      }

      // Success feedback
      form.reset();
      
      // Show success message
      showSuccess('✅ PR succesvol toegevoegd!');

      // Reload scores table
      loadScores();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'flex';
    }
  };
}

function renderGezondheid() {
  pageSections.gezondheid.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h1>
          <span class="section-icon">
            <i class="fas fa-heartbeat"></i>
          </span>
          Gezondheid & Welzijn
        </h1>
      </div>

      <div class="gezondheid-container">
        <div class="gezondheid-stats" id="gezondheid-stats">
          <div class="stat-box">
            <i class="fas fa-weight"></i>
            <span>Gewicht</span>
            <b>-</b>
          </div>
          <div class="stat-box">
            <i class="fas fa-ruler-vertical"></i>
            <span>Lengte</span>
            <b>-</b>
          </div>
          <div class="stat-box">
            <i class="fas fa-calculator"></i>
            <span>BMI</span>
            <b>-</b>
          </div>
          <div class="stat-box">
            <i class="fas fa-moon"></i>
            <span>Gem. Slaap</span>
            <b>-</b>
          </div>
        </div>
        
        <div class="gezondheid-forms">
          <div class="card">
            <div class="card-header">
              <h3>
                <i class="fas fa-weight-scale"></i>
                Gewicht & Lengte
              </h3>
            </div>
            <form id="metingen-form" class="health-form">
              <div class="form-group">
                <label>
                  <i class="fas fa-weight"></i>
                  Gewicht (kg)
                </label>
                <input type="number" id="gewicht" placeholder="Voer gewicht in" step="0.1" min="20" max="200" />
              </div>
              <div class="form-group">
                <label>
                  <i class="fas fa-ruler-vertical"></i>
                  Lengte (cm)
                </label>
                <input type="number" id="lengte" placeholder="Voer lengte in" step="1" min="100" max="250" />
              </div>
              <div class="form-actions">
                <button type="submit" class="primary">
                  <i class="fas fa-save"></i>
                  Bijwerken
                </button>
              </div>
            </form>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>
                <i class="fas fa-moon"></i>
                Slaap Registreren
              </h3>
            </div>
            <form id="slaap-form" class="health-form">
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <i class="fas fa-calendar"></i>
                    Datum
                  </label>
                  <input type="date" id="slaap-datum" required />
                </div>
                <div class="form-group">
                  <label>
                    <i class="fas fa-clock"></i>
                    Uren geslapen
                  </label>
                  <input type="number" id="slaap-uren" placeholder="Aantal uren" step="0.5" min="0" max="24" required />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <i class="fas fa-star"></i>
                    Slaapkwaliteit
                  </label>
                  <select id="slaap-kwaliteit" required>
                    <option value="">Selecteer kwaliteit</option>
                    <option value="uitstekend">⭐⭐⭐⭐ Uitstekend</option>
                    <option value="goed">⭐⭐⭐ Goed</option>
                    <option value="matig">⭐⭐ Matig</option>
                    <option value="slecht">⭐ Slecht</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>
                    <i class="fas fa-battery-three-quarters"></i>
                    Energie bij wakker worden
                  </label>
                  <select id="slaap-energie" required>
                    <option value="">Selecteer energie niveau</option>
                    <option value="hoog">🔋 Hoog</option>
                    <option value="normaal">🔋 Normaal</option>
                    <option value="laag">🔋 Laag</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>
                  <i class="fas fa-comment"></i>
                  Notities (optioneel)
                </label>
                <textarea id="slaap-notities" placeholder="Bijv. laat gegeten, stress, etc." rows="2"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="primary" id="slaap-submit">
                  <i class="fas fa-save"></i>
                  Opslaan
                </button>
                <button type="button" id="slaap-reset" class="secondary">
                  <i class="fas fa-undo"></i>
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>
                <i class="fas fa-heartbeat"></i>
                Gezondheid Status
              </h3>
            </div>
            <form id="gezondheid-form" class="health-form">
              <div class="form-group">
                <label>
                  <i class="fas fa-calendar"></i>
                  Datum
                </label>
                <input type="date" id="gezondheid-datum" required />
              </div>
              <div class="form-group">
                <label>
                  <i class="fas fa-heart"></i>
                  Status
                </label>
                <select id="gezondheid-status" required>
                  <option value="">Kies status</option>
                  <option value="uitstekend">💚 Uitstekend</option>
                  <option value="goed">💙 Goed</option>
                  <option value="matig">💛 Matig</option>
                  <option value="slecht">❤️ Slecht</option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  <i class="fas fa-comment"></i>
                  Notities (optioneel)
                </label>
                <textarea id="gezondheid-notitie" placeholder="Notities over je gezondheid" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="primary">
                  <i class="fas fa-save"></i>
                  Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="gezondheid-history">
          <div class="card">
            <div class="card-header">
              <h3>
                <i class="fas fa-history"></i>
                Slaap Geschiedenis
              </h3>
              <div class="card-actions">
                <button id="prev-week" class="button-icon" title="Vorige week">
                  <i class="fas fa-chevron-circle-left"></i>
                </button>
                <span id="date-range">Deze week</span>
                <button id="next-week" class="button-icon" title="Volgende week">
                  <i class="fas fa-chevron-circle-right"></i>
                </button>
              </div>
            </div>
            <div id="slaap-history">
              <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Slaapgegevens laden...</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h3>
                <i class="fas fa-chart-line"></i>
                Gezondheid Geschiedenis
              </h3>
            </div>
            <div id="gezondheid-history">
              <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Gezondheidsgegevens laden...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize forms and load data
  initGezondheidForms();
  loadGezondheidData();
}

function initGezondheidForms() {
  const slaapForm = document.getElementById('slaap-form');
  const slaapDatum = document.getElementById('slaap-datum');
  const slaapReset = document.getElementById('slaap-reset');
  let currentSleepId = null;

  // Set default date to today
  slaapDatum.value = new Date().toISOString().split('T')[0];
  
  // Week navigation for sleep history
  let currentWeekOffset = 0;
  const prevWeekBtn = document.getElementById('prev-week');
  const nextWeekBtn = document.getElementById('next-week');
  const dateRangeSpan = document.getElementById('date-range');

  function updateDateRange() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (start.getDay() || 7) + 1 + (currentWeekOffset * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = (date) => {
      return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    };

    dateRangeSpan.textContent = `${formatDate(start)} - ${formatDate(end)}`;
    loadSleepHistory(start, end);
  }

  prevWeekBtn.onclick = () => {
    currentWeekOffset--;
    updateDateRange();
  };

  nextWeekBtn.onclick = () => {
    if (currentWeekOffset < 0) {
      currentWeekOffset++;
      updateDateRange();
    }
  };

  // Initialize date range
  updateDateRange();

  slaapForm.onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = {
      datum: slaapDatum.value,
      uren: document.getElementById('slaap-uren').value,
      kwaliteit: document.getElementById('slaap-kwaliteit').value,
      energie: document.getElementById('slaap-energie').value,
      notities: document.getElementById('slaap-notities').value
    };

    try {
      const url = currentSleepId ? 
        `${API_URL}/user/sleep/${currentSleepId}` :
        `${API_URL}/user/sleep`;
      
      const res = await fetch(url, {
        method: currentSleepId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Fout bij opslaan slaapgegevens');

      // Reset form and reload data
      slaapForm.reset();
      slaapDatum.value = new Date().toISOString().split('T')[0];
      currentSleepId = null;
      document.getElementById('slaap-submit').textContent = 'Opslaan';
      updateDateRange();
      loadGezondheidData();
    } catch (err) {
      alert(err.message);
    }
  };

  slaapReset.onclick = () => {
    slaapForm.reset();
    slaapDatum.value = new Date().toISOString().split('T')[0];
    currentSleepId = null;
    document.getElementById('slaap-submit').textContent = 'Opslaan';
  };

  // Function to load sleep history for a date range
  async function loadSleepHistory(startDate, endDate) {
    const historyDiv = document.getElementById('slaap-history');
    historyDiv.innerHTML = '<div class="loading-placeholder">Laden...</div>';

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/user/sleep`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();

      // Filter and sort data for the selected week
      const weekData = data
        .filter(s => {
          const date = new Date(s.datum);
          return date >= startDate && date <= endDate;
        })
        .sort((a, b) => new Date(b.datum) - new Date(a.datum));

      if (weekData.length === 0) {
        historyDiv.innerHTML = '<div class="info-block">Geen slaapgegevens voor deze week.</div>';
        return;
      }

      historyDiv.innerHTML = `
        <table class="health-table">
          <tr>
            <th>Datum</th>
            <th>Uren</th>
            <th>Kwaliteit</th>
            <th>Energie</th>
            <th>Acties</th>
          </tr>
          ${weekData.map(s => `
            <tr data-id="${s._id}">
              <td>${new Date(s.datum).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
              <td>${s.uren}</td>
              <td><span class="sleep-quality ${s.kwaliteit}">${s.kwaliteit || '-'}</span></td>
              <td><span class="energy-level ${s.energie}">${s.energie || '-'}</span></td>
              <td>
                <button class="button-icon edit-sleep" title="Bewerken">✏️</button>
                <button class="button-icon delete-sleep" title="Verwijderen">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;

      // Add event listeners for edit and delete buttons
      historyDiv.querySelectorAll('.edit-sleep').forEach(btn => {
        btn.onclick = async () => {
          const row = btn.closest('tr');
          const sleepId = row.dataset.id;
          const sleepData = weekData.find(s => s._id === sleepId);
          
          // Fill form with sleep data
          slaapDatum.value = sleepData.datum.split('T')[0];
          document.getElementById('slaap-uren').value = sleepData.uren;
          document.getElementById('slaap-kwaliteit').value = sleepData.kwaliteit || '';
          document.getElementById('slaap-energie').value = sleepData.energie || '';
          document.getElementById('slaap-notities').value = sleepData.notities || '';
          
          currentSleepId = sleepId;
          document.getElementById('slaap-submit').textContent = 'Bijwerken';
          
          // Scroll to form
          slaapForm.scrollIntoView({ behavior: 'smooth' });
        };
      });

      historyDiv.querySelectorAll('.delete-sleep').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Weet je zeker dat je deze slaapregistratie wilt verwijderen?')) return;
          
          const row = btn.closest('tr');
          const sleepId = row.dataset.id;
          
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/user/sleep/${sleepId}`, {
              method: 'DELETE',
              headers: { 'x-auth-token': token }
            });
            
            if (!res.ok) throw new Error('Fout bij verwijderen slaapgegevens');
            
            // Reload data
            updateDateRange();
            loadGezondheidData();
          } catch (err) {
            alert(err.message);
          }
        };
      });

    } catch (err) {
      historyDiv.innerHTML = '<div class="error-state">Fout bij laden slaapgegevens</div>';
    }
  }
}

async function loadGezondheidData() {
  const token = localStorage.getItem('token');
  const statsDiv = document.getElementById('gezondheid-stats');
  const slaapHistory = document.getElementById('slaap-history');
  const gezondheidHistory = document.getElementById('gezondheid-history');

  try {
    // Load user profile data
    const profileRes = await fetch(`${API_URL}/user/profile`, {
      headers: { 'x-auth-token': token }
    });
    const profileData = await profileRes.json();

    // Load sleep data
    const sleepRes = await fetch(`${API_URL}/user/sleep`, {
      headers: { 'x-auth-token': token }
    });
    const sleepData = await sleepRes.json();

    // Load health data
    const healthRes = await fetch(`${API_URL}/user/health`, {
      headers: { 'x-auth-token': token }
    });
    const healthData = await healthRes.json();

    // Update stats
    statsDiv.innerHTML = `
      <div class="stat-box">
        Gewicht<br><b>${profileData.gewicht ? profileData.gewicht + ' kg' : '-'}</b>
      </div>
      <div class="stat-box">
        Lengte<br><b>${profileData.lengte ? profileData.lengte + ' cm' : '-'}</b>
      </div>
      <div class="stat-box">
        BMI<br><b>${profileData.gewicht && profileData.lengte ? 
          (profileData.gewicht / Math.pow(profileData.lengte/100, 2)).toFixed(1) : '-'}</b>
      </div>
      <div class="stat-box">
        Gem. Slaap<br><b>${sleepData.length ? 
          (sleepData.reduce((a,b) => a + b.uren, 0) / sleepData.length).toFixed(1) + ' uur' : '-'}</b>
      </div>
    `;

    // Update sleep history
    if (sleepData.length === 0) {
      slaapHistory.innerHTML = '<div class="info-block">Nog geen slaapdata toegevoegd.</div>';
    } else {
      const recentSleep = sleepData.sort((a,b) => new Date(b.datum) - new Date(a.datum)).slice(0, 7);
      slaapHistory.innerHTML = `
        <table class="health-table">
          <tr><th>Datum</th><th>Uren</th></tr>
          ${recentSleep.map(s => `
            <tr>
              <td>${new Date(s.datum).toLocaleDateString()}</td>
              <td>${s.uren}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    // Update health history
    if (healthData.length === 0) {
      gezondheidHistory.innerHTML = '<div class="info-block">Nog geen gezondheidsdata toegevoegd.</div>';
    } else {
      const recentHealth = healthData.sort((a,b) => new Date(b.datum) - new Date(a.datum)).slice(0, 7);
      gezondheidHistory.innerHTML = `
        <table class="health-table">
          <tr><th>Datum</th><th>Status</th><th>Notitie</th></tr>
          ${recentHealth.map(h => `
            <tr>
              <td>${new Date(h.datum).toLocaleDateString()}</td>
              <td><span class="health-status ${h.status}">${h.status}</span></td>
              <td>${h.notitie || '-'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }
  } catch (err) {
    console.error('Error loading health data:', err);
    statsDiv.innerHTML = '<div class="error">Fout bij laden gezondheidsdata</div>';
  }
}

function renderProfiel() {
  pageSections.profiel.innerHTML = `
    <h1>Profiel</h1>
    <div class="info-block">Hier kun je je persoonlijke gegevens en instellingen aanpassen.</div>
  `;
}

// Bij laden: check of user/token bestaat
window.onload = () => {
  const user = localStorage.getItem('user');
  if (user) {
    currentUser = JSON.parse(user);
    loginOverlay.style.display = 'none';
    appDiv.style.display = 'block';
    showPage('home');
  } else {
    loginOverlay.style.display = 'flex';
    appDiv.style.display = 'none';
  }
}; 

// Helper function to get trend class
function getTrendClass(trend) {
  if (trend > 0) return 'positive';
  if (trend < 0) return 'negative';
  return 'neutral';
}

// Helper function to get trend icon
function getTrendIcon(trend) {
  if (trend === 'up') return 'fas fa-arrow-up';
  if (trend === 'down') return 'fas fa-arrow-down';
  return 'fas fa-minus';
} 

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Add login form handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Ongeldige gebruikersnaam of wachtwoord');
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      
      // Hide login overlay and show app
      loginOverlay.style.display = 'none';
      appDiv.style.display = 'block';
      
      // Load initial page
      showPage('home');
      
    } catch (error) {
      loginError.textContent = error.message;
      loginError.style.display = 'block';
    }
  });
  
  // Add logout handler
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload();
  });
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (token) {
    loginOverlay.style.display = 'none';
    appDiv.style.display = 'block';
    showPage('home');
  }
});

// Mobile menu functionality
document.querySelector('.mobile-menu-toggle').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  const navLinks = document.querySelector('.nav-links');
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  
  if (!navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
    navLinks.classList.remove('active');
  }
});

// Close mobile menu when clicking a nav link
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('active');
  });
});