const sqlite3 = require('sqlite3').verbose();
const bcrypt =require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const util = require('util');
const fs = require('fs');

async function seedDemoData() {
  const dbPath = './innov8.db';

  // Delete old DB file to ensure a fresh start
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Deleted old database file to ensure a clean seed.');
  }

  // Open the database
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Could not connect to database', err.message);
      process.exit(1);
    }
  });

  // Promisify db methods for cleaner async/await
  db.run = util.promisify(db.run);
  db.close = util.promisify(db.close);

  console.log('🌱 Seeding demo data for Innov8...');
  
  try {
    console.log('Creating database schema...');
    
    // Table creation logic
    await db.run(`CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, avatar_url TEXT, bio TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE ideas (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, status TEXT DEFAULT 'draft', tags TEXT, is_public BOOLEAN DEFAULT 1, likes_count INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, ratings_count INTEGER DEFAULT 0, average_rating REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    await db.run(`CREATE TABLE comments (
      id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    await db.run(`CREATE TABLE ai_validations (
      id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, market_analysis TEXT, competitor_analysis TEXT, technical_feasibility TEXT, recommendations TEXT, desirability_score INTEGER, validity_score INTEGER, feasibility_score INTEGER, overall_score INTEGER, sources TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE
    )`);

    await db.run(`CREATE TABLE ratings (
      id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, user_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(user_id, idea_id)
    )`);

    await db.run(`CREATE TABLE likes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, idea_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE, UNIQUE(user_id, idea_id)
    )`);

    console.log('✅ Schema created. Seeding data...');

    // Create demo users
    const demoUsers = [
      { id: uuidv4(), email: 'demo@innov8.com', name: 'Demo User', password: 'demo123' },
      { id: uuidv4(), email: 'alice@innov8.com', name: 'Alice Johnson', password: 'demo123' },
      { id: uuidv4(), email: 'bob@innov8.com', name: 'Bob Smith', password: 'demo123' }
    ];
    
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [user.id, user.email, user.name, hashedPassword]);
    }
    
    // Demo ideas
    const demoIdeas = [
      { id: uuidv4(), user_id: demoUsers[0].id, title: 'AI-Powered Code Review Assistant', description: 'An intelligent code review tool that automatically detects bugs, suggests improvements, and ensures coding standards. Like having a senior developer review every commit.', category: 'ai-ml', tags: 'ai,code-review,development,automation', status: 'validated' },
      { id: uuidv4(), user_id: demoUsers[1].id, title: 'Smart Home Energy Optimizer', description: 'IoT device that learns your energy usage patterns and automatically optimizes appliances to reduce electricity bills by 30-40%.', category: 'hardware', tags: 'iot,energy,smart-home,sustainability', status: 'feedback' },
      { id: uuidv4(), user_id: demoUsers[2].id, title: 'Virtual Reality Meeting Rooms', description: 'Immersive VR platform for remote meetings with spatial audio, gesture recognition, and collaborative 3D workspaces.', category: 'web-app', tags: 'vr,remote-work,collaboration,meetings', status: 'draft' },
      { id: uuidv4(), user_id: demoUsers[0].id, title: 'Micro-Learning Mobile App', description: 'Bite-sized learning platform that delivers personalized 5-minute lessons based on your career goals and learning style.', category: 'mobile-app', tags: 'education,mobile,personalization,career', status: 'prototype' },
      { id: uuidv4(), user_id: demoUsers[1].id, title: 'Blockchain-Based Digital Identity', description: 'Secure, decentralized identity management system that gives users complete control over their personal data.', category: 'service', tags: 'blockchain,identity,privacy,security', status: 'validated' },
      { id: uuidv4(), user_id: demoUsers[2].id, title: 'AI Nutrition Coach', description: 'Personal nutrition assistant that analyzes your meals through photos and provides real-time dietary recommendations.', category: 'mobile-app', tags: 'ai,health,nutrition,mobile,computer-vision', status: 'feedback' }
    ];
    
    for (const idea of demoIdeas) {
      await db.run('INSERT INTO ideas (id, user_id, title, description, category, tags, status, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [idea.id, idea.user_id, idea.title, idea.description, idea.category, idea.tags, idea.status, 1]);
    }
    
    // Add some demo comments
    const demoComments = [
      { id: uuidv4(), idea_id: demoIdeas[0].id, user_id: demoUsers[1].id, content: 'This is brilliant! I\'ve been looking for something like this. Have you considered integrating with popular IDEs?' },
      { id: uuidv4(), idea_id: demoIdeas[0].id, user_id: demoUsers[2].id, content: 'Great concept! The market timing seems perfect with the rise of AI tools.' },
      { id: uuidv4(), idea_id: demoIdeas[1].id, user_id: demoUsers[0].id, content: 'Love the sustainability angle. What\'s the estimated ROI for consumers?' },
      { id: uuidv4(), idea_id: demoIdeas[5].id, user_id: demoUsers[0].id, content: 'This could be a game-changer for health-conscious people. Privacy concerns with photo analysis?' }
    ];
    
    for (const comment of demoComments) {
      await db.run('INSERT INTO comments (id, idea_id, user_id, content) VALUES (?, ?, ?, ?)', [comment.id, comment.idea_id, comment.user_id, comment.content]);
    }
    
    // Add some demo ratings
    const demoRatings = [
      { idea_id: demoIdeas[0].id, user_id: demoUsers[1].id, rating: 5 },
      { idea_id: demoIdeas[0].id, user_id: demoUsers[2].id, rating: 4 },
      { idea_id: demoIdeas[1].id, user_id: demoUsers[0].id, rating: 5 },
      { idea_id: demoIdeas[5].id, user_id: demoUsers[0].id, rating: 4 },
      { idea_id: demoIdeas[5].id, user_id: demoUsers[1].id, rating: 5 },
    ];

    for (const rating of demoRatings) {
      await db.run('INSERT INTO ratings (id, idea_id, user_id, rating) VALUES (?, ?, ?, ?)', [uuidv4(), rating.idea_id, rating.user_id, rating.rating]);
    }

    // Add some AI validations
    const aiValidations = [
      { id: uuidv4(), idea_id: demoIdeas[0].id, market_analysis: 'The AI-powered code review market is rapidly growing, with a projected market size of $2.8B by 2025. Key players like GitHub Copilot and CodeClimate are gaining significant traction, indicating strong market demand for tools that improve developer productivity and code quality.', competitor_analysis: JSON.stringify(['SonarQube - Static code analysis platform', 'CodeClimate - Automated code review', 'DeepCode - AI-powered code review (acquired by Snyk)']), technical_feasibility: 'The core technology is feasible using current LLMs and code analysis libraries. Key challenges include deep IDE integration for real-time feedback and efficiently handling large, complex codebases without performance degradation.', recommendations: JSON.stringify(['Focus on seamless IDE integration (VS Code, JetBrains) to differentiate from web-based tools.', 'Develop a strong differentiator against GitHub Copilot, such as team-wide coding standard enforcement.', 'Build a community around best practices and shareable rule sets.']), desirability_score: 90, validity_score: 88, feasibility_score: 85, overall_score: 88, sources: JSON.stringify([{ type: 'web_search', source: 'Statista Market Research 2024', url: 'https://www.statista.com/market-insights/' }]) },
      { id: uuidv4(), idea_id: demoIdeas[4].id, market_analysis: 'The digital identity market is valued at over $25B, driven by increasing concerns about data privacy and security. Blockchain-based solutions are gaining enterprise adoption for their promise of decentralization and user control.', competitor_analysis: JSON.stringify(['Civic - Blockchain identity verification', 'SelfKey - Self-sovereign identity platform', 'Microsoft ION - Decentralized identity network']), technical_feasibility: 'Requires significant expertise in blockchain technology, cryptography, and regulatory compliance (e.g., GDPR, CCPA). Building a trust network and achieving interoperability are major technical hurdles.', recommendations: JSON.stringify(['Target a specific niche, such as secure document signing or Web3 authentication, before tackling general identity.', 'Consider partnering with established players or building on an existing identity network like Microsoft ION.', 'Prioritize user experience to abstract away the complexity of blockchain for mainstream adoption.']), desirability_score: 82, validity_score: 85, feasibility_score: 78, overall_score: 82, sources: JSON.stringify([{ type: 'web_search', source: 'Grand View Research Industry Report', url: 'https://www.grandviewresearch.com/' }]) }
    ];
    
    for (const validation of aiValidations) {
      await db.run('INSERT INTO ai_validations (id, idea_id, market_analysis, competitor_analysis, technical_feasibility, recommendations, desirability_score, validity_score, feasibility_score, overall_score, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [validation.id, validation.idea_id, validation.market_analysis, validation.competitor_analysis, validation.technical_feasibility, validation.recommendations, validation.desirability_score, validation.validity_score, validation.feasibility_score, validation.overall_score, validation.sources]);
    }

    // Final step: Update all ideas with their calculated counts and ratings
    console.log('📊 Calculating and updating idea statistics...');
    const ideasToUpdate = await util.promisify(db.all).bind(db)('SELECT id FROM ideas');
    for (const idea of ideasToUpdate) {
      const ratingStats = await util.promisify(db.get).bind(db)(
        'SELECT COUNT(id) as ratings_count, AVG(rating) as average_rating FROM ratings WHERE idea_id = ?',
        [idea.id]
      );
      const commentStats = await util.promisify(db.get).bind(db)('SELECT COUNT(id) as comments_count FROM comments WHERE idea_id = ?', [idea.id]);
      const likeStats = await util.promisify(db.get).bind(db)('SELECT COUNT(id) as likes_count FROM likes WHERE idea_id = ?', [idea.id]);

      await db.run(
        'UPDATE ideas SET ratings_count = ?, average_rating = ?, comments_count = ?, likes_count = ? WHERE id = ?', 
        [ratingStats.ratings_count || 0, ratingStats.average_rating || 0, commentStats.comments_count || 0, likeStats.likes_count || 0, idea.id]
      );
    }

    console.log('✅ Demo data seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('   Email: demo@innov8.com | Password: demo123');
    console.log('   Email: alice@innov8.com | Password: demo123');
    console.log('   Email: bob@innov8.com | Password: demo123');
    console.log('\n🚀 Start the server with: node server.js');
    console.log('🌐 Access the app at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    if (db) {
      await db.close();
      console.log('Database connection closed.');
    }
  }
}

seedDemoData();
