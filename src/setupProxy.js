// Lu automatiquement par `react-scripts start` (pas utilisé par `npm run build`).
// Relaie /api et /storage vers Laravel : l'application et l'API passent alors par la même adresse.
// Sert au mode démo (`npm run demo`) : une seule adresse à exposer via un tunnel, sans CORS.
// En `npm start` classique, l'API est appelée directement sur http://127.0.0.1:8000 et ce relais ne sert pas.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    createProxyMiddleware(['/api', '/storage'], {
      target: process.env.DEMO_BACKEND || 'http://127.0.0.1:8000',
      changeOrigin: true,
      logLevel: 'warn',
    })
  );
};
