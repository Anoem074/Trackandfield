const mongoose = require('mongoose');

const HealthSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['uitstekend', 'goed', 'matig', 'slecht'],
    required: true
  },
  notitie: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Health', HealthSchema); 