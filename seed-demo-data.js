const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, dbRun, serialize } = require('./db');

async function seedDemoData() {
  console.log('🌱 Seeding demo data for Innov8...');
  
  try {
    // Create demo users
    const demoUsers = [
      {
        id: uuidv4(),
        email: 'demo@innov8.com',
        name: 'Demo User',
        password: 'demo123'
      },
      {
        id: uuidv4(),
        email: 'alice@innov8.com',
        name: 'Alice Johnson',
        password: 'demo123'
      },
      {
        id: uuidv4(),
        email: 'bob@innov8.com',
        name: 'Bob Smith',
        password: 'demo123'
      }
    ];
    
    // Insert demo users
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await dbRun(
        'INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
        [user.id, user.email, user.name, hashedPassword]
      );
    }
    
    // Demo ideas
    const demoIdeas = [
      {
        id: uuidv4(),
        user_id: demoUsers[0].id,
        title: 'AI-Powered Code Review Assistant',
        description: 'An intelligent code review tool that automatically detects bugs, suggests improvements, and ensures coding standards. Like having a senior developer review every commit.',
        category: 'ai-ml',
        tags: 'ai,code-review,development,automation',
        status: 'validated',
        likes_count: 15,
        comments_count: 8
      },
      {
        id: uuidv4(),
        user_id: demoUsers[1].id,
        title: 'Smart Home Energy Optimizer',
        description: 'IoT device that learns your energy usage patterns and automatically optimizes appliances to reduce electricity bills by 30-40%.',
        category: 'hardware',
        tags: 'iot,energy,smart-home,sustainability',
        status: 'feedback',
        likes_count: 23,
        comments_count: 12
      },
      {
        id: uuidv4(),
        user_id: demoUsers[2].id,
        title: 'Virtual Reality Meeting Rooms',
        description: 'Immersive VR platform for remote meetings with spatial audio, gesture recognition, and collaborative 3D workspaces.',
        category: 'web-app',
        tags: 'vr,remote-work,collaboration,meetings',
        status: 'draft',
        likes_count: 7,
        comments_count: 3
      },
      {
        id: uuidv4(),
        user_id: demoUsers[0].id,
        title: 'Micro-Learning Mobile App',
        description: 'Bite-sized learning platform that delivers personalized 5-minute lessons based on your career goals and learning style.',
        category: 'mobile-app',
        tags: 'education,mobile,personalization,career',
        status: 'prototype',
        likes_count: 31,
        comments_count: 18
      },
      {
        id: uuidv4(),
        user_id: demoUsers[1].id,
        title: 'Blockchain-Based Digital Identity',
        description: 'Secure, decentralized identity management system that gives users complete control over their personal data.',
        category: 'service',
        tags: 'blockchain,identity,privacy,security',
        status: 'validated',
        likes_count: 19,
        comments_count: 14
      },
      {
        id: uuidv4(),
        user_id: demoUsers[2].id,
        title: 'AI Nutrition Coach',
        description: 'Personal nutrition assistant that analyzes your meals through photos and provides real-time dietary recommendations.',
        category: 'mobile-app',
        tags: 'ai,health,nutrition,mobile,computer-vision',
        status: 'feedback',
        likes_count: 42,
        comments_count: 25
      }
    ];
    
    // Insert demo ideas
    for (const idea of demoIdeas) {
      await dbRun(
        'INSERT OR IGNORE INTO ideas (id, user_id, title, description, category, tags, status, likes_count, comments_count, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [idea.id, idea.user_id, idea.title, idea.description, idea.category, idea.tags, idea.status, idea.likes_count, idea.comments_count, 1]
      );
    }
    
    // Add some demo comments
    const demoComments = [
      {
        id: uuidv4(),
        idea_id: demoIdeas[0].id,
        user_id: demoUsers[1].id,
        content: 'This is brilliant! I\'ve been looking for something like this. Have you considered integrating with popular IDEs?',
        rating: 5
      },
      {
        id: uuidv4(),
        idea_id: demoIdeas[0].id,
        user_id: demoUsers[2].id,
        content: 'Great concept! The market timing seems perfect with the rise of AI tools.',
        rating: 4
      },
      {
        id: uuidv4(),
        idea_id: demoIdeas[1].id,
        user_id: demoUsers[0].id,
        content: 'Love the sustainability angle. What\'s the estimated ROI for consumers?',
        rating: 5
      },
      {
        id: uuidv4(),
        idea_id: demoIdeas[5].id,
        user_id: demoUsers[0].id,
        content: 'This could be a game-changer for health-conscious people. Privacy concerns with photo analysis?',
        rating: 4
      }
    ];
    
    for (const comment of demoComments) {
      await dbRun(
        'INSERT OR IGNORE INTO comments (id, idea_id, user_id, content, rating) VALUES (?, ?, ?, ?, ?)',
        [comment.id, comment.idea_id, comment.user_id, comment.content, comment.rating]
      );
    }
    
    // Add some AI validations
    const aiValidations = [
      {
        id: uuidv4(),
        idea_id: demoIdeas[0].id,
        market_analysis: 'The AI-powered code review market is rapidly growing with tools like GitHub Copilot and CodeClimate gaining traction. Market size estimated at $2.8B by 2025.',
        similar_products: JSON.stringify([
          'SonarQube - Static code analysis platform',
          'CodeClimate - Automated code review',
          'DeepCode - AI-powered code review (acquired by Snyk)'
        ]),
        feasibility_score: 85,
        recommendation: 'Strong market opportunity. Focus on IDE integration and real-time feedback to differentiate from existing solutions.',
        confidence_score: 0.87
      },
      {
        id: uuidv4(),
        idea_id: demoIdeas[4].id,
        market_analysis: 'Digital identity market is valued at $25B+ with growing concerns about data privacy. Blockchain solutions gaining enterprise adoption.',
        similar_products: JSON.stringify([
          'Civic - Blockchain identity verification',
          'SelfKey - Self-sovereign identity platform',
          'Microsoft ION - Decentralized identity network'
        ]),
        feasibility_score: 78,
        recommendation: 'Promising concept but requires significant technical expertise and regulatory compliance. Consider partnerships with established players.',
        confidence_score: 0.82
      }
    ];
    
    for (const validation of aiValidations) {
      await dbRun(
        'INSERT OR IGNORE INTO ai_validations (id, idea_id, market_analysis, similar_products, feasibility_score, recommendation, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [validation.id, validation.idea_id, validation.market_analysis, validation.similar_products, validation.feasibility_score, validation.recommendation, validation.confidence_score]
      );
    }
    
    console.log('✅ Demo data seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('Email: demo@innov8.com | Password: demo123');
    console.log('Email: alice@innov8.com | Password: demo123');
    console.log('Email: bob@innov8.com | Password: demo123');
    console.log('\n🚀 Start the server with: npm start');
    console.log('🌐 Access the app at: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    db.close();
  }
}

seedDemoData();
