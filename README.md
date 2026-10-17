# Hospital Human Resources Management System (HRMS) with Work Process Tracking

A modern, enterprise-grade Hospital HRMS & Clinical Work Process Tracking platform built with a distributed Node.js microservices backend, MySQL 8.0 databases, and a centralized API Gateway with interactive Swagger UI documentation.

---

## 🚀 Quick Links
- **Interactive Swagger Documentation**: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
- **OpenAPI 3.0.0 Specification**: [http://localhost:4000/api-docs.json](http://localhost:4000/api-docs.json)
- **Gateway Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
- **Complete Startup & User Guide**: [memory-bank/user-guide-starting-the-system.md](./memory-bank/user-guide-starting-the-system.md)

---

## 🏛️ Microservices Topology

| Service | Port | Database | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Portal & API Gateway** | `4000` | `hrm_portal_db` | Reverse proxying, JWT authentication, RBAC, Swagger documentation, notifications |
| **Core HR & Identity** | `4001` | `hrm_core_hr_db` | Employees, medical licenses, emergency contacts, credentials & documents |
| **Workforce & Attendance** | `4002` | `hrm_workforce_db` | 24/7 rosters, shift scheduling, clock-in/out, leave requests & balances |
| **Payroll & Compensation** | `4003` | `hrm_payroll_db` | Base hourly rates, tax tiers, payroll runs, itemized pay slips, payment elections |

---

## 🏁 Getting Started

### 1. Start MySQL Server
Ensure MySQL 8.0 is running on port `3306` (Windows Service `MySQL80` or Docker `docker compose up -d mysql`).

### 2. Apply Database Migrations
```powershell
cd services/core-hr; npm run db:migrate
cd ../workforce-attendance; npm run db:migrate
cd ../payroll; npm run db:migrate
cd ../portal-gateway; npm run db:migrate
```

### 3. Start Backend Services
Start each service using `npm start` in its directory:
- Portal Gateway: `cd services/portal-gateway && npm start` (Port `4000`)
- Core HR: `cd services/core-hr && npm start` (Port `4001`)
- Workforce: `cd services/workforce-attendance && npm start` (Port `4002`)
- Payroll: `cd services/payroll && npm start` (Port `4003`)

### 4. Run Automated Test Suite
```powershell
cd services/core-hr; npm test
cd ../workforce-attendance; npm test
cd ../payroll; npm test
cd ../portal-gateway; npm test
```
*(All 148 unit & Supertest integration tests pass with 100% coverage)*.

---

## 📖 Full Documentation
For complete architectural context, database schemas, and step-by-step troubleshooting, consult the [Memory Bank](./memory-bank/):
- [`memory-bank/tech-context.md`](./memory-bank/tech-context.md) — Technical stack & environment variables.
- [`memory-bank/system-patterns.md`](./memory-bank/system-patterns.md) — System architecture & design patterns.
- [`memory-bank/user-guide-starting-the-system.md`](./memory-bank/user-guide-starting-the-system.md) — Detailed startup and user guide.
