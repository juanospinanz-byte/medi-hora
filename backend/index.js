const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const medicationRoutes = require('./routes/medications');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/medications', medicationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});