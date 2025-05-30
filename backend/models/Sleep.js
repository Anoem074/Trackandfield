const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  datum: {
    type: Date,
    required: true
  },
  uren: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  kwaliteit: {
    type: String,
    enum: ['uitstekend', 'goed', 'matig', 'slecht'],
    required: true
  },
  energie: {
    type: String,
    enum: ['hoog', 'normaal', 'laag'],
    required: true
  },
  notities: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Sleep', SleepSchema); 