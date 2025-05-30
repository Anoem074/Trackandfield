const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Training = require('../models/Training');
const Health = require('../models/Health');
const Sleep = require('../models/Sleep');

const router = express.Router();

// JWT auth middleware
function auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, auth denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ msg: 'Token is not valid' });
  }
}

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Profiel ophalen
router.get('/profile', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Profiel bijwerken (gewicht, lengte)
router.put('/profile', auth, asyncHandler(async (req, res) => {
  try {
    const { gewicht, lengte } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          gewicht: gewicht ? Number(gewicht) : null,
          lengte: lengte ? Number(lengte) : null
        } 
      },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Slaapdata ophalen
router.get('/sleep', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    // Ensure slaap array exists and handle date sorting
    const slaapData = (user.slaap || [])
      .map(item => ({
        ...item.toObject(),
        datum: new Date(item.datum),
        uren: Number(item.uren) || 0
      }))
      .sort((a, b) => b.datum - a.datum);
    
    res.json(slaapData);
  } catch (err) {
    console.error('Sleep data error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Slaapdata toevoegen
router.post('/sleep', auth, asyncHandler(async (req, res) => {
  try {
    const { datum, uren, kwaliteit, energie, notities } = req.body;
    if (!datum || !uren) {
      return res.status(400).json({ msg: 'Datum en uren zijn verplicht' });
    }

    // Validate values
    if (uren < 0 || uren > 24) {
      return res.status(400).json({ msg: 'Uren moeten tussen 0 en 24 liggen' });
    }

    const validKwaliteit = ['uitstekend', 'goed', 'matig', 'slecht'];
    const validEnergie = ['hoog', 'normaal', 'laag'];

    const slaapData = {
      datum: new Date(datum),
      uren: Number(uren),
      kwaliteit: validKwaliteit.includes(kwaliteit) ? kwaliteit : 'goed',
      energie: validEnergie.includes(energie) ? energie : 'normaal',
      notities: notities || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { slaap: slaapData } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ msg: 'Gebruiker niet gevonden' });
    }

    // Return sorted sleep data
    const sortedSlaap = (user.slaap || [])
      .map(item => ({
        ...item.toObject(),
        datum: new Date(item.datum)
      }))
      .sort((a, b) => b.datum - a.datum);

    res.json(sortedSlaap);
  } catch (err) {
    console.error('Add sleep data error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validatie error', 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Gezondheid ophalen
router.get('/health', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    // Ensure gezondheid array exists and handle date sorting
    const healthData = (user.gezondheid || [])
      .map(item => ({
        ...item.toObject(),
        datum: new Date(item.datum)
      }))
      .sort((a, b) => b.datum - a.datum);
    
    res.json(healthData);
  } catch (err) {
    console.error('Health data error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Gezondheid toevoegen
router.post('/health', auth, asyncHandler(async (req, res) => {
  try {
    const { datum, status, notitie } = req.body;
    if (!datum || !status) {
      return res.status(400).json({ msg: 'Datum en status zijn verplicht' });
    }

    const validStatus = ['uitstekend', 'goed', 'matig', 'slecht'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ msg: 'Ongeldige status' });
    }

    const gezondheidData = {
      datum: new Date(datum),
      status,
      notitie: notitie || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { gezondheid: gezondheidData } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ msg: 'Gebruiker niet gevonden' });
    }

    // Return sorted health data
    const sortedGezondheid = (user.gezondheid || [])
      .map(item => ({
        ...item.toObject(),
        datum: new Date(item.datum)
      }))
      .sort((a, b) => b.datum - a.datum);

    res.json(sortedGezondheid);
  } catch (err) {
    console.error('Add health data error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validatie error', 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Scores ophalen
router.get('/scores', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ msg: 'User not found' });
  res.json(user.scores || []);
}));

// Score toevoegen
router.post('/scores', auth, asyncHandler(async (req, res) => {
  try {
    const { datum, type, waarde } = req.body;
    if (!datum || !type || waarde === undefined) {
      return res.status(400).json({ msg: 'Datum, type en waarde zijn verplicht' });
    }

    const validTypes = [
      '100m', '200m', '400m', '800m', '1500m', '5km', '10km',
      'verspringen', 'hoogspringen', 'kogelstoten', 'speerwerpen', 
      'discuswerpen', 'hinkstapsprong'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ msg: 'Ongeldig type' });
    }

    const scoreData = {
      datum: new Date(datum),
      type,
      waarde: Number(waarde)
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { scores: scoreData } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ msg: 'Gebruiker niet gevonden' });
    }

    // Return all scores
    res.json(user.scores || []);
  } catch (err) {
    console.error('Add score error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validatie error', 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Dashboard route
router.get('/dashboard', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('trainings')
      .lean();
      
    if (!user) {
      return res.status(404).json({ msg: 'Gebruiker niet gevonden' });
    }

    const now = new Date();
    const d30 = new Date(now); d30.setDate(now.getDate() - 30);
    const d7 = new Date(now); d7.setDate(now.getDate() - 7);
    const d14 = new Date(now); d14.setDate(now.getDate() - 14);

    // Ensure trainings array exists
    const trainings = (user.trainings || []).filter(t => t && t.date >= d30);

    // Calculate stats with proper validation
    const scores = trainings.filter(t => typeof t.score === 'number' && t.score >= 1 && t.score <= 10);
    const avgScore = scores.length ? 
      (scores.reduce((a,b) => a + b.score, 0) / scores.length) : null;
    
    const volume = trainings.reduce((a, t) => a + (Number(t.duration) || 0), 0);
    
    // Consistency: aantal dagen met training
    const daysWithTraining = [...new Set(trainings
      .filter(t => t.date)
      .map(t => new Date(t.date).toISOString().slice(0,10))
    )].length;
    
    // Progress: aantal trainingen deze week vs vorige week
    const week1 = trainings.filter(t => t.date >= d7);
    const week2 = trainings.filter(t => t.date < d7 && t.date >= d14);
    const progress = week1.length - week2.length;

    // Recent health data with proper date handling
    const recentHealth = (user.gezondheid || [])
      .map(item => ({
        ...item,
        datum: new Date(item.datum)
      }))
      .sort((a, b) => b.datum - a.datum)
      .slice(0, 7);

    // Recent sleep data with proper date handling
    const recentSleep = (user.slaap || [])
      .map(item => ({
        ...item,
        datum: new Date(item.datum)
      }))
      .sort((a, b) => b.datum - a.datum)
      .slice(0, 7);

    // Radar chart data with fallbacks
    const radar = {
      Consistency: Math.min(10, (daysWithTraining / 4) * 10),
      Volume: Math.min(10, (volume / 300) * 10),
      Progress: Math.max(0, Math.min(10, ((progress + 5) * 1))),
      Score: avgScore ? Math.min(10, avgScore) : 0,
      Health: recentHealth.length ? 
        { 'uitstekend': 10, 'goed': 7.5, 'matig': 5, 'slecht': 2.5 }[recentHealth[0].status] || 5 
        : 5,
      Sleep: recentSleep.length ? 
        Math.min(10, (recentSleep.reduce((a,b) => a + b.uren, 0) / recentSleep.length / 8) * 10) 
        : 5
    };

    res.json({
      avgScore: avgScore ? Number(avgScore.toFixed(2)) : null,
      gewicht: user.gewicht || null,
      lengte: user.lengte || null,
      volume: volume || 0,
      daysWithTraining: daysWithTraining || 0,
      progress: progress || 0,
      radar,
      recentHealth,
      recentSleep,
      trainings: trainings.map(t => ({
        id: t._id,
        name: t.name || 'Unnamed Training',
        date: new Date(t.date),
        duration: Number(t.duration) || 60,
        score: typeof t.score === 'number' ? t.score : null,
        completed: Boolean(t.completed),
        type: t.type || 'overig'
      }))
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ 
      msg: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}));

// @route   GET /api/user/fitness
// @desc    Get user's fitness data
// @access  Private
router.get('/fitness', auth, async (req, res) => {
  try {
    // Get user's training data for the current and previous week
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    const startOfPrevWeek = new Date(now.setDate(now.getDate() - 7));

    const trainings = await Training.find({
      user: req.user.id,
      date: { $gte: startOfPrevWeek, $lte: endOfWeek }
    }).sort({ date: 1 });

    // Calculate fitness scores
    const currentWeekTrainings = trainings.filter(t => t.date >= startOfWeek);
    const prevWeekTrainings = trainings.filter(t => t.date < startOfWeek);

    const currentScores = calculateFitnessScores(currentWeekTrainings);
    const prevScores = calculateFitnessScores(prevWeekTrainings);

    // Calculate trends
    const strengthTrend = calculateTrend(currentScores.strength, prevScores.strength);
    const enduranceTrend = calculateTrend(currentScores.endurance, prevScores.endurance);
    const balanceTrend = calculateTrend(currentScores.balance, prevScores.balance);

    res.json({
      strength: currentScores.strength,
      endurance: currentScores.endurance,
      balance: currentScores.balance,
      strengthTrend,
      enduranceTrend,
      balanceTrend,
      previousScores: prevScores
    });
  } catch (err) {
    console.error('Error in /fitness route:', err);
    res.status(500).send('Server error');
  }
});

// Helper function to calculate fitness scores
function calculateFitnessScores(trainings) {
  if (!trainings.length) {
    return { strength: 0, endurance: 0, balance: 0 };
  }

  let totalStrength = 0;
  let totalEndurance = 0;
  let totalBalance = 0;
  let count = 0;

  trainings.forEach(training => {
    // Calculate scores based on training type and duration
    const baseScore = Math.min(10, training.duration / 30); // Score up to 10, based on duration
    
    switch (training.type.toLowerCase()) {
      case 'kracht':
        totalStrength += baseScore * 1.5;
        totalBalance += baseScore * 0.3;
        break;
      case 'sprint':
        totalEndurance += baseScore * 1.2;
        totalStrength += baseScore * 0.8;
        break;
      case 'looptechniek':
        totalBalance += baseScore * 1.2;
        totalEndurance += baseScore * 0.8;
        break;
      case 'hordentraining':
        totalBalance += baseScore * 1.3;
        totalStrength += baseScore * 0.4;
        totalEndurance += baseScore * 0.4;
        break;
      case 'interval':
        totalEndurance += baseScore * 1.5;
        totalStrength += baseScore * 0.3;
        break;
      case 'duurloop':
        totalEndurance += baseScore * 1.3;
        totalBalance += baseScore * 0.3;
        break;
      case 'herstel':
        totalBalance += baseScore * 0.8;
        totalEndurance += baseScore * 0.4;
        totalStrength += baseScore * 0.4;
        break;
      default:
        // General training contributes equally to all aspects
        totalStrength += baseScore * 0.4;
        totalEndurance += baseScore * 0.4;
        totalBalance += baseScore * 0.4;
    }
    count++;
  });

  // Normalize scores to 0-10 range
  return {
    strength: Math.min(10, totalStrength / count),
    endurance: Math.min(10, totalEndurance / count),
    balance: Math.min(10, totalBalance / count)
  };
}

// Helper function to calculate trend percentage
function calculateTrend(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({ 
    msg: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

module.exports = router; 