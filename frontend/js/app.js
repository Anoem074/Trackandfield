// Token handling
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function isLoggedIn() {
  return !!getToken();
}

// Login handling
async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.msg || 'Login mislukt');
    }

    const data = await response.json();
    setToken(data.token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Logout handling
function logout() {
  setToken(null);
  window.location.href = '/login.html';
}

// Page navigation
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
  });

  // Show requested page
  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
  }

  // Load page specific data
  switch (pageId) {
    case 'dashboard':
      loadDashboard().catch(err => {
        console.error('Error loading dashboard:', err);
        showError('Er is een fout opgetreden bij het laden van het dashboard');
      });
      break;
    case 'trainingen':
      loadTrainingen().catch(err => {
        console.error('Error loading trainingen:', err);
        showError('Er is een fout opgetreden bij het laden van de trainingen');
      });
      break;
    case 'scores':
      loadScores().catch(err => {
        console.error('Error loading scores:', err);
        showError('Er is een fout opgetreden bij het laden van de scores');
      });
      break;
  }
}

// Load trainingen
async function loadTrainingen() {
  try {
    const response = await fetch('/api/training', {
      headers: { 'x-auth-token': getToken() }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const trainings = await response.json();
    const container = document.getElementById('trainingen-container');
    
    if (!container) {
      console.error('Trainingen container not found');
      return;
    }

    if (!trainings || !trainings.length) {
      container.innerHTML = '<p>Geen trainingen beschikbaar</p>';
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Sort trainings by date descending
    trainings.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create training items
    trainings.forEach(training => {
      const div = document.createElement('div');
      div.className = `training-item ${training.completed ? 'completed' : ''}`;
      div.innerHTML = `
        <span class="date">${new Date(training.date).toLocaleDateString()}</span>
        <span class="name">${training.name || 'Unnamed Training'}</span>
        <span class="duration">${training.duration || 60}min</span>
        ${training.score ? `<span class="score">${training.score}/10</span>` : ''}
        <span class="type">${training.type || 'overig'}</span>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error loading trainingen:', error);
    const container = document.getElementById('trainingen-container');
    if (container) {
      container.innerHTML = '<p class="error">Er is een fout opgetreden bij het laden van de trainingen</p>';
    }
    throw error;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Check if logged in
  if (!isLoggedIn() && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
    return;
  }

  // Setup navigation
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('href').substring(1);
      showPage(pageId);
    });
  });

  // Setup login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await login(username, password);
        window.location.href = '/';
      } catch (error) {
        showError(error.message || 'Login mislukt');
      }
    });
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Load initial page
  const initialPage = window.location.hash.substring(1) || 'dashboard';
  showPage(initialPage);
});

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error-message') || document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  if (!document.getElementById('error-message')) {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Load dashboard data
async function loadDashboard() {
  try {
    const response = await fetch('/api/user/dashboard', {
      headers: { 'x-auth-token': getToken() }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update stats with fallbacks
    const statsElements = {
      'stats-volume': data.volume ? `${data.volume}min` : 'Geen data',
      'stats-days': data.daysWithTraining || '0',
      'stats-progress': data.progress > 0 ? `+${data.progress}` : data.progress,
      'stats-score': data.avgScore ? data.avgScore.toFixed(1) : '-'
    };

    Object.entries(statsElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
    
    // Update health data
    const healthContainer = document.getElementById('health-container');
    if (healthContainer) {
      const healthData = data.recentHealth || [];
      if (healthData.length) {
        healthContainer.innerHTML = '';
        healthData.forEach(item => {
          const div = document.createElement('div');
          div.className = 'health-item';
          div.innerHTML = `
            <span class="date">${new Date(item.datum).toLocaleDateString()}</span>
            <span class="status ${item.status}">${item.status}</span>
            ${item.notitie ? `<span class="note">${item.notitie}</span>` : ''}
          `;
          healthContainer.appendChild(div);
        });
      } else {
        healthContainer.innerHTML = '<p>Geen gezondheidsdata beschikbaar</p>';
      }
    }
    
    // Update sleep data
    const sleepContainer = document.getElementById('sleep-container');
    if (sleepContainer) {
      const sleepData = data.recentSleep || [];
      if (sleepData.length) {
        sleepContainer.innerHTML = '';
        sleepData.forEach(item => {
          const div = document.createElement('div');
          div.className = 'sleep-item';
          div.innerHTML = `
            <span class="date">${new Date(item.datum).toLocaleDateString()}</span>
            <span class="hours">${item.uren}u</span>
            <span class="quality ${item.kwaliteit}">${item.kwaliteit}</span>
            <span class="energy ${item.energie}">${item.energie}</span>
            ${item.notities ? `<span class="note">${item.notities}</span>` : ''}
          `;
          sleepContainer.appendChild(div);
        });
      } else {
        sleepContainer.innerHTML = '<p>Geen slaapdata beschikbaar</p>';
      }
    }
    
    // Update trainings
    const trainingsContainer = document.getElementById('trainings-container');
    if (trainingsContainer) {
      const trainings = data.trainings || [];
      if (trainings.length) {
        trainingsContainer.innerHTML = '';
        trainings.forEach(training => {
          const div = document.createElement('div');
          div.className = `training-item ${training.completed ? 'completed' : ''}`;
          div.innerHTML = `
            <span class="date">${new Date(training.date).toLocaleDateString()}</span>
            <span class="name">${training.name}</span>
            <span class="duration">${training.duration}min</span>
            ${training.score ? `<span class="score">${training.score}/10</span>` : ''}
            <span class="type">${training.type}</span>
          `;
          trainingsContainer.appendChild(div);
        });
      } else {
        trainingsContainer.innerHTML = '<p>Geen trainingen beschikbaar</p>';
      }
    }
    
    // Update radar chart if it exists
    if (data.radar && window.radarChart) {
      window.radarChart.data.datasets[0].data = Object.values(data.radar);
      window.radarChart.update();
    }
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    throw new Error('Failed to fetch data');
  }
}

// Load scores data
async function loadScores() {
  try {
    const response = await fetch('/api/user/scores', {
      headers: { 'x-auth-token': getToken() }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const scores = await response.json();
    
    const container = document.getElementById('scores-container');
    if (!container) {
      console.error('Scores container not found');
      return;
    }
    
    if (!scores || !scores.length) {
      container.innerHTML = '<p>Geen scores beschikbaar</p>';
      return;
    }
    
    // Group scores by type
    const scoresByType = scores.reduce((acc, score) => {
      if (!acc[score.type]) {
        acc[score.type] = [];
      }
      acc[score.type].push(score);
      return acc;
    }, {});
    
    // Clear container
    container.innerHTML = '';
    
    // Create sections for each type
    Object.entries(scoresByType).forEach(([type, typeScores]) => {
      const section = document.createElement('div');
      section.className = 'score-section';
      
      // Sort scores by date descending
      typeScores.sort((a, b) => new Date(b.datum) - new Date(a.datum));
      
      section.innerHTML = `
        <h3>${type}</h3>
        <div class="score-list">
          ${typeScores.map(score => `
            <div class="score-item">
              <span class="date">${new Date(score.datum).toLocaleDateString()}</span>
              <span class="value">${score.waarde}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      container.appendChild(section);
    });
    
  } catch (error) {
    console.error('Error loading scores:', error);
    throw new Error('Server error');
  }
} 