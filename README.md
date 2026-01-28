# GlimMarket AI Page Assistant  
Prototype Handoff Package

This repository contains a **working prototype** of the GlimMarket AI Page Assistant.  
It is provided as a **handoff package** so GlimMarket’s internal or external team can continue development, deployment, and long-term ownership.

The assistant is **page-aware** and designed to help users:
- Understand the content of the current page
- View summaries and key takeaways
- Ask contextual questions about that page only

The assistant is intentionally **non-advisory** and **non-recommendation based**.

---

## Current Status

**Functional Prototype / Demo Mode**

- The assistant is operational and tested
- Uses OpenAI’s API via a Node.js backend
- Integrated into WordPress via a custom plugin
- Intended for internal review, testing, and iteration

This package is **not yet a production deployment**.

---

## What This Package Contains

### 1. Node.js Backend
- Fetches WordPress page content via REST API
- Sends page content + user question to OpenAI
- Returns page-scoped responses only
- Enforces non-advisory behavior
- Uses a simple in-memory cache (prototype only)

### 2. WordPress Plugin
- Injects a floating “ASK” assistant UI
- Passes page metadata (ID, title, URL) to backend
- Loads on standard WordPress content pages
- Handles open/close state and basic session behavior

### 3. Combined Documentation (This File)
- How the assistant works today
- How to deploy under GlimMarket ownership
- Where behavior and scope can be modified
- How it can be extended in the future
- Clear separation of prototype vs production needs

---

## How the Assistant Works (Current Behavior)

1. A user opens the assistant on a page
2. The WordPress plugin sends:
   - Page ID
   - Page title
   - Page URL
   - User message
3. The backend:
   - Fetches the page content from WordPress
   - Converts HTML to plain text
   - Sends page content + user message to OpenAI
4. The assistant responds using **only that page’s content**

### Key Constraints
- The assistant does **not** use global site knowledge
- It does **not** browse external sources
- If information is not on the page, it responds accordingly
- Each response includes an educational disclaimer

---

## Data Handling

### Data Sent
- Page metadata (ID, title, URL)
- User-entered question text

### Data NOT Collected
- No user accounts
- No personal identifiers
- No cookies beyond session UI state
- No analytics or tracking (prototype)

---

## Backend Configuration

The backend must be deployed under **GlimMarket-controlled hosting**.

ChatGPT Plus subscriptions **do not** apply to API usage.  
OpenAI API usage requires a **separate paid API account**.

### Required Environment Variables

```env
PORT=4000
OPENAI_API_KEY=your_openai_api_key_here
WP_BASE=https://glimmarket.com
MODEL=gpt-4o-mini
ALLOWED_ORIGINS=