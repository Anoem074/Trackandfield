const express = require('express');
const Training = require('../models/Training');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Auth middleware
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

// Get alle trainingen van user
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const trainings = await Training.find({ user: req.user.id })
      .sort({ date: -1 })
      .lean()
      .exec();

    if (!trainings) {
      return res.json([]);
    }

    // Add fallback values and format dates
    const formattedTrainings = trainings.map(t => ({
      ...t,
      name: t.name || 'Unnamed Training',
      description: t.description || '',
      date: new Date(t.date),
      duration: Number(t.duration) || 60,
      completed: Boolean(t.completed),
      score: typeof t.score === 'number' ? Number(t.score) : null,
      type: t.type || 'overig'
    }));

    res.json(formattedTrainings);
  } catch (err) {
    console.error('Get trainings error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Get specifieke training
router.get('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const training = await Training.findOne({ 
      _id: req.params.id,
      user: req.user.id 
    }).lean();
    
    if (!training) {
      return res.status(404).json({ msg: 'Training niet gevonden' });
    }
    
    // Add fallback values and format dates
    const formattedTraining = {
      ...training,
      name: training.name || 'Unnamed Training',
      description: training.description || '',
      date: new Date(training.date),
      duration: Number(training.duration) || 60,
      completed: Boolean(training.completed),
      score: typeof training.score === 'number' ? Number(training.score) : null,
      type: training.type || 'overig'
    };
    
    res.json(formattedTraining);
  } catch (err) {
    console.error('Get training error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid training ID' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Training aanmaken
router.post('/', auth, asyncHandler(async (req, res) => {
  try {
    const { name, description, date, repeat, type, duration } = req.body;
    
    // Validate required fields
    if (!name || !date || !duration) {
      return res.status(400).json({ 
        msg: 'Naam, datum en duur zijn verplicht' 
      });
    }

    // Validate repeat days
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (repeat && repeat.length > 0) {
      const invalidDays = repeat.filter(day => !validDays.includes(day));
      if (invalidDays.length > 0) {
        return res.status(400).json({ 
          msg: `Ongeldige dagen: ${invalidDays.join(', ')}` 
        });
      }
    }

    const training = new Training({
      name: name.trim(),
      description: description ? description.trim() : '',
      date: new Date(date),
      repeat: repeat || [],
      type: type || 'overig',
      duration: Number(duration) || 60,
      user: req.user.id
    });

    await training.save();
    
    await User.findByIdAndUpdate(
      req.user.id, 
      { $push: { trainings: training._id } }
    );

    const formattedTraining = {
      ...training.toObject(),
      date: new Date(training.date)
    };

    res.status(201).json(formattedTraining);
  } catch (err) {
    console.error('Create training error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validatie error', 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Training bijwerken
router.put('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const { name, description, date, repeat, type, duration, completed, score } = req.body;
    
    const training = await Training.findOne({ 
      _id: req.params.id,
      user: req.user.id 
    });
    
    if (!training) {
      return res.status(404).json({ msg: 'Training niet gevonden' });
    }
    
    // Update fields if provided
    if (name) training.name = name.trim();
    if (description !== undefined) training.description = description.trim();
    if (date) training.date = new Date(date);
    if (repeat) training.repeat = repeat;
    if (type) training.type = type;
    if (duration) training.duration = Number(duration);
    if (completed !== undefined) training.completed = completed;
    if (score !== undefined) training.score = Number(score);
    
    await training.save();

    const formattedTraining = {
      ...training.toObject(),
      date: new Date(training.date)
    };

    res.json(formattedTraining);
  } catch (err) {
    console.error('Update training error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validatie error', 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Training afvinken
router.patch('/:id/complete', auth, asyncHandler(async (req, res) => {
  try {
    const { score } = req.body;
    
    const training = await Training.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        completed: true,
        score: score ? Number(score) : undefined,
        $set: { 
          'updatedAt': new Date() 
        }
      },
      { new: true }
    );
    
    if (!training) {
      return res.status(404).json({ msg: 'Training niet gevonden' });
    }
    
    const formattedTraining = {
      ...training.toObject(),
      date: new Date(training.date)
    };

    res.json(formattedTraining);
  } catch (err) {
    console.error('Complete training error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Training verwijderen
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const training = await Training.findOneAndDelete({ 
      _id: req.params.id,
      user: req.user.id 
    });
    
    if (!training) {
      return res.status(404).json({ msg: 'Training niet gevonden' });
    }
    
    // Remove from user's trainings array
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { trainings: training._id } }
    );
    
    res.json({ msg: 'Training verwijderd', id: training._id });
  } catch (err) {
    console.error('Delete training error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
}));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      msg: 'Validatie error', 
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ msg: 'Invalid ID format' });
  }
  
  res.status(500).json({ 
    msg: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router; 