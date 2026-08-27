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

app.get('/api/services', (req, res) => {
  res.json({
    platform: 'Conxian Business-as-a-Platform (BaaP)',
    domains: {
      governance: 'conxian.com',
      operator: 'conxian-labs.com'
    },
    services: [
      {
        id: 'bos',
        name: 'Business Operating System (BOS)',
        description: 'Sovereign Autonomous Business execution engine, state orchestration, and enterprise workflow governance.',
        status: 'active',
        route: '/enterprise'
      },
      {
        id: 'nexus',
        name: 'Conxian Nexus Risk Oracle',
        description: 'Decentralized risk oracle, real-time verification, compliance monitoring, and cross-chain state proofs.',
        status: 'active',
        route: '/research'
      },
      {
        id: 'gateway',
        name: 'Gateway (Fusion & Sentinel)',
        description: 'High-throughput API middleware, unified JWT/Enclave authentication (Fusion), and secret filtering (Sentinel).',
        status: 'active',
        route: '/docs'
      },
      {
        id: 'market',
        name: 'Conxian Market Settlement Engine',
        description: 'Nakamoto-ready settlement engine, sovereign asset exchange, and liquidity pool management.',
        status: 'active',
        route: '/commercial'
      },
      {
        id: 'sdk',
        name: 'Conxius Enclave SDK',
        description: 'Cross-platform enclave key management and hardware attestation interface (MuSig2, Schnorr, Taproot, BitVM, TEE).',
        status: 'active',
        route: '/sdk'
      },
      {
        id: 'corelibs',
        name: 'Corelibs Cryptographic Library',
        description: 'Shared cryptographic primitives, security specifications, and core protocol libraries (lib-conxian-core).',
        status: 'active',
        route: '/docs'
      }
    ]
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
