const app = require('./app-setup');
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Innov8 server running on port ${PORT}`);
  console.log(`📱 Access the app at: http://localhost:${PORT}`);
  console.log(`🌐 External access: http://0.0.0.0:${PORT}`);
});
