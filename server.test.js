const request = require('supertest');
const { app, initializeDatabase } = require('./server'); // Import app and initializer
const { dbClose } = require('./db');

// This hook runs once before all tests in this file.
beforeAll(async () => {
  await initializeDatabase();
});

// This hook runs once after all tests in this file have finished.
// It's the perfect place to close the database connection.
afterAll(async () => {
  await dbClose();
});

describe('API Endpoints', () => {
  // Test the health check endpoint
  it('should return a healthy status from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  // Test the new version endpoint
  it('should return the correct version from /api/version', async () => {
    const res = await request(app).get('/api/version');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('version', '2.0.0');
  });
});