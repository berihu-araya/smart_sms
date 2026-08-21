# SMART SMS (Smart School Management System)

A modern, full-stack, enterprise-ready School Management System built for scalable school operations, student lifecycle tracking, attendance, continuous assessment, examination marks, and automated report card generation.

---

## 📚 Master Architecture & Documentation

- 📖 **[Production Architecture & End-to-End Roadmap](file:///d:/Development/projects/Pers/smart_sms/docs/PRODUCTION_ARCHITECTURE_AND_ROADMAP.md)**: Master architectural blueprint, database schema, layered backend standards, frontend guidelines, Phase 1–6 roadmap, and Docker/Nginx production deployment.
- 📋 **[Smart SMS MVP Specification](file:///d:/Development/projects/Pers/smart_sms/docs/Smart%20SMS%20MVP.md)**: Full MVP module and API endpoint specification.
- 🛠️ **[MVP Development Guide](file:///d:/Development/projects/Pers/smart_sms/docs/SMART_SMS_MVP_DEVELOPMENT_GUIDE.md)**: Original development guidelines and standard coding conventions.

---

## 🚀 Quick Start (Development)

### 1. Database & Infrastructure
```bash
# Start PostgreSQL 17 & Redis 7
docker compose up -d
```

### 2. Backend (Node.js + Express)
```bash
cd backend
npm install
npm run migrate:up
npm run dev
```
Backend runs at `http://localhost:5000`.

### 3. Frontend (Next.js 16 + React 19)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 🏗️ Architecture Stack
- **Frontend**: Next.js 16 (App Router), React 19, CSS Modules, Axios / Fetch API
- **Backend**: Node.js 20, Express 5, Repository-Service-Controller Layered Pattern, JWT Auth
- **Database**: PostgreSQL 17 (`pg` Connection Pool), `node-pg-migrate`
- **Cache**: Redis 7
- **DevOps**: Docker, Multi-stage Dockerfiles, Nginx Reverse Proxy with SSL
