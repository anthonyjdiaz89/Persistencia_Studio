<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Persistencia Studio - AI Video Generation Platform

Professional video generation studio powered by VideoGenAPI with multi-model support, Supabase database, and intelligent rate limiting.

🔗 **GitHub Repository:** https://github.com/anthonyjdiaz89/Persistencia_Studio

> **🔥 Latest Update (2026-07-08):** Fixed production deployment issue - Frontend now correctly connects to backend in Coolify monorepo architecture. See [GUIA_PRODUCCION_RAPIDA.md](GUIA_PRODUCCION_RAPIDA.md) for details.

---

## ✨ Features

- 🎬 **15 AI Video Models**: Sora-2, Kling-3, Veo3, Gemini-Omni, Seedance-2.5, and more
- 🗄️ **Supabase Database**: Cloud storage for characters, props, locations, and reference frames
- ⚡ **Multi-Key Load Balancing**: Distribute requests across multiple API keys (2-10 keys)
- 🚀 **Intelligent Rate Limiting**: Automatic request queuing and exponential backoff
- 🎨 **Material Library**: Create and manage reusable assets with @mentions
- 🤖 **AI Director**: Generate complete scene blueprints with temporal continuity
- 🌍 **Colombia Timezone**: All timestamps displayed in America/Bogota (UTC-5)
- 🔒 **Self-Hosted Ready**: Full support for Coolify/Docker deployments
- 📦 **Monorepo Architecture**: Single deployment includes frontend + backend (no CORS issues)
- 🔄 **Auto-Deploy**: Works with Coolify auto-deploy on every push

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- VideoGenAPI Key from https://videogenapi.com
- Supabase Project (cloud or self-hosted)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file:

```bash
# VideoGenAPI Keys (at least one required)
VIDEOGEN_API_KEY=lannetech_your_key_here

# Multi-Key System (optional - for load balancing)
VIDEOGEN_API_KEY_1=lannetech_key_1
VIDEOGEN_API_KEY_2=lannetech_key_2
# ... up to VIDEOGEN_API_KEY_10

# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Gemini API (optional - only for AI Director)
GEMINI_API_KEY=your_gemini_key
```

### 3. Set Up Supabase Database

1. Copy the contents of `supabase_schema.sql`
2. Go to your Supabase project → SQL Editor
3. Paste and execute the SQL script
4. Verify tables: `characters`, `props`, `locations`, `reference_frames`

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions.

### 4. Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🌐 Production Deployment

### ⚠️ Critical: Environment Variables Required

The application **requires** environment variables in production. Without them:
- ❌ "Generar Shot" button will be disabled
- ❌ Materials (characters/props/locations) won't work
- ❌ API requests will fail

### Quick Deployment Check

```bash
# Local verification
node verify-production.js

# Production verification
node verify-production.js https://your-domain.com
```

### Platform-Specific Configuration

#### Vercel ⚡
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy with environment variables
vercel --prod

# Or configure via dashboard:
# Settings → Environment Variables → Add all .env variables
```

#### Netlify 🌊
```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

# Configure via dashboard:
# Site settings → Environment variables
```

#### Railway 🚂
```bash
# Automatically detects environment variables
# Configure via: Variables tab → Add all .env variables
```

#### Coolify 🧊 (Self-Hosted - Recommended for Monorepo)

**✅ Perfect for:** Auto-deploy on every GitHub push, self-hosted infrastructure

```bash
# 1. Create Application in Coolify
#    - Type: Docker Compose or Dockerfile
#    - Source: Connect your GitHub repository
#    - Branch: main

# 2. Build Configuration
Build Command: npm run build
Start Command: npm start
Port: 3000

# 3. Environment Variables (⚠️ CRITICAL - Add in Coolify Dashboard)
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_key (optional)

# ⚠️ DO NOT ADD VITE_API_URL (monorepo uses relative paths)

# 4. Auto-Deploy Settings
Enable: "Automatic deployment on push"
Webhook: Coolify generates this automatically

# 5. Verify Deployment
curl https://your-coolify-domain.com/api/config
# Should return: {"status": "ok", "hasApiKey": true, "totalKeys": 2}
```

**Troubleshooting Coolify:**
- ❌ "Cannot GET /api/config" → Backend not started, check build logs
- ❌ "hasApiKey: false" → Environment variables not configured
- ✅ "hasApiKey: true" → Everything working correctly

### Required Environment Variables

✅ **Must have:**
- `VIDEOGEN_API_KEY` or `VIDEOGEN_API_KEY_1`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

⚠️ **Optional but recommended:**
- `VIDEOGEN_API_KEY_2` through `_10` (for load balancing)
- `GEMINI_API_KEY` (for AI Director feature)

📖 **Full deployment guide:** [PRODUCCION_ENV.md](PRODUCCION_ENV.md)

---

## 🔧 Troubleshooting

### Problem: "Generar Shot" button is disabled

**Cause:** Missing `VIDEOGEN_API_KEY` in production environment

**Solution:**
1. Add `VIDEOGEN_API_KEY` to your hosting platform's environment variables
2. Redeploy the application
3. Verify with: `curl https://your-domain.com/api/config`
   - Should return: `{"hasApiKey": true}`

### Problem: "Error de base de datos" message

**Cause:** Missing Supabase configuration

**Solution:**
1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to environment variables
2. Verify Supabase tables are created (run `supabase_schema.sql`)
3. Test connection: `curl https://your-domain.com/api/supabase-config`

### Problem: Rate limits reached quickly

**Solution:** Enable multi-key system
```bash
# Add multiple keys to multiply capacity
VIDEOGEN_API_KEY_1=key_1  # 5 req/10min
VIDEOGEN_API_KEY_2=key_2  # 5 req/10min
# Total: 10 req/10min with 2 keys
```

See [MULTI_KEY_SETUP.md](MULTI_KEY_SETUP.md) for details.

---

## 📚 Documentation

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Database migration guide
- [PRODUCCION_ENV.md](PRODUCCION_ENV.md) - Production deployment guide
- [MULTI_KEY_SETUP.md](MULTI_KEY_SETUP.md) - Multi-key load balancing
- [verify-production.js](verify-production.js) - Production verification script

---

## 🎯 Architecture

```
Frontend (React + TypeScript + Vite)
    ↓
Backend Proxy (Express.js + Node.js)
    ↓
┌─────────────────┬─────────────────────┐
│  VideoGenAPI    │     Supabase        │
│  (15 models)    │   (PostgreSQL)      │
│  Rate Limiting  │   User Materials    │
│  Multi-Key LB   │   RLS Policies      │
└─────────────────┴─────────────────────┘
```

---

## 🔑 API Endpoints

- `GET /api/config` - Server configuration status
- `GET /api/supabase-config` - Supabase credentials
- `GET /api/keys/status` - Multi-key system status
- `POST /api/seedance/generations` - Create video generation
- `GET /api/seedance/tasks/:id` - Check generation status

---

## 📊 Supported Models

| Model | Max Duration | Resolution | Credits/sec |
|-------|-------------|------------|-------------|
| sora-2 | 60s | 1080p | 10 |
| kling-3 | 10s | 1080p | 7.5 |
| veo3 | 8s | 720p | 10 |
| veo-31 | 8s | 1080p | 10 |
| gemini-omni | 7s | 1080p | 8 |
| seedance-25 | 30s | 1080p | 6 |
| seedance-2 | 10s | 1080p | 4 |
| higgsfield_v1 | 5s | 720p | 6 |
| grok-imagine-1-5 | 6s | 720p | 4 |
| ltxv-2 | 5s | 768p | 2 |
| ltxv-13b | 60s | 768p | 1 |
| nanobanana-video | 5s | 720p | 1 |
| seedance-2-mini | 10s | 720p | 2 |
| wan-25 | 5s | 720p | 2 |
| veo2 | 8s | 1080p | 5 |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

Apache 2.0 - See LICENSE file for details

---

## 🆘 Support

- 📖 Check [PRODUCCION_ENV.md](PRODUCCION_ENV.md) for deployment issues
- 🔍 Run `node verify-production.js` to diagnose problems
- 🐛 Open an issue on GitHub for bugs
- 💬 Contact: anthonyjdiaz89@github.com

---

**Version:** 2.0 (Commit: 42f6e84)  
**Last Updated:** 2026-07-06
