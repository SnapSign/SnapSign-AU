const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001', // Firebase Functions Emulator default port
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/snapsign-au/us-central1', // Adjust to your project and region
      },
    })
  );
};