require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const username = 'admin'; // Pas aan naar wens
  const email = 'admin@trainingapp.local';
  const password = 'test1234'; // Pas aan naar wens
  const hashed = await bcrypt.hash(password, 10);
  let user = await User.findOne({ username });
  if (!user) {
    user = new User({ username, email, password: hashed, role: 'admin' });
    await user.save();
    console.log('Seed user aangemaakt:', username, password);
  } else {
    console.log('Seed user bestaat al:', username);
  }
  mongoose.disconnect();
};

seed(); 