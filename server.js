const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self';");
  next();
});

const staticPages = [
  '', 'sdk', 'docs', 'pricing', 'partners', 'operators',
  'enterprise', 'research', 'terms', 'about', 'security', 'privacy',
  'commercial', 'commercial/pilot'
];

for (const route of staticPages) {
  const indexPath = path.join(__dirname, route, 'index.html');
  if (fs.existsSync(indexPath)) {
    app.get(`/${route}`, (req, res) => {
      res.sendFile(indexPath);
    });
  }
}

app.use(express.static(path.join(__dirname), {
  index: false,
  dotfiles: 'deny',
}));

// Dynamic API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    node: process.version,
  });
});

app.get('/api/site-map', (req, res) => {
  const routes = staticPages.map(r => ({
    route: `/${r}`,
    title: r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Home',
  }));
  res.json({ routes });
});

// SPA-style fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Conxian-Labs dynamic server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
