# MacroTracker

A full-stack macro nutrition tracker with barcode scanning, AI-powered meal planning, and daily food logging. Scan a barcode or search for food, log what you eat, and let AI generate personalized macro and meal plans based on your profile.

Built as a **pnpm monorepo** with a Next.js frontend and Fastify API, deployable as a Docker Compose stack.

## Features

- **Barcode Scanning** - Scan food with your phone camera or enter barcodes manually. Product data pulled from OpenFoodFacts.
- **Food Logging** - Log meals by type (breakfast, lunch, dinner, snack) with adjustable serving sizes. Daily macro totals update in real time.
- **Macro Rings Dashboard** - Visual progress rings for calories, protein, carbs, and fat against your daily targets.
- **AI Macro Plans** - Generate personalized calorie and macro targets using GPT-4o-mini based on your height, weight, age, sex, activity level, and goal. Or create plans manually.
- **AI Meal Plans** - Generate structured 1, 3, or 7-day meal plans with recipes, ingredients, prep times, and per-meal macro breakdowns.
- **Editable Nutrition** - Edit any food item's nutrition data with a per-serving or per-100g input toggle.
- **Imperial & Metric** - Switch between unit systems in settings; the profile page adapts automatically.
- **JWT Auth + Google OAuth** - Local email/password registration with refresh tokens, or sign in with Google.
- **User-Provided API Keys** - Users supply their own OpenAI API key, encrypted at rest with AES-256-GCM.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, TanStack Query v5 |
| Backend | Fastify 5, Prisma 6, PostgreSQL 17, Redis 7 |
| AI | OpenAI SDK (GPT-4o-mini for macros, GPT-4o for meal plans) |
| Barcode | html5-qrcode (camera PWA), OpenFoodFacts API v2 |
| Auth | JWT access/refresh tokens, Google OAuth via @fastify/oauth2 |
| Monorepo | pnpm workspaces, Turborepo |
| Deploy | Docker Compose, GitHub Actions for Docker Hub publishing |

## Project Structure

```
MacroTracker/
├── packages/
│   ├── shared/          # @macrotracker/shared - Zod schemas, types, constants
│   ├── api/             # @macrotracker/api   - Fastify backend (port 4000)
│   │   ├── prisma/      #   Prisma schema & migrations
│   │   └── src/
│   │       ├── plugins/ #   Auth, Prisma, Redis plugins
│   │       ├── routes/  #   auth, users, food, food-log, macro-plan, meal-plan
│   │       └── services/#   Business logic layer
│   └── web/             # @macrotracker/web   - Next.js frontend (port 3000)
│       └── src/
│           ├── app/     #   (auth) and (dashboard) route groups
│           ├── components/  # UI, scanner, food, log, plan components
│           ├── lib/     #   API client, auth helpers, utils
│           └── providers/   # AuthProvider, QueryProvider
├── docker-compose.yml
├── docker-compose.dev.yml
└── turbo.json
```

## Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

### 1. Clone and install

```bash
git clone https://github.com/stevegee006/MacroTrackr.git
cd MacroTrackr
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set real values for secrets:

```env
# Required - generate random strings for these
JWT_SECRET=<random-string-at-least-32-chars>
JWT_REFRESH_SECRET=<another-random-string>
ENCRYPTION_KEY=<64-hex-char-string-for-aes-256>

# Database (defaults work with Docker Compose)
DATABASE_URL=postgresql://macrotracker:changeme@localhost:5432/macrotracker

# Redis
REDIS_URL=redis://localhost:6379

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Optional - Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Start with Docker Compose

**Production:**

```bash
docker compose up --build
```

**Development (with hot reload):**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The API runs on `http://localhost:4000` and the web app on `http://localhost:3000`.

### 4. Or run locally without Docker

Start PostgreSQL and Redis separately, then:

```bash
pnpm db:migrate    # Run Prisma migrations
pnpm db:seed       # Seed sample food data (optional)
pnpm dev           # Start all services via Turborepo
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in dev mode (Turborepo) |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:seed` | Seed sample food items |
| `pnpm db:studio` | Open Prisma Studio GUI |

## API Endpoints

All authenticated endpoints require a `Bearer` token in the `Authorization` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register with email/password |
| POST | `/api/v1/auth/login` | Login, returns access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Current user |
| GET/PUT | `/api/v1/users/me/profile` | User profile (height, weight, age, etc.) |
| GET/PUT | `/api/v1/users/me/settings` | Settings (API key, units, dark mode) |

### Food
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/food/barcode/:barcode` | Lookup by barcode (checks DB, then OpenFoodFacts) |
| GET | `/api/v1/food/search?q=` | Search food items by name |
| GET | `/api/v1/food/:id` | Get food item by ID |
| POST | `/api/v1/food` | Create manual food item |
| PATCH | `/api/v1/food/:id` | Update food item nutrition |

### Food Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/food-log?date=YYYY-MM-DD` | Entries for a date |
| GET | `/api/v1/food-log/summary?date=` | Daily totals + targets |
| GET | `/api/v1/food-log/range?from=&to=` | Multi-day range |
| POST | `/api/v1/food-log` | Log a food entry |
| PATCH | `/api/v1/food-log/:id` | Update entry |
| DELETE | `/api/v1/food-log/:id` | Delete entry |

### Macro Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/macro-plan/generate` | AI-generate a plan from profile |
| POST | `/api/v1/macro-plan` | Create a manual plan |
| GET | `/api/v1/macro-plan` | List all plans |
| POST | `/api/v1/macro-plan/:id/activate` | Set as active plan |
| DELETE | `/api/v1/macro-plan/:id` | Delete plan |

### Meal Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/meal-plan/generate` | AI-generate meal plan |
| GET | `/api/v1/meal-plan` | List all plans |
| DELETE | `/api/v1/meal-plan/:id` | Delete plan |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Checks DB + Redis connectivity |

## Database Schema

Seven models managed by Prisma:

- **User** - Auth credentials, display name, OAuth provider
- **UserProfile** - Height, weight, age, sex, activity level, goal, macro targets
- **UserSettings** - Encrypted OpenAI API key, preferred units, dark mode
- **FoodItem** - Nutrition per 100g, barcode, source (OpenFoodFacts or manual)
- **FoodLog** - Daily entries with pre-computed totals, grouped by meal type
- **MacroPlan** - AI or manual calorie/macro targets with activation support
- **MealPlan** - Structured JSON with daily meals, ingredients, macros, and instructions

## Docker Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | postgres:17-alpine | 5432 | PostgreSQL with health check |
| `redis` | redis:7-alpine | 6379 | Redis for tokens + cache |
| `api` | Custom multi-stage | 4000 | Fastify API, runs migrations on startup |
| `web` | Custom multi-stage | 3000 | Next.js standalone build |

## CI/CD

GitHub Actions automatically builds and pushes Docker images to Docker Hub on pushes to `main` and version tags:

- `geaves006/macrotrackr-api:latest`
- `geaves006/macrotrackr-web:latest`

## License

MIT
