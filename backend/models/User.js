const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  points: { 
    type: Number, 
    default: 0,
    min: 0
  },
  recovery: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  gewicht: { 
    type: Number, 
    default: null,
    min: 20,
    max: 300
  },
  lengte: { 
    type: Number, 
    default: null,
    min: 100,
    max: 250
  },
  slaap: {
    type: [{
      datum: { 
        type: Date, 
        required: true,
        validate: {
          validator: function(v) {
            return v <= new Date();
          },
          message: 'Datum kan niet in de toekomst liggen'
        }
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
        default: 'goed'
      },
      energie: { 
        type: String, 
        enum: ['hoog', 'normaal', 'laag'],
        default: 'normaal'
      },
      notities: { 
        type: String,
        trim: true,
        maxlength: 500
      }
    }],
    default: []
  },
  gezondheid: {
    type: [{
      datum: { 
        type: Date, 
        required: true,
        validate: {
          validator: function(v) {
            return v <= new Date();
          },
          message: 'Datum kan niet in de toekomst liggen'
        }
      },
      status: { 
        type: String, 
        required: true, 
        enum: ['uitstekend', 'goed', 'matig', 'slecht'],
        default: 'goed'
      },
      notitie: { 
        type: String,
        trim: true,
        maxlength: 500
      }
    }],
    default: []
  },
  scores: {
    type: [{
      datum: { 
        type: Date, 
        required: true,
        validate: {
          validator: function(v) {
            return v <= new Date();
          },
          message: 'Datum kan niet in de toekomst liggen'
        }
      },
      type: { 
        type: String, 
        required: true,
        enum: [
          '100m', '200m', '400m', '800m', '1500m', '5km', '10km',
          'verspringen', 'hoogspringen', 'kogelstoten', 'speerwerpen', 
          'discuswerpen', 'hinkstapsprong'
        ]
      },
      waarde: { 
        type: Number, 
        required: true,
        min: 0,
        max: 100000 // High enough for all events
      }
    }],
    default: []
  },
  trainings: {
    type: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Training' 
    }],
    default: []
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'],
    default: 'user' 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Add index for faster queries
UserSchema.index({ username: 1, email: 1 });

module.exports = mongoose.model('User', UserSchema); 