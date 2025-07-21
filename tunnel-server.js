const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'innov8-secret-key';

// Enhanced middleware for dev tunnels
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for dev tunnels
app.set('trust proxy', true);

// Add headers for dev tunnels compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database('./innov8.db');

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Innov8 API (Dev Tunnels)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    tunnel: 'Azure Dev Tunnels Compatible'
  });
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
      [userId, email, name, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const token = jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: userId, email, name }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all ideas
app.get('/api/ideas', (req, res) => {
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

  db.all(query, params, (err, ideas) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch ideas' });
    }
    res.json({ ideas, total: ideas.length });
  });
});

// Create new idea
app.post('/api/ideas', authenticateToken, (req, res) => {
  const { title, description, category, tags, isPublic = true } = req.body;
  
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  const ideaId = uuidv4();
  const tagsString = Array.isArray(tags) ? tags.join(',') : tags || '';

  db.run(
    'INSERT INTO ideas (id, user_id, title, description, category, tags, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [ideaId, req.user.userId, title, description, category, tagsString, isPublic ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create idea' });
      }

      res.status(201).json({
        message: 'Idea created successfully',
        idea: {
          id: ideaId,
          title,
          description,
          category,
          tags: tagsString.split(',').filter(t => t.trim()),
          status: 'draft',
          author_name: req.user.name
        }
      });
    }
  );
});

// Get single idea with details
app.get('/api/ideas/:id', (req, res) => {
  const ideaId = req.params.id;
  
  db.get(`
    SELECT i.*, u.name as author_name, u.avatar_url as author_avatar
    FROM ideas i
    JOIN users u ON i.user_id = u.id
    WHERE i.id = ? AND i.is_public = 1
  `, [ideaId], (err, idea) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch idea' });
    }
    
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    // Get comments for this idea
    db.all(`
      SELECT c.*, u.name as author_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.idea_id = ?
      ORDER BY c.created_at DESC
    `, [ideaId], (err, comments) => {
      if (err) {
        comments = [];
      }
      
      // Get AI validation if exists
      db.get(`
        SELECT * FROM ai_validations
        WHERE idea_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [ideaId], (err, validation) => {
        if (err) {
          validation = null;
        }
        
        res.json({
          idea: {
            ...idea,
            tags: idea.tags ? idea.tags.split(',').filter(t => t.trim()) : []
          },
          comments: comments || [],
          validation: validation
        });
      });
    });
  });
});

// AI Validation endpoint
app.post('/api/ideas/:id/validate', authenticateToken, async (req, res) => {
  const ideaId = req.params.id;
  
  try {
    db.get('SELECT * FROM ideas WHERE id = ?', [ideaId], async (err, idea) => {
      if (err || !idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }
      
      const mockValidation = {
        id: uuidv4(),
        idea_id: ideaId,
        market_analysis: `Market analysis for "${idea.title}": This ${idea.category} concept shows strong potential in the current market. Similar solutions exist but with different approaches.`,
        similar_products: JSON.stringify([
          `Product A - Similar ${idea.category} solution with 10K+ users`,
          `Product B - Competing platform in ${idea.category} space`,
          `Product C - Adjacent solution with overlapping features`
        ]),
        feasibility_score: Math.floor(Math.random() * 40) + 60,
        recommendation: `Based on market analysis, this ${idea.category} idea has strong potential. Consider focusing on unique differentiators and target market validation.`,
        confidence_score: Math.random() * 0.3 + 0.7,
        created_at: new Date().toISOString()
      };
      
      db.run(
        'INSERT INTO ai_validations (id, idea_id, market_analysis, similar_products, feasibility_score, recommendation, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mockValidation.id, mockValidation.idea_id, mockValidation.market_analysis, mockValidation.similar_products, mockValidation.feasibility_score, mockValidation.recommendation, mockValidation.confidence_score],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save validation' });
          }
          
          db.run('UPDATE ideas SET status = ? WHERE id = ?', ['validated', ideaId]);
          
          res.json({
            message: 'AI validation completed',
            validation: {
              ...mockValidation,
              similar_products: JSON.parse(mockValidation.similar_products)
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Innov8 Dev Tunnels Server running on port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Dev Tunnels compatible: ✅`);
  console.log(`🔧 CORS enabled for all origins`);
  console.log('');
  console.log('🧪 Demo Accounts:');
  console.log('   Email: demo@innov8.com | Password: demo123');
  console.log('   Email: alice@innov8.com | Password: demo123');
  console.log('   Email: bob@innov8.com | Password: demo123');
});

module.exports = app;
