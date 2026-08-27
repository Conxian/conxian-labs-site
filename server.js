const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self';");
  next();
});

const pageMetadata = [
  { route: "", title: "Home", desc: "Proof-first software stack for the Conxian ecosystem", priority: 1.0 },
  { route: "sdk", title: "SDK — Conxius Enclave SDK", desc: "Cross-platform enclave and key-management boundaries", priority: 0.9 },
  { route: "docs", title: "Docs — Documentation", desc: "Technical documentation for the Conxian ecosystem", priority: 0.8 },
  { route: "pricing", title: "Pricing & Packaging", desc: "Commercial packaging and plan matrix", priority: 0.7 },
  { route: 'commercial', title: "Commercial Brief", desc: "Executive buyer brief and ecosystem readiness", priority: 0.8 },
  { route: 'commercial/pilot', title: "Scoped Pilot Brief", desc: "Bounded pilot narrative and evaluation criteria", priority: 0.8 },
  { route: "partners", title: "Partners", desc: "Ecosystem partners and collaborative initiatives", priority: 0.6 },
  { route: "operators", title: "Operators", desc: "Node operators and infrastructure providers", priority: 0.6 },
  { route: "enterprise", title: "Enterprise", desc: "Institutional deployment discovery and governance", priority: 0.6 },
  { route: "research", title: "Research", desc: "Research surfaces and cryptographic papers", priority: 0.6 },
  { route: "about", title: "About — Conxian Labs", desc: "Builder and operator layer around Conxian", priority: 0.5 },
  { route: "security", title: "Security — Conxian Labs", desc: "Security posture and vulnerability disclosure", priority: 0.5 },
  { route: "privacy", title: "Privacy Policy", desc: "Data protection and privacy commitments", priority: 0.3 },
  { route: "terms", title: "Terms of Service", desc: "Legal terms governing infrastructure use", priority: 0.3 }
];

const staticPages = pageMetadata.map(p => p.route);

for (const p of pageMetadata) {
  const indexPath = path.join(__dirname, p.route, "index.html");
  if (fs.existsSync(indexPath)) {
    app.get(`/${p.route}`, (req, res) => {
      res.sendFile(indexPath);
    });
  }
}

app.use(express.static(path.join(__dirname), {
  index: false,
  dotfiles: "deny",
}));

// Dynamic API endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "conxian-labs-site",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: require("./package.json").version,
    node: process.version,
    infrastructure: {
      provider: "Render",
      databases: ["corelibs", "Software dev kit", "Business Operating System", "market", "Gateway", "Conxian Nexus"]
    }
  });
});

app.get("/api/services", (req, res) => {
  res.json({
    platform: "Conxian Business-as-a-Platform (BaaP)",
    status: "operational",
    domains: {
      governance: "conxian.org",
      protocol: "conxian.com",
      operator: "conxian-labs.com"
    },
    services: [
      { id: "bos", name: "Business Operating System (BOS)", type: "State Orchestration & Governance", status: "active", route: "/enterprise" },
      { id: "nexus", name: "Conxian Nexus Risk Oracle", type: "Decentralized Proof & Oracle Layer", status: "active", route: "/research" },
      { id: "gateway", name: "Gateway (Fusion & Sentinel)", type: "Middleware & Access Control", status: "active", route: "/docs" },
      { id: "market", name: "Conxian Market Settlement Engine", type: "Nakamoto-Ready Liquidity Engine", status: "active", route: "/commercial" },
      { id: "sdk", name: "Conxius Enclave SDK", type: "Cross-Platform Hardware Signing Abstraction", status: "active", route: "/sdk" },
      { id: "corelibs", name: "Corelibs Cryptographic Library", type: "Shared Protocol Cryptographic Primitives", status: "active", route: "/docs" }
    ],
    infrastructureTopology: {
      renderHost: "conxian-labs-site (srv-d9ndhr2jnfac73as7te0)",
      neonDatabases: ["corelibs", "Software dev kit", "Business Operating System", "market", "Gateway", "Conxian Nexus"],
      supabaseProjects: ["Conxian BOS (yauldfcpswnufgwfvnlr)", "Conxian-platform (iczqutrbbfudfzfplymc)"]
    }
  });
});

app.get("/api/site-map", (req, res) => {
  const routes = pageMetadata.map(p => ({
    route: `/${p.route}`,
    title: p.title,
    description: p.desc,
    priority: p.priority
  }));
  res.json({ routes, total: routes.length });
});

// SPA-style fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.listen(PORT, () => {
  console.log(`Conxian-Labs dynamic server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
