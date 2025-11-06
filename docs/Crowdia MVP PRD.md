### **Product Requirements Document (PRD)**

Product: Crowdia (MVP \- Phase 1\)

Target City: Palermo

Primary Objective: To validate the core product loop (acquisition, activation, retention) and the network effect.

Key Success Metrics:

* **Acquisition (Supply):** 10/20 "Founding Partner" Organizers onboarded.  
* **Acquisition (Demand):** 1,000 active users (from "Phase 0" Waiting List).  
* **Activation:** Check-in Rate (Target: \>15% of active users).  
* **Retention (D7):** % of users who reopen the app after 7 days (Target: \>20%).

---

### **Phase 0: Pre-Launch Requirements (GTM \- Go-to-Market)**

Before the app is live on the stores, the development team must support marketing by creating a **Landing Page** (near-zero cost, e.g., Carrd \+ Tally) with two essential features to solve the "Chicken & Egg" problem on a zero budget.

**1\. Funnel Concierge (Smart Form):**

* **What it is:** A multi-step form (simulating a chat) instead of a simple email field.  
* **Logic:** It must segment visitors:  
  * **"Who are you?"**  
    * **Option A: "I'm looking for events" (Social Explorer)** \-\> Collects email for the **Waiting List**.  
    * **Option B: "I organize events" (Event Creator)** \-\> Collects contacts for "White Glove" onboarding, promising free visibility.  
    * **Option C: "I'm a PR/Ambassador"** \-\> Collects contacts (@IG) for the exclusive "Founder Club".

**2\. Active Social Proof (Founders Wall):**

* **What it is:** A section on the landing page showing the logos and/or photos of the first organizers and ambassadors who have joined.  
* **Logic:** Serves as a marketing lever to create FOMO (Fear Of Missing Out) and borrow credibility from the local scene.

---

### **Phase 1: MVP Specs (The App)**

Definition of user actors and their corresponding features.

#### **1\. Actor: CONSUMER ("Social Explorer")**

**1.1 Onboarding & Profile**

* **Registration:** Email/Password only. (No social login).  
* **Minimum Profile:** `username`, `displayName`, `profileImage`, `bio` (optional).  
* **Public Profile (Stats):**  
  * `points` (numeric counter).  
  * `checkIns` (numeric counter).  
* **Badges:** A field to assign badges (e.g., "Early Adopter") from the Admin panel.

**1.2 Core Discovery (Event Feed)**

* **Feed:** Vertical feed of "Event Cards" sorted by `eventStartTime` and `isFeatured`.  
* **Filters (Basic):** "Today", "Tomorrow", "Weekend", "Category".  
* **"Event Card" (UI):** Must show Image, Title, Date, Organizer Name (clickable), "Interested" counter.

**1.3 Map (Separate Tab)**

* **View:** Standard map (e.g., Mapbox) with pins.  
* **Logic:** One pin for each event. Tapping the pin opens a mini-card.  
* **Exclusion:** No Heatmap.

**1.4 Event Detail Page**

* **Info:** Full description, map (with "Get Directions" button \-\> opens G-Maps/Apple Maps), "Interested" list.  
* **Primary CTA (Interaction):** "Interested / Going" button.  
* **Secondary CTA (Ticketing):** "Buy Tickets" button.  
  * *Logic:* Opens the `externalTicketURL` (see Sec 2.2) in an in-app WebView.  
* **Tertiary CTA (Gamification):** "Check-in" button.  
  * *Logic:* The button is active only if the user is within a 150m (TBD) radius of the event `location` and the event is ongoing.

**1.5 Gamification (Points Only)**

* **System:** A simple `points` counter in the user profile.  
* **Rules (Backend):**  
  * `+100` points for Check-in.  
  * `+50` points for sharing (native OS share).  
  * `+10` points for "Interested".  
* **Leaderboard:** A separate view showing the Top 50 users in Palermo by points. (maybe wait until after MVP)

#### **2\. Actor: ORGANIZER ("Event Creator")**

**2.1 Onboarding & Verification**

* **Registration:** Standard flow \+ "I am an Organizer" toggle.  
* **Verification (Critical):** New Organizer accounts are `isVerified: false` by default. They cannot publish events until an Admin manually approves them (see Sec 3.1).  
* **Organizer Profile:** Basic info (logo, name, bio, address) and event gallery ("Upcoming" / "Past").

**2.2 Event Creation (The Form)**

* **Required Fields:** `title`, `description`, `coverImage`, `category` (from predefined list), `location` (via Google Places API), `eventStartTime`, `eventEndTime`.  
* **Ticketing Field (Optional):** `externalTicketURL` (string field for URL).  
  * *UI Note:* Add helper text: "Paste your Eventbrite, Dice, etc. link here."

**2.3 Dashboard (Minimal)**

* A "My Events" view showing published events.  
* For each event, show two metrics: Total "Interested" and Total "Check-ins".

#### **3\. Actor: ADMIN (Backend Control Panel)**

This is our control center. It is a secure web interface, not a public app.

**3.1 Platform Management**

* **Organizer Verification Queue:** A list of accounts with `isVerified: false`. Admin must have an "Approve" / "Reject" button.  
* **Event Management:**  
  * Ability to edit/delete any event.  
  * Ability to set `isFeatured: true` (to pin an event to the top of the feed).  
* **User Management:** Ability to ban a user or an organizer.  
* **Category Management:** CRUD (Create, Read, Update, Delete) for event categories.  
* **Badge Management:** Ability to assign badges (e.G., "Ambassador") to specific users.

---

### **EXPLICIT EXCLUSIONS (What NOT to Build)**

This section is critical for the development team. Anything on this list is forbidden for the MVP to prevent scope creep.

1. **NO CRYPTO/TOKEN INTEGRATION:** The Points system is an `integer` in the database. Nothing else.  
2. **NO NATIVE TICKETING:** No Stripe, PayPal, or payment gateway APIs. We only use `externalTicketURL`.  
3. **NO SOCIAL LOGIN (GOOGLE, APPLE, ETC.):** Registration is Email/Password only.  
4. **NO INTERNAL CHAT / SOCIAL FEED:** No user-to-user messaging, no "posts," no "stories."  
5. **NO AI / CONCIERGE:** No chatbots in the app, no complex recommendations.  
6. **NO HEATMAPS:** The map shows pins only.  
7. **NO INFLUENCER/AMBASSADOR DASHBOARDS:** They are managed manually from the Admin panel.  
8. **NO FAKE PROFILES / SCRAPING:** We will not build scraping systems or simulated profiles. Content will be generated by Organizers (or manually uploaded by us with their permission \- "White Glove").

