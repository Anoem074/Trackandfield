const mongoose = require('mongoose');

const TrainingSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    default: ''
  },
  date: { 
    type: Date, 
    required: true 
  },
  repeat: { 
    type: [{ 
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    default: []
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  type: { 
    type: String, 
    enum: ['kracht', 'sprint', 'looptechniek', 'hordentraining', 'interval', 'duurloop', 'herstel', 'overig'],
    default: 'kracht' 
  },
  duration: { 
    type: Number, 
    required: true,
    min: 1,
    max: 1440, // 24 hours in minutes
    default: 60 
  },
  score: { 
    type: Number, 
    min: 1, 
    max: 10,
    validate: {
      validator: Number.isInteger,
      message: 'Score must be an integer'
    }
  },
  // Nieuwe velden voor uitgebreide training feedback
  completionDetails: {
    completedAt: { type: Date },
    notes: { 
      type: String,
      trim: true,
      maxlength: 1000
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: 'Intensity must be an integer'
      }
    },
    energy: {
      type: String,
      enum: ['hoog', 'normaal', 'laag']
    },
    feeling: {
      type: String,
      enum: ['uitstekend', 'goed', 'matig', 'slecht']
    },
    metrics: {
      strength: {
        type: Number,
        min: 1,
        max: 10
      },
      endurance: {
        type: Number,
        min: 1,
        max: 10
      },
      technique: {
        type: Number,
        min: 1,
        max: 10
      }
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Training', TrainingSchema); 