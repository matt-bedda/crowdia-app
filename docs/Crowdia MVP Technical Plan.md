# Crowdia MVP Technical Plan

## 1. Technology Stack

### 1.1 Frontend (Mobile App)
- **Framework:** React Native (Expo SDK 52+)
  - Cross-platform support (iOS, Android, Web)
  - Expo Router for file-based navigation
  - TypeScript for type safety
- **UI/Components:**
  - React Native Paper or NativeWind (Tailwind for RN)
  - Expo Image for optimized image handling
  - React Native Gesture Handler for interactions
- **Maps:**
  - `react-native-maps` for map views
  - Expo Location for geolocation and geofencing
- **State Management:**
  - React Query (TanStack Query) for server state
  - Zustand or React Context for client state
- **Forms:**
  - React Hook Form with Zod validation
- **Image Handling:**
  - Expo ImagePicker for profile/event images
  - Expo Image Manipulator for resizing/compression

### 1.2 Backend (Supabase)
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (Email/Password only)
- **Storage:** Supabase Storage for images (profiles, event covers)
- **Real-time:** Supabase Realtime for live updates (interested counts, check-ins)
- **Edge Functions:** Supabase Edge Functions for complex business logic
- **Row Level Security (RLS):** Enforced on all tables

### 1.3 Admin Panel
- **Framework:** Next.js 14+ (App Router)
- **UI:** Shadcn/ui + Tailwind CSS
- **Auth:** Supabase Auth (separate admin role)
- **Deployment:** Vercel

### 1.4 Phase 0 Landing Page
- **Platform:** Carrd (no-code landing page)
- **Form:** Tally (smart form for segmentation)
- **Integration:** Tally webhooks → Supabase (for waiting list)

---

## 2. Database Schema

### 2.1 Core Tables

#### `users` (Profiles)
```sql
id                UUID PRIMARY KEY (from auth.users)
username          VARCHAR(30) UNIQUE NOT NULL
display_name      VARCHAR(100) NOT NULL
profile_image_url TEXT
bio               TEXT
points            INTEGER DEFAULT 0
check_ins_count   INTEGER DEFAULT 0
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

#### `organizers`
```sql
id                UUID PRIMARY KEY (references users.id)
organization_name VARCHAR(200) NOT NULL
logo_url          TEXT
address           TEXT
is_verified       BOOLEAN DEFAULT FALSE
verified_at       TIMESTAMP
verified_by       UUID (references users.id)
created_at        TIMESTAMP DEFAULT NOW()
```

#### `events`
```sql
id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organizer_id         UUID NOT NULL (references organizers.id)
title                VARCHAR(200) NOT NULL
description          TEXT NOT NULL
cover_image_url      TEXT NOT NULL
category_id          UUID (references categories.id)
location_name        VARCHAR(300) NOT NULL
location_lat         DECIMAL(10, 8) NOT NULL
location_lng         DECIMAL(11, 8) NOT NULL
location_address     TEXT NOT NULL
event_start_time     TIMESTAMP NOT NULL
event_end_time       TIMESTAMP NOT NULL
external_ticket_url  TEXT
is_featured          BOOLEAN DEFAULT FALSE
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP DEFAULT NOW()
```

#### `categories`
```sql
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name        VARCHAR(50) NOT NULL UNIQUE
slug        VARCHAR(50) NOT NULL UNIQUE
icon        VARCHAR(50)
sort_order  INTEGER DEFAULT 0
created_at  TIMESTAMP DEFAULT NOW()
```

#### `event_interests`
```sql
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id    UUID NOT NULL (references users.id)
event_id   UUID NOT NULL (references events.id)
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, event_id)
```

#### `event_check_ins`
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id           UUID NOT NULL (references users.id)
event_id          UUID NOT NULL (references events.id)
check_in_location POINT NOT NULL (PostGIS)
created_at        TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, event_id)
```

#### `badges`
```sql
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name        VARCHAR(50) NOT NULL UNIQUE
description TEXT
icon_url    TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

#### `user_badges`
```sql
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id     UUID NOT NULL (references users.id)
badge_id    UUID NOT NULL (references badges.id)
awarded_by  UUID (references users.id)
awarded_at  TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, badge_id)
```

#### `waiting_list` (Phase 0)
```sql
id           UUID PRIMARY KEY DEFAULT uuid_generate_v4()
email        VARCHAR(255) NOT NULL UNIQUE
user_type    VARCHAR(20) NOT NULL (social_explorer | event_creator | ambassador)
instagram    VARCHAR(100)
created_at   TIMESTAMP DEFAULT NOW()
invited_at   TIMESTAMP
```

### 2.2 Views & Computed Fields

#### `events_with_stats` (Materialized View)
- Includes `interested_count`, `check_ins_count`
- Refreshed on insert/update to interest/check-in tables

---

## 3. API Architecture

### 3.1 Supabase Client Configuration
- **Public anon key** for client-side operations
- **Service role key** (server-only) for admin operations
- Row Level Security (RLS) policies for all tables

### 3.2 Key API Patterns

#### Authentication
- `supabase.auth.signUp({ email, password })`
- `supabase.auth.signInWithPassword({ email, password })`
- Session management via Supabase Auth

#### Event Feed (Consumer)
```typescript
// Filter: Today, Tomorrow, Weekend, Category
const { data } = await supabase
  .from('events_with_stats')
  .select('*, organizer:organizers(*), category:categories(*)')
  .gte('event_start_time', startDate)
  .lte('event_start_time', endDate)
  .order('is_featured', { ascending: false })
  .order('event_start_time', { ascending: true })
```

#### Check-in Validation (Edge Function)
```typescript
// POST /functions/v1/check-in
// Validates:
// 1. User is within 150m of event location
// 2. Event is currently ongoing
// 3. User hasn't already checked in
// Awards +100 points on success
```

#### Gamification (Edge Function)
```typescript
// POST /functions/v1/award-points
// Centralized point system:
// - Check-in: +100
// - Share: +50
// - Interested: +10
```

### 3.3 Real-time Subscriptions
```typescript
// Subscribe to event interest count updates
supabase
  .channel(`event:${eventId}`)
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'event_interests' },
    (payload) => { /* update UI */ }
  )
  .subscribe()
```

---

## 4. Authentication & Authorization

### 4.1 User Roles (via JWT claims)
- `consumer` (default)
- `organizer` (toggle during signup)
- `admin` (manually assigned)

### 4.2 Row Level Security Policies

#### Events
- **SELECT:** Public (all verified organizer events)
- **INSERT:** Authenticated organizers only
- **UPDATE:** Own events only (or admin)
- **DELETE:** Admin only

#### Organizers
- **SELECT:** Public
- **INSERT:** Authenticated users (creates unverified organizer)
- **UPDATE:** Own profile only (or admin)

#### Check-ins / Interests
- **SELECT:** Own records + event stats
- **INSERT:** Authenticated users only
- **DELETE:** Own records only

---

## 5. Feature Implementation Details

### 5.1 Geolocation & Check-ins

#### Location Permissions
```typescript
// Request foreground location permission
const { status } = await Location.requestForegroundPermissionsAsync()
```

#### Check-in Validation
1. Get user's current location via `Location.getCurrentPositionAsync()`
2. Calculate distance to event using Haversine formula or PostGIS
3. Verify distance ≤ 150m
4. Verify current time is between `event_start_time` and `event_end_time`
5. Insert into `event_check_ins`, increment `users.check_ins_count` and `users.points`

#### Geofencing (Optional Enhancement)
- Use `Location.startGeofencingAsync()` for background check-in notifications

### 5.2 Map View
```typescript
<MapView
  initialRegion={{
    latitude: 38.1157,  // Palermo coordinates
    longitude: 13.3615,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }}
>
  {events.map(event => (
    <Marker
      key={event.id}
      coordinate={{
        latitude: event.location_lat,
        longitude: event.location_lng,
      }}
      onPress={() => openEventMiniCard(event)}
    />
  ))}
</MapView>
```

### 5.3 External Ticketing (WebView)
```typescript
// Open externalTicketURL in in-app browser
import { WebBrowser } from 'expo-web-browser'

const handleBuyTickets = async () => {
  await WebBrowser.openBrowserAsync(event.external_ticket_url)
}
```

### 5.4 Native Share
```typescript
import { Share } from 'react-native'

const handleShare = async () => {
  await Share.share({
    message: `Check out ${event.title} on Crowdia!`,
    url: `crowdia://events/${event.id}`,  // Deep link
  })
  // Award +50 points via API
}
```

### 5.5 Event Filters
- **Today:** `event_start_time` between today 00:00 - 23:59
- **Tomorrow:** Next day 00:00 - 23:59
- **Weekend:** Next Saturday 00:00 - Sunday 23:59
- **Category:** Filter by `category_id`

---

## 6. Admin Panel Specifications

### 6.1 Tech Stack
- Next.js 14 (App Router)
- Supabase Admin SDK (service role key)
- Shadcn/ui components
- React Table (TanStack Table) for data grids

### 6.2 Required Pages

#### `/admin/organizers`
- Table with columns: Name, Email, Created, Status
- Filter: `is_verified: false` (pending queue)
- Actions: Approve (set `is_verified: true`), Reject (delete or flag)

#### `/admin/events`
- Table with all events
- Inline edit: Title, Featured status
- Actions: Edit, Delete, Feature/Unfeature

#### `/admin/users`
- Table with all users
- Actions: View profile, Ban (soft delete or flag)

#### `/admin/categories`
- CRUD interface for categories
- Drag-to-reorder for `sort_order`

#### `/admin/badges`
- List of all badges
- Award badge: Select user → Select badge → Assign

### 6.3 Authentication
- Admin-only route protection via middleware
- Check JWT claim: `role === 'admin'`

---

## 7. Mobile App Navigation Structure

### 7.1 Navigation Stack (Expo Router)
```
app/
├── (auth)/
│   ├── login.tsx
│   ├── signup.tsx
│   └── onboarding.tsx
├── (tabs)/
│   ├── index.tsx              # Feed (Home)
│   ├── map.tsx                # Map View
│   ├── profile.tsx            # User Profile
│   └── [organizer]/           # Organizer-only tabs
│       ├── dashboard.tsx
│       └── create-event.tsx
├── events/
│   └── [id].tsx               # Event Detail Page
├── organizers/
│   └── [id].tsx               # Organizer Profile Page
└── leaderboard.tsx            # Points Leaderboard (post-MVP)
```

### 7.2 Tab Bar (Consumer View)
- Home (Feed)
- Map
- Profile

### 7.3 Tab Bar (Organizer View)
- Home (Feed)
- My Events (Dashboard)
- Create Event
- Profile

---

## 8. Deployment & DevOps

### 8.1 Mobile App
- **iOS:** TestFlight (internal testing) → App Store
- **Android:** Google Play Console (internal track) → Production
- **EAS (Expo Application Services):**
  - `eas build --platform ios` (cloud builds)
  - `eas submit` (automated store submission)
  - OTA updates via `expo-updates` for JS-only changes

### 8.2 Admin Panel
- **Hosting:** Vercel
- **CI/CD:** GitHub Actions → Vercel auto-deploy
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 8.3 Supabase
- **Hosting:** Supabase Cloud (managed instance)
- **Region:** EU West (closest to Palermo)
- **Backups:** Automatic daily backups (included in plan)

---

## 9. Environment Configuration

### 9.1 Mobile App `.env`
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
EXPO_PUBLIC_APP_ENV=production
```

### 9.2 Admin Panel `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJyyy...  # Server-only!
```

---

## 10. Key Dependencies

### 10.1 Mobile App (`package.json`)
```json
{
  "dependencies": {
    "expo": "^52.0.0",
    "expo-router": "^4.0.0",
    "react-native": "^0.76.0",
    "react-native-maps": "^1.18.0",
    "expo-location": "^18.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@tanstack/react-query": "^5.59.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "expo-image-picker": "^15.0.0",
    "expo-image-manipulator": "^12.0.0",
    "expo-web-browser": "^13.0.0",
    "date-fns": "^4.1.0"
  }
}
```

### 10.2 Admin Panel (`package.json`)
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@tanstack/react-table": "^8.20.0",
    "shadcn/ui": "latest",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 11. Development Phases

### Phase 0 (Week 1)
- [ ] Set up Supabase project
- [ ] Create database schema with RLS policies
- [ ] Set up Carrd landing page + Tally form
- [ ] Configure Tally webhook → Supabase (waiting list)

### Phase 1A (Weeks 2-3): Consumer Core
- [ ] Expo project setup with TypeScript
- [ ] Authentication (signup/login)
- [ ] User profile CRUD
- [ ] Event feed with filters
- [ ] Map view with pins
- [ ] Event detail page

### Phase 1B (Weeks 4-5): Gamification & Geolocation
- [ ] Check-in system (geofencing + validation)
- [ ] Points system (Edge Functions)
- [ ] Native share integration
- [ ] Interest/Going functionality

### Phase 1C (Week 6): Organizer Features
- [ ] Organizer registration flow
- [ ] Event creation form (with image upload)
- [ ] Organizer dashboard (My Events)
- [ ] Organizer profile page

### Phase 1D (Week 7): Admin Panel
- [ ] Next.js admin setup
- [ ] Organizer verification queue
- [ ] Event management (edit/feature/delete)
- [ ] User management (ban)
- [ ] Category CRUD
- [ ] Badge assignment

### Phase 1E (Week 8): Testing & Launch
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] App store submission (iOS + Android)
- [ ] Onboard 10-20 founding organizers

---

## 12. Critical Technical Decisions

### 12.1 Why Expo?
- Faster development (no native code)
- OTA updates for rapid iteration
- Built-in modules (Camera, Location, etc.)
- EAS Build for cloud-based compilation

### 12.2 Why Supabase?
- PostgreSQL + Auth + Storage + Real-time in one service
- RLS for security at database level
- No need to build custom REST API
- Edge Functions for serverless logic
- Cost-effective for MVP (<$25/mo)

### 12.3 Why Next.js for Admin?
- Fast to build with React
- Server-side rendering for SEO (if public-facing later)
- Vercel deployment (free tier)
- TypeScript + Supabase SDK reuse

---

## 13. Performance Considerations

### 13.1 Image Optimization
- Compress images to <500KB before upload (via `expo-image-manipulator`)
- Use Supabase CDN for fast delivery
- Lazy load images in feed with `expo-image`

### 13.2 Database Indexes
```sql
CREATE INDEX idx_events_start_time ON events(event_start_time);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_featured ON events(is_featured);
CREATE INDEX idx_event_interests_event ON event_interests(event_id);
CREATE INDEX idx_event_checkins_event ON event_check_ins(event_id);
```

### 13.3 Caching Strategy
- React Query: Cache event feed for 5 minutes
- Supabase Realtime: Use for live counters only (not full data)

---

## 14. Security Checklist

- [x] RLS enabled on all tables
- [x] Service role key stored server-side only
- [x] Email/password validation (Zod schemas)
- [x] Rate limiting on check-ins (1 per event per user)
- [x] Image upload restrictions (file type, size)
- [x] Admin panel behind authentication
- [x] HTTPS enforced (Supabase + Expo)
- [x] No hardcoded secrets in codebase

---

## 15. Analytics & Monitoring

### 15.1 User Analytics
- Expo Analytics (built-in)
- Track key events:
  - `user_signup`
  - `event_view`
  - `event_interested`
  - `event_check_in`
  - `event_share`

### 15.2 Error Monitoring
- Sentry (React Native + Next.js)
- Track crashes and API errors

### 15.3 Database Monitoring
- Supabase Dashboard (query performance)
- Set up alerts for high query times (>500ms)

---

## 16. Post-MVP Enhancements (Not in Scope)

- Push notifications (event reminders)
- Leaderboard public page
- Advanced filters (price range, distance radius)
- Event recommendations (AI/ML)
- In-app chat
- Native ticketing
- Multi-city support