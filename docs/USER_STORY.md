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

1. A customer describes what they need in their own words, either in an open text box or by chatting with the kwōt assistant.
2. kwōt's AI turns that description into a **request document**: a clear, README-style write-up of the job that the customer reviews and can edit.
3. The finished request opens for bidding.
4. Servicers browse open requests, ask clarifying questions, and submit private bids.
5. The customer compares bids and selects one or a few servicers. kwōt shares contact details between them.

## Product principles

- **Simple and seamless:** Starting a request should feel as easy as sending a text. No checklists or category-specific questionnaires: the customer says what they need, in their own words.
- **The customer's choice of input:** Both the open text box and the chat produce the same request document.
- **AI writes, the customer approves:** The AI organizes what the customer said into a readable document. It never invents details, and nothing is published until the customer approves it.
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
  post a request (written or chatted) → bid on it → select servicer(s).

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
- Configuration comes from environment variables, with a committed `.env.example`. This includes which model powers the assistant: an open-weights model served locally by Ollama (the POC default), or a hosted model.
- If the assistant's model isn't available, the app still runs: the chat option is hidden, and the open text box publishes the customer's own text as the request document without AI formatting.
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

Requests are open-ended. kwōt never walks the customer through category-specific
questionnaires (yard size, number of zones, and so on). The customer describes the job
in their own words, and kwōt's AI writes a **request document** from it.

The request document is a README-style Markdown write-up of the job. Sections appear
only when the customer gave information for them:

```markdown
# Flush irrigation system before winter

## Summary
One or two sentences on what the customer needs.

## What needs to be done
The work, in the customer's terms, organized into short paragraphs or bullets.

## About the property
Anything the customer mentioned about the site, equipment, or access.

## Timing
When the customer wants it done, if they said.

## Notes for servicers
Anything else useful: preferences, constraints, known problems.
```

Alongside the document, the AI picks a **category** (used only to match the request to
servicers' trades) and a short **title**. The ZIP comes from the customer's profile.

### US-2.1 Choose how to describe the job (P0)

**As a** customer, **I want** to either write out what I need or talk it through,
**so that** I can describe the job in whichever way feels easiest.

**Acceptance criteria**

- "New request" offers **"Write it out"** (open text box) and **"Talk it through"** (chat), and each takes one tap on mobile.
- The chat option is shown only when the assistant is configured (see US-0.1).

### US-2.2 Write it out (P0)

**As a** customer, **I want** a single open text box where I describe the job however I like,
**so that** posting a request takes seconds and never feels like filling in a form.

**Acceptance criteria**

- The screen has one large text box ("Describe what you need, in your own words") and a **Create request** button. There are no category pickers, dropdowns, or required fields beyond the text itself.
- Placeholder text gives a short example, so customers know they can write naturally.
- On submit, the AI writes the request document, title, and category from my text and shows the review screen (US-2.4).
- If the assistant isn't configured or fails, my own text becomes the document as written, under a title taken from its first line, filed under **Other**.

### US-2.3 Talk it through (P0)

**As a** customer, **I want** to chat with an assistant about what I need,
**so that** I can get the job described without having to organize my thoughts first.

**Acceptance criteria**

- I start with a free-text message, such as "I need help flushing my irrigation system".
- The conversation stays open-ended. The assistant does not ask for specific measurements or details (yard size, number of zones, model numbers, …).
- The assistant asks a follow-up only when it can't tell what the job is, plus at most one broad question such as "When would you like this done, and is there anything else a pro should know?". Most conversations finish in one to three turns.
- I can tap **Done** at any point, and the assistant writes the document from what I've said.
- When it's ready, the assistant writes the request document and I see the review screen (US-2.4).
- The assistant stays on topic. Unrelated messages get a short redirect back to the request.
- If the assistant fails mid-conversation, I'm offered the open text box, pre-filled with what I've written so far.
- The chat transcript is not shown to servicers. Only the request document is.

### US-2.4 Review and publish (P0)

**As a** customer, **I want** to read the request document before it goes out,
**so that** I can confirm it says what I meant, whichever way I created it.

**Acceptance criteria**

- The review screen shows the title and the rendered request document, formatted the way servicers will see it.
- I can switch to edit mode and change the title or the document's Markdown directly.
- I can change the category the AI picked. It decides which servicers see the request.
- The document contains only what I said. The AI may reorganize and tidy my wording but never adds facts I didn't give.
- On publish, the request status becomes **Open** and it becomes visible to servicers whose trades include the request's category.
- An unfinished request, whether written or chatted, is saved as a **Draft** that I can resume.
- An optional bidding deadline (default 7 days) is shown to servicers.

### US-2.5 Add photos (P1)

**As a** customer, **I want** to attach photos when writing or chatting,
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
- Each card shows the category, title, the document's summary, ZIP, when it was posted, and how many bids it has.
- I can filter by category and sort by newest or by bidding deadline.
- Customer name and contact details are hidden.

### US-3.2 View request details (P0)

**As a** servicer, **I want** to read the full request document, including any extended context,
**so that** I can decide whether to bid and how to price it.

### US-3.3 Ask a clarifying question (P0)

**As a** servicer, **I want** to ask the customer a question about a request,
**so that** I can bid accurately when something isn't clear.

**Acceptance criteria**

- I submit a question from the request page.
- The customer is notified and answers from their request page.
- Each answered question is appended to the request document under an **Extended context** section, as a question-and-answer pair, which every servicer viewing the request can see.
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
2. Sign up as **Customer A** and post an irrigation request using the **chat**: "I need help flushing my irrigation system". Review the request document the assistant writes, and publish.
3. In a second browser or a private window, sign up as **Servicer B** (Irrigation, same area). Find the request, ask "Are any sprinkler heads broken?", and submit a bid.
4. As Customer A, answer the question. It now appears under **Extended context** on the request.
5. Sign up as **Servicer C**, see the extended context, and submit a bid.
6. As Customer A, compare the bids and select Servicer B. Both sides now see each other's contact details.
7. Close the request. Servicer C's bid becomes **Not selected** and C is notified.
8. Sign up as **Customer D** and post a request using the open text box instead.

## Decisions

1. Each account has a single role.
2. Requests are open-ended. The customer writes or chats in their own words, with no category questionnaires, and AI turns it into a README-style request document that the customer reviews and approves.
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
