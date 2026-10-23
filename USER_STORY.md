# kwōt — User Stories

## Overview

kwōt is a marketplace where people who need a service post a request once and have
multiple service providers bid on it. Today, a homeowner who needs their irrigation
system flushed has to call several companies, explain the same job each time, and
book site visits before they can even compare options. kwōt replaces that loop with
a single, well-described request that servicers compete for.

kwōt sits **before** the first phone call or site visit. Its job ends when the
customer has picked the servicer(s) they want to talk to. Contact details are
exchanged at that point, and everything after (visits, scheduling, payment) happens
outside the app.

**Core loop**

1. A customer starts a request, either by filling in a short form or by chatting with the kwōt assistant.
2. kwōt gathers the details a servicer would need (yard size, number of zones, last service date, …).
3. The finished request opens for bidding.
4. Servicers browse open requests, ask clarifying questions, and submit private bids.
5. The customer compares bids and selects one or a few servicers. kwōt shares contact details between them.

## Product principles

- **Simple and seamless:** Starting a request should feel as easy as sending a text. Ask only what's needed, one step at a time, with sensible defaults.
- **The customer's choice of input:** Both the form and the chat produce the same structured request.
- **Describe once:** Anything learned later, such as answers to servicers' questions, is added to the request so no one has to ask twice.
- **Mobile-first:** Every flow is designed for a phone screen first.

## Personas

| Persona | Description |
| --- | --- |
| **Customer** | Anyone who needs a service performed, typically a homeowner or renter. Wants to describe the job once and get comparable offers without phone tag. |
| **Servicer** | An individual or business that provides services. Wants a steady stream of well-described jobs in their trade and area, with enough detail to price accurately. |

Each account has exactly one role.

## Scope of the first version (MVP)

- Runs locally with a single `docker compose up`.
- Web only, built mobile-first (usable on a phone-sized screen without horizontal scrolling).
- A user can sign up as a customer or a servicer and complete the main flow end to end:
  post a request (form or chat) → bid on it → select servicer(s).

Stories are tagged by priority:

- **P0**: required for the MVP demo
- **P1**: should have if time allows
- **P2**: later

---

## Epic 0 — Local environment

### US-0.1 Run the whole stack locally (P0)

**As a** developer, **I want** to start the entire application with one command,
**so that** I can run and demo kwōt without manual setup.

**Acceptance criteria**

- **Given** a fresh clone with Docker installed and a `.env` file,
  **when** I run `docker compose up`,
  **then** the web app, API, and database start, and the app is reachable at `http://localhost:<port>`.
- Database migrations run automatically on startup.
- Configuration comes from environment variables, with a committed `.env.example`. This includes the API key for the language model behind the chat assistant.
- If no model API key is set, the app still runs and the chat option is hidden, so only the form is offered.
- Data persists across restarts via a named volume. `docker compose down -v` resets it.

### US-0.2 Seed demo data (P1)

**As a** developer, **I want** an optional seed command that creates sample customers,
servicers, service categories, requests, and bids, **so that** I can demo the
marketplace without creating everything by hand.

---

## Epic 1 — Accounts & onboarding

### US-1.1 Choose a role at sign-up (P0)

**As a** new visitor, **I want** to sign up as either a customer or a servicer,
**so that** I see the experience built for what I'm here to do.

**Acceptance criteria**

- The landing page has two clear calls to action: "I need a service" and "I provide services".
- Sign-up collects name, email, and password, and the selected role is stored on the account. The role can't be changed later.
- Duplicate emails are rejected with a clear message.
- Passwords are hashed and never stored or logged in plain text.
- After sign-up, the user is logged in and sent to the onboarding step for their role.

### US-1.2 Log in and out (P0)

**As a** returning user, **I want** to log in with my email and password and log out,
**so that** my requests, bids, and profile stay private to me.

**Acceptance criteria**

- Invalid credentials show a generic error that does not reveal whether the email exists.
- Pages for logged-in users redirect to the login page when there's no session.
- Logging out ends the session.

### US-1.3 Customer onboarding (P0)

**As a** customer, **I want** onboarding to ask only for my ZIP / postal code and an
optional phone number, **so that** I can get to posting my first request right away.

**Acceptance criteria**

- The ZIP is used only to match requests to servicers' areas. No street address is ever collected.
- The phone number, if given, is shared only with servicers I select (US-4.2).

### US-1.4 Servicer onboarding (P0)

**As a** servicer, **I want** to set up a profile with my business name, the service
categories I offer, my service area, and my contact details, **so that** I'm shown requests I can actually take.

**Acceptance criteria**

- I pick one or more categories from a predefined list (e.g., Irrigation, Lawn Care, Plumbing, HVAC, Cleaning).
- The service area is a home ZIP plus a radius.
- An optional short bio is shown to customers alongside my bids.
- Business phone and email are shared only with customers who select me.
- I can edit my profile later.

---

## Epic 2 — Starting a request (customer)

The customer chooses how to start: **"Fill out a form"** or **"Just tell us"** (chat).
Both paths produce the same structured request:

- Category
- Title
- Description
- Answers to category-specific details
- Timeframe
- ZIP

### US-2.1 Choose form or chat (P0)

**As a** customer, **I want** to pick between a quick form and a conversation,
**so that** I can describe my need in whichever way feels easiest.

**Acceptance criteria**

- "New request" opens a screen with the two options, and each takes one tap on mobile.
- The chat option is shown only when the assistant is configured (see US-0.1).

### US-2.2 Start a request with a form (P0)

**As a** customer, **I want** a short, guided form tailored to the type of job,
**so that** I give servicers what they need without guessing.

**Acceptance criteria**

- Step 1 asks me to pick a category and write a one-line description ("What do you need help with?").
- Step 2 shows that category's question template. Irrigation, for example, asks:
  - Approximate yard size (small / medium / large, or square footage)
  - Number of zones
  - When the system was last serviced
  - Any known leaks or broken heads (yes / no + details)
- Each question has a type: single choice, multiple choice, number, date, or free text. Each is either required or optional.
- Questions appear one or a few at a time, with a progress indicator, and I can go back and change answers.
- The final step asks for a timeframe (ASAP / within a week / flexible / specific dates). The ZIP defaults to the one on my profile.

### US-2.3 Start a request by chatting (P0)

**As a** customer, **I want** to describe my need in my own words and have an assistant
ask me follow-up questions, **so that** I don't have to know the right category or terms.

**Acceptance criteria**

- I start with a free-text message, such as "I need help flushing my irrigation system".
- The assistant works out the category and asks follow-up questions one at a time, in plain language, until it has enough context. Enough context means:
  - The category is known.
  - The category template's required details are answered.
  - The timeframe is known.
- The assistant keeps asking within a reasonable limit (around 8 questions) and skips anything I've already said.
- Answers can be free text. The assistant may also offer quick-reply chips for common answers, like "3–5 zones" or "Not sure".
- I can say "that's all" or tap **Done** at any point. Any required details still missing are then asked in a short form.
- If my request doesn't match a known category, the assistant still gathers the details and files it under **Other**.
- The assistant stays on topic. Unrelated messages get a short redirect back to the request.
- If the assistant service fails mid-conversation, I'm offered the form, pre-filled with what has been gathered so far.
- The chat transcript is saved with the draft, but it is not shown to servicers.

### US-2.4 Review and publish (P0)

**As a** customer, **I want** to see a clean summary of my request before it goes out,
**so that** I can confirm it's right, whichever way I created it.

**Acceptance criteria**

- The review screen shows the title, description, all details, timeframe, and ZIP as an editable summary. When I used the chat, the assistant writes the title and description.
- I can edit any field in place before publishing.
- On publish, the request status becomes **Open** and it becomes visible to matching servicers.
- An unfinished request, whether form or chat, is saved as a **Draft** that I can resume.
- An optional bidding deadline (default 7 days) is shown to servicers.

### US-2.5 Add photos (P1)

**As a** customer, **I want** to attach photos in either the form or the chat,
**so that** servicers can see the problem and price more accurately.

### US-2.6 Manage my requests (P0)

**As a** customer, **I want** a dashboard listing my requests with their status and bid count,
**so that** I can see where each job stands.

**Acceptance criteria**

- Requests are grouped by status: Draft, Open, Closed, Cancelled.
- I can cancel an open request. Bidders see that it's been cancelled.
- I can add more context to an open request at any time. Servicers who have already bid are notified.

---

## Epic 3 — Finding and bidding on work (servicer)

### US-3.1 Browse open requests (P0)

**As a** servicer, **I want** a feed of open requests in my categories and service area,
**so that** I can quickly find jobs worth bidding on.

**Acceptance criteria**

- The feed shows only **Open** requests that match my categories and area.
- Each card shows the category, title, ZIP, timeframe, when it was posted, and how many bids it has.
- I can filter by category and sort by newest or by bidding deadline.
- Customer name and contact details are hidden.

### US-3.2 View request details (P0)

**As a** servicer, **I want** to see the full request, including all details and any extended context,
**so that** I can decide whether to bid and how to price it.

### US-3.3 Ask a clarifying question (P0)

**As a** servicer, **I want** to ask the customer a question about a request,
**so that** I can bid accurately when something isn't clear.

**Acceptance criteria**

- I submit a question from the request page.
- The customer is notified and answers from their request page.
- Each answered question is added to the request's **Extended context** section as a question-and-answer pair, which every servicer viewing the request can see.
- The asking servicer's identity is never shown to other servicers.
- Unanswered questions are visible only to the customer and the servicer who asked.
- Servicers who have already bid are notified when extended context is added.

### US-3.4 Submit a bid (P0)

**As a** servicer, **I want** to submit a bid with a price and availability,
**so that** the customer can compare me against other servicers.

**Acceptance criteria**

- A bid includes:
  - A price type: fixed price, price range, or "estimate after visit" with a visit fee, which may be $0
  - The amount or range
  - Earliest availability
  - A message to the customer
- I can bid at most once per request. I can edit my bid while the request is open.
- I can withdraw my bid while the request is open.
- **Bids are private:** only the customer sees them. Other servicers see only the bid count.

### US-3.5 Track my bids (P0)

**As a** servicer, **I want** a list of my bids and their status,
**so that** I know which jobs I'm still in the running for.

**Acceptance criteria**

- Bid statuses: **Submitted**, **Selected**, **Not selected**, **Withdrawn**.
- I'm notified when a bid's status changes.
- When I'm selected, the customer's name and contact details appear on the bid.

---

## Epic 4 — Comparing bids and choosing (customer)

### US-4.1 Compare bids (P0)

**As a** customer, **I want** to see all the bids on my request together,
**so that** I can compare price, availability, and servicer at a glance.

**Acceptance criteria**

- Each bid shows the servicer's business name and bio, price, availability, and message.
- Bids can be sorted by price or availability.
- On mobile, bids are shown as stacked cards rather than a wide table.

### US-4.2 Select servicers to contact (P0)

**As a** customer, **I want** to select one or a few servicers I'd like to talk to,
**so that** we can get in touch and arrange a visit without me calling everyone.

**Acceptance criteria**

- I can select one or more bids while the request is open.
- When I select a bid, its status becomes **Selected**. The servicer is notified and receives my name, email, and phone (if provided).
- I see the selected servicer's business phone and email on their bid.
- Selection can't be undone, since contact details have already been shared.

### US-4.3 Close the request (P0)

**As a** customer, **I want** to close my request once I've chosen,
**so that** I stop receiving bids and the other servicers know where they stand.

**Acceptance criteria**

- Closing the request sets its status to **Closed** and removes it from servicers' feeds.
- All bids that are still **Submitted** become **Not selected**, and those servicers are notified.
- Open requests close automatically at the bidding deadline. Customers can still select from existing bids for 7 days after it closes.

### US-4.4 Rate the servicer (P2)

**As a** customer, **I want** to rate a servicer after working with them,
**so that** future customers can choose with more confidence.

---

## Epic 5 — Notifications

### US-5.1 In-app notifications (P0)

**As a** user, **I want** a notification indicator and list,
**so that** I notice new bids, questions, added context, and selections.

**Acceptance criteria**

- Customers are notified of new bids and new questions.
- Servicers are notified of:
  - Answers to their questions
  - Extended context added to requests they bid on
  - Being selected or not selected
  - Requests being cancelled
- Notifications can be marked as read. Unread notifications show a badge count.

### US-5.2 Email notifications (P2)

**As a** user, **I want** important notifications sent by email as well,
**so that** I don't miss anything when I'm not in the app.

---

## Non-functional requirements

- **Mobile-first UI:** Every P0 screen is usable at 375px wide, with touch targets of at least 44px and no horizontal scrolling. The chat feels like a messaging app, with the input pinned to the bottom.
- **Containerized:** All services are defined in `docker-compose.yml`. No dependencies need to be installed on the host other than Docker.
- **Privacy:** No street addresses are collected. Contact details are shared only between a customer and the servicers they select.
- **Authorization:**
  - Customers can only see and edit their own requests and the bids on them.
  - Servicers can only see and edit their own bids, and can see only Open requests in their categories and area.
- **Assistant safety:** The assistant's output is always shown to the customer for review before publishing, and nothing it writes is published automatically. Requests to the model run on the server, and the model API key is never sent to the browser.
- **Accessibility:** Semantic HTML, labelled form fields, and keyboard navigation for all core flows, including the chat.

## State models

**Request:** `Draft → Open → Closed`, and `Open → Cancelled`

**Bid:** `Submitted → Selected`, `Submitted → Not selected` (when the request closes or is cancelled), and `Submitted → Withdrawn`

## MVP demo script

1. Run `docker compose up`.
2. Sign up as **Customer A** and post an irrigation request using the **chat**: "I need help flushing my irrigation system". Answer the assistant's follow-up questions, review the summary, and publish.
3. In a second browser or a private window, sign up as **Servicer B** (Irrigation, same area). Find the request, ask "Are any sprinkler heads broken?", and submit a bid.
4. As Customer A, answer the question. It now appears under **Extended context** on the request.
5. Sign up as **Servicer C**, see the extended context, and submit a bid.
6. As Customer A, compare the bids and select Servicer B. Both sides now see each other's contact details.
7. Close the request. Servicer C's bid becomes **Not selected** and C is notified.
8. Sign up as **Customer D** and post a request using the **form** instead.

## Decisions

1. Each account has a single role.
2. A request can be started with a form or a chat assistant, and both produce the same structured request.
3. Bids are private to the customer. Servicers see only the bid count.
4. Answers to clarifying questions are added to the request as extended context, and askers are anonymous.
5. No addresses are collected. kwōt's role ends when the customer selects servicers and contact details are exchanged.
6. There are no payments in the app.

## Open questions

1. Should the customer's contact details go to selected servicers automatically, or should the customer confirm first?
2. Should the bidding deadline be fixed at 7 days, or chosen by the customer?
3. Should servicer verification or licensing checks be part of a later version?

## Out of scope for the MVP

- Payments, deposits, invoicing
- Scheduling of visits inside the app
- Native mobile apps
- Servicer verification, background checks, insurance
- In-app messaging between customer and servicer, since contact happens directly after selection
- Email or SMS notifications
- Ratings and reviews
- Admin / moderation tools
