# EstateBid

A full-stack estate auction management application with AI-powered item descriptions and comparable sales analysis.

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- **Supabase** project (free tier works)
- **OpenAI** API key

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/jdm9908/AuctionSwift.git
cd AuctionSwift

# Backend setup
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Frontend setup
cd front-end
npm install
cd ..
```

### 2. Configure Environment Variables

**Backend (.env in root directory):**
```bash
cp .env.example .env
```
Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
OPENAI_DESCRIPTION_KEY=your_openai_api_key
OPENAI_COMPS_KEY=your_openai_api_key
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (front-end/.env):**
```bash
cd front-end
cp .env.example .env
```
Edit `front-end/.env`:
```env
VITE_API_URL=http://localhost:8081
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLIC=your_supabase_anon_key
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8081
```

**Terminal 2 - Frontend:**
```bash
cd front-end
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Features

- **Estate Auction Management** - Create and manage multi-item estate sales
- **AI-Powered Descriptions** - GPT-4o generates professional item descriptions from photos
- **Comparable Sales** - AI agent finds similar sold items from eBay, Reverb, etc.
- **Public Auction Pages** - Share auction links with bidders
- **Real-time Bidding** - Live bid updates and countdown timers
- **Image Management** - Upload up to 5 images per item
- **Batch Processing** - 50% cost savings on multi-item AI processing

---

## Tech Stack

### Frontend
- React 19 + Vite
- TailwindCSS + shadcn/ui
- Framer Motion animations
- Supabase Auth

### Backend
- FastAPI (Python)
- Supabase PostgreSQL
- OpenAI GPT-4o + Agents SDK

---

## Project Structure

```
EstateBid/
├── .env.example             # Backend env template
├── requirements.txt         # Python dependencies
├── backend/
│   └── main.py              # FastAPI server
└── front-end/
    ├── .env.example         # Frontend env template
    ├── package.json
    └── src/
        ├── components/      # React components
        │   ├── auction/     # Public auction components
        │   └── ui/          # shadcn/ui components
        ├── context/         # Auth & Auction state
        ├── pages/           # Route pages
        ├── services/        # API & storage services
        └── lib/             # Supabase client
```

---

## Security Notes

- ✅ All secrets stored in `.env` files (git-ignored)
- ✅ CORS configured via environment variable
- ✅ Supabase RLS for database security
- ✅ Input validation on all API endpoints
- ✅ No hardcoded credentials in codebase

---

## API Endpoints

### Auctions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auctions` | Create auction |
| GET | `/auctions` | List user's auctions |
| GET | `/auctions/{id}` | Get auction details |
| PUT | `/auctions/{id}` | Update auction name |
| DELETE | `/auctions/{id}` | Delete auction |
| PUT | `/auctions/{id}/settings` | Update auction settings |
| POST | `/auctions/{id}/publish` | Publish auction |
| POST | `/auctions/{id}/close` | Close auction |
| GET | `/auctions/{id}/public` | Public auction page |
| GET | `/auctions/{id}/all-bids` | Get all bids (seller) |
| GET | `/auctions/{id}/excel` | Export to Excel |
| GET | `/auctions/public` | List public auctions |

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/items` | Create item |
| GET | `/items` | List items |
| GET | `/items/{id}` | Get item |
| PUT | `/items/{id}` | Update item |
| DELETE | `/items/{id}` | Delete item |
| PUT | `/items/{id}/auction-settings` | Update item bid settings |
| PUT | `/items/batch/auction-settings` | Batch update settings |
| POST | `/items/{id}/bid` | Place bid |
| POST | `/items/{id}/buy-now` | Buy now |
| GET | `/items/{id}/bids` | Get item bids |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/items/{id}/images` | Add images |
| PUT | `/items/{id}/images/{img_id}` | Update image URL |
| PUT | `/items/{id}/images/{img_id}/primary` | Set primary image |

### AI & Comps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/simple-generate-description` | Quick AI description |
| POST | `/items/generate-description` | Vision AI description |
| POST | `/comps` | Generate comparable sales |
| GET | `/comps/{item_id}` | Get saved comps |
| GET | `/items/{id}/comps/saved` | Get item's saved comps |
| POST | `/comps/batch` | Batch generate comps |

### Users & Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create user |
| GET | `/users/{id}` | Get user |
| PUT | `/users/{id}/email` | Update email |
| POST | `/payments` | Activate account |
| GET | `/orders/{id}` | Get order |
| GET | `/orders` | List orders |

---

## License

MIT
