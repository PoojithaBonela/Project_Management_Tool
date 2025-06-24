require('dotenv').config({ path: '.env.demo' });
const express = require('express');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./Project-Management-Tool/config/db');
// const User = require('./Project-Management-Tool/models/userModel'); // Remove or comment out this line
const projectRoutes = require('./Project-Management-Tool/routes/project');
const authRoutes = require('./Project-Management-Tool/routes/auth');
const taskRoutes = require('./Project-Management-Tool/routes/task'); // Import task routes
const app = express();
const { Project, User, ProjectMember } = require('./Project-Management-Tool/models');
const { Readable } = require('stream'); // Add this line to import Readable

// Test DB connection
sequelize.authenticate()
  .then(() => console.log('✅ MySQL connected.'))
  .catch((err) => console.error('❌ DB connection error:', err));
// Session store
const sessionStore = new SequelizeStore({ db: sequelize });
// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'lax',
  },
}));
// Passport config
require('./Project-Management-Tool/config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
// Static frontend
// 🔒 Protect access to projectmanager.html
app.get('/projectmanager.html', (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/index.html');
});
// Routes
app.use('/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes); // Use task routes
// ⛔ root route logic: check if logged in
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/projectmanager.html');
  }
  res.redirect('/index.html');
});
app.use(express.static(path.join(__dirname, 'Project-Management-Tool', 'public')));

// Serve the uploads directory as static
app.use('/uploads', express.static(path.join(__dirname, 'Project-Management-Tool', 'uploads')));

// Register models and their associations
require('./Project-Management-Tool/models/projectModel');
require('./Project-Management-Tool/models/taskModel');
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.imageUrl; // This is correct as per taskmanager.js
    if (!imageUrl) {
        return res.status(400).send('Image URL is required.');
    }

    try {
        // Basic validation to ensure it's a Google image URL if desired
        if (!imageUrl.startsWith('https://lh3.googleusercontent.com/')) {
            return res.status(403).send('Only Google image URLs are allowed.');
        }

        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Set appropriate headers for the image
        res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for a year
        Readable.fromWeb(response.body).pipe(res); // Corrected line: Convert ReadableStream to Node.js stream

    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).send('Error fetching image.');
    }
});
// Sync database and run
const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true })
  .then(() => sessionStore.sync())
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error('❌ Sequelize sync failed:', err));
