const app = require('./app-setup');
const PORT = process.env.PORT || 8080;

// Trust proxy for dev tunnels
app.set('trust proxy', true);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Innov8 Dev Tunnels Server running on port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Dev Tunnels compatible: ✅`);
  console.log('');
  console.log('🧪 Demo Accounts:');
  console.log('   Email: demo@innov8.com | Password: demo123');
  console.log('   Email: alice@innov8.com | Password: demo123');
  console.log('   Email: bob@innov8.com | Password: demo123');
});
