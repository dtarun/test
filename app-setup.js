const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan =require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const util = require('util');
const EnhancedAIValidationService = require('./enhanced-ai-validation.js');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'innov8-secret-key';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for dev tunnels
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true, // Allow all origins for dev tunnels
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database('./innov8.db');

// Promisify db methods for async/await support
db.get = util.promisify(db.get);
db.all = util.promisify(db.all);
db.run = util.promisify(db.run);

// Initialize AI Validation Service
const aiValidationService = new EnhancedAIValidationService();

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ideas table
  db.run(`CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    tags TEXT,
    is_public BOOLEAN DEFAULT 1,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // AI Validations table
  db.run(`CREATE TABLE IF NOT EXISTS ai_validations (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    market_analysis TEXT, -- High-level summary of market potential
    competitor_analysis TEXT, -- JSON array of competitors/similar products
    technical_feasibility TEXT, -- Analysis of technical challenges and requirements
    recommendations TEXT, -- JSON array of actionable recommendations
    desirability_score INTEGER, -- (1-100) How much users will want this
    validity_score INTEGER, -- (1-100) How valid/applicable the idea is for the market
    feasibility_score INTEGER, -- (1-100) How technically and financially feasible it is
    overall_score INTEGER, -- (1-100) Weighted average of the other scores
    sources TEXT, -- JSON array of sources used for validation
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE
  )`);

  // Ratings table
  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, idea_id)
  )`);

  // Likes table
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    idea_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
    UNIQUE(user_id, idea_id)
  )`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Optional authentication middleware: Attaches user if token is valid, but doesn't fail if it's not.
// This is useful for public-facing endpoints that can show more content to logged-in users.
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token, proceed as anonymous user
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user; // Token is valid, attach user to request
    }
    next(); // Proceed even if token is invalid, just without a user attached.
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Innov8 API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.run(
      'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
      [userId, email, name, hashedPassword]
    );

    const token = jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User created successfully', token, user: { id: userId, email, name } });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('User registration failed:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get all ideas (public feed)
app.get('/api/ideas', async (req, res) => {
  const { category, status, search, limit = 20, offset = 0 } = req.query;
  
  let query = `
    SELECT i.*, u.name as author_name, u.avatar_url as author_avatar
    FROM ideas i
    JOIN users u ON i.user_id = u.id
    WHERE i.is_public = 1
  `;
  const params = [];

  if (category) {
    query += ' AND i.category = ?';
    params.push(category);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (i.title LIKE ? OR i.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  try {
    const ideas = await db.all(query, params);
    res.json({ ideas: ideas || [], total: (ideas || []).length });
  } catch (error) {
    console.error('Failed to fetch ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// Create new idea
app.post('/api/ideas', authenticateToken, async (req, res) => {
  const { title, description, category, tags, isPublic = true } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  try {
    // --- Start Debugging Block ---
    console.log('[DEBUG] Attempting to create idea for user from token:', JSON.stringify(req.user));
    const userExists = await db.get('SELECT id FROM users WHERE id = ?', [req.user.userId]);
    if (!userExists) {
      console.error(`[DEBUG] CRITICAL: User with ID ${req.user.userId} from token was NOT FOUND in the database.`);
      return res.status(500).json({ error: 'Authentication session is invalid. Please log out and log in again.' });
    }
    console.log('[DEBUG] User confirmed to exist in database. Proceeding with idea creation...');
    // --- End Debugging Block ---

    const ideaId = uuidv4();
    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || '');

    await db.run(
      'INSERT INTO ideas (id, user_id, title, description, category, tags, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ideaId, req.user.userId, title, description, category, tagsString, isPublic ? 1 : 0]
    );

    // Fetch the newly created idea to return the full object, ensuring consistency
    const newIdea = await db.get(`
        SELECT i.*, u.name as author_name, u.avatar_url as author_avatar
        FROM ideas i
        JOIN users u ON i.user_id = u.id
        WHERE i.id = ?
    `, [ideaId]);

    if (!newIdea) {
      // This should not happen, but it's a good safeguard
      return res.status(500).json({ error: 'Failed to retrieve newly created idea.' });
    }

    res.status(201).json({
      message: 'Idea created successfully',
      idea: {
        ...newIdea,
        tags: newIdea.tags ? newIdea.tags.split(',').filter(t => t.trim()) : []
      }
    });
  } catch (error) {
    console.error(`Failed to create idea "${title}":`, error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// Get single idea with details
app.get('/api/ideas/:id', optionalAuthenticateToken, async (req, res) => {
  const ideaId = req.params.id;
  const userId = req.user ? req.user.userId : null;

  try {
    // Run database queries in parallel for better performance
    // The query now fetches an idea if it's public OR if the current user is the owner.
    const ideaQuery = `
      SELECT i.*, u.name as author_name, u.avatar_url as author_avatar
      FROM ideas i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ? AND (i.is_public = 1 OR i.user_id = ?)
    `;
    const ideaPromise = db.get(ideaQuery, [ideaId, userId]);

    const commentsPromise = db.all(`
      SELECT c.*, u.name as author_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.idea_id = ?
      ORDER BY c.created_at DESC
    `, [ideaId]);

    const validationPromise = db.get(`
      SELECT * FROM ai_validations
      WHERE idea_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [ideaId]);

    const [idea, comments, validation] = await Promise.all([
      ideaPromise,
      commentsPromise,
      validationPromise
    ]);

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Safely parse JSON fields from validation if it exists
    if (validation) {
      try {
        validation.competitor_analysis = JSON.parse(validation.competitor_analysis || '[]');
        validation.recommendations = JSON.parse(validation.recommendations || '[]');
        validation.sources = JSON.parse(validation.sources || '[]');
      } catch (e) {
        console.error(`Error parsing validation JSON for idea ${ideaId}:`, e);
      }
    }

    res.json({
      idea: { ...idea, tags: idea.tags ? idea.tags.split(',').filter(t => t.trim()) : [] },
      comments: comments || [],
      validation: validation || null
    });
  } catch (error) {
    console.error(`Failed to fetch details for idea ${ideaId}:`, error);
    res.status(500).json({ error: 'Failed to fetch idea details' });
  }
});

// Add comment to idea
app.post('/api/ideas/:id/comments', authenticateToken, async (req, res) => {
  const { content } = req.body;
  const ideaId = req.params.id;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  try {
    await db.run('BEGIN TRANSACTION');

    const commentId = uuidv4();

    await db.run(
      'INSERT INTO comments (id, idea_id, user_id, content) VALUES (?, ?, ?, ?)',
      [commentId, ideaId, req.user.userId, content]
    );

    await db.run(
      'UPDATE ideas SET comments_count = comments_count + 1 WHERE id = ?',
      [ideaId]
    );

    await db.run('COMMIT');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: commentId, content,
        author_name: req.user.name, created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error(`Failed to add comment to idea ${ideaId}:`, error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Rate an idea
app.post('/api/ideas/:id/rate', authenticateToken, async (req, res) => {
    const { rating } = req.body;
    const ideaId = req.params.id;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'A valid rating between 1 and 5 is required.' });
    }

    try {
        // Begin a transaction to ensure atomicity
        await db.run('BEGIN TRANSACTION');

        // Use INSERT ... ON CONFLICT to handle both new ratings and updates
        await db.run(
            'INSERT INTO ratings (id, idea_id, user_id, rating) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, idea_id) DO UPDATE SET rating = excluded.rating',
            [uuidv4(), ideaId, userId, rating]
        );

        // Recalculate the average rating and count for the idea
        const stats = await db.get( // This query runs on the uncommitted data within the transaction
            'SELECT COUNT(id) as ratings_count, AVG(rating) as average_rating FROM ratings WHERE idea_id = ?',
            [ideaId]
        );

        // Update the ideas table with the new stats
        await db.run(
            'UPDATE ideas SET ratings_count = ?, average_rating = ? WHERE id = ?',
            [stats.ratings_count || 0, stats.average_rating || 0, ideaId]
        );

        // Commit the transaction if all queries were successful
        await db.run('COMMIT');

        res.json({
            message: 'Rating submitted successfully',
            average_rating: stats.average_rating || 0,
            ratings_count: stats.ratings_count || 0
        });
    } catch (error) {
        // If any query fails, roll back all changes
        await db.run('ROLLBACK');
        console.error(`Failed to rate idea ${ideaId}:`, error);
        res.status(500).json({ error: 'Failed to submit rating.' });
    }
});

// AI Validation endpoint
app.post('/api/ideas/:id/validate', authenticateToken, async (req, res) => {
  const ideaId = req.params.id;

  try {
    // Begin a transaction to ensure both the validation and the status update succeed or fail together.
    await db.run('BEGIN TRANSACTION');

    // Get the idea details
    const idea = await db.get('SELECT * FROM ideas WHERE id = ?', [ideaId]);

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // In a real app, this would be a long-running task.
    // You might use a job queue (e.g., BullMQ) and webhooks.
    // For this example, we'll run it synchronously.
    const validationResult = await aiValidationService.validateIdea(idea);
    const validationId = uuidv4();

    // Save validation to database
    await db.run(
      'INSERT INTO ai_validations (id, idea_id, market_analysis, competitor_analysis, technical_feasibility, recommendations, desirability_score, validity_score, feasibility_score, overall_score, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        validationId,
        ideaId,
        validationResult.market_analysis,
        JSON.stringify(validationResult.competitor_analysis || []),
        validationResult.technical_feasibility,
        JSON.stringify(validationResult.recommendations || []),
        validationResult.desirability_score,
        validationResult.validity_score,
        validationResult.feasibility_score,
        validationResult.overall_score,
        JSON.stringify(validationResult.sources || [])
      ]
    );

    // Update idea status
    await db.run('UPDATE ideas SET status = ? WHERE id = ?', ['validated', ideaId]);

    // Commit the transaction
    await db.run('COMMIT');

    res.json({
      message: 'AI validation completed',
      validation: { id: validationId, idea_id: ideaId, ...validationResult }
    });

  } catch (error) {
    await db.run('ROLLBACK'); // Roll back all changes if any step fails
    console.error('Validation failed:', error);
    res.status(500).json({ error: 'Validation failed due to a server error.' });
  }
});

// Like/unlike idea
app.post('/api/ideas/:id/like', authenticateToken, async (req, res) => {
  const ideaId = req.params.id;
  const userId = req.user.userId;

  try {
    await db.run('BEGIN TRANSACTION'); // Start transaction
    const existingLike = await db.get('SELECT * FROM likes WHERE user_id = ? AND idea_id = ?', [userId, ideaId]);

    if (existingLike) {
      // Unlike
      await db.run('DELETE FROM likes WHERE user_id = ? AND idea_id = ?', [userId, ideaId]);
      await db.run('UPDATE ideas SET likes_count = likes_count - 1 WHERE id = ?', [ideaId]);
    } else {
      // Like
      const likeId = uuidv4();
      await db.run('INSERT INTO likes (id, user_id, idea_id) VALUES (?, ?, ?)', [likeId, userId, ideaId]);
      await db.run('UPDATE ideas SET likes_count = likes_count + 1 WHERE id = ?', [ideaId]);
    }
    await db.run('COMMIT'); // Commit transaction

    // Send response after commit
    res.json({ message: existingLike ? 'Idea unliked' : 'Idea liked', liked: !existingLike });
  } catch (error) {
    await db.run('ROLLBACK'); // Rollback on error
    console.error(`Failed to update like status for idea ${ideaId}:`, error);
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;