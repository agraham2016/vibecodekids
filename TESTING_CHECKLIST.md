# Testing Checklist — AI Monitoring & COPPA Update

Run through these tests after deploying the latest code drop.

---

## 1. Random Starting Model

- [ ] **New chat assigns random model (when Grok available)**  
  - Log in, open Studio.  
  - Check which model badge is selected (Professor Claude or VibeGrok).  
  - Click "New Project" or "Start Over" or load another project.  
  - Model should change randomly (50/50 Claude vs Grok when Grok is available).

- [ ] **Clear messages triggers new session**  
  - After new project / load project, send a message.  
  - Verify the model used matches the one shown before sending.

---

## 2. Event Logging

- [ ] **Events are logged**  
  - Send a few messages in the Studio (generate games).  
  - Check that `data/generate_events.jsonl` exists and has new lines (if using file storage).  
  - Each line should be valid JSON with `sessionId`, `startingModel`, `modelUsed`, etc.

- [ ] **No events when opted out**  
  - Use admin to opt a user out:  
    `POST /api/admin/users/{userId}/opt-out-improvement` with your admin key.  
  - Generate as that user.  
  - Confirm no new events are written for that user.

---

## 3. Admin Model Performance Panel

- [ ] **Panel loads**  
  - Log in to Admin (`/admin`).  
  - Open the **System** tab.  
  - Confirm the **"Model Performance (Claude vs Grok)"** panel appears.

- [ ] **Stats display**  
  - After generating a few games, refresh the panel (or switch away and back).  
  - Check that you see: total generations, sessions by starting model, generations by model, success rates.

- [ ] **Period selector**  
  - Switch between "Last 7 days" and "Last 30 days".  
  - Confirm the stats update.

---

## 4. Privacy Policy & Terms

- [ ] **Privacy Policy**  
  - Visit `/privacy`.  
  - Confirm the "Improving Our AI" section is present.  
  - Confirm contact email is `admin@vibecodekidz.org`.

- [ ] **Terms of Service**  
  - Visit `/terms`.  
  - Confirm the "Our AI Assistant" section includes the bullet about anonymized data for improvement.  
  - Confirm contact email is `admin@vibecodekidz.org`.

---

## 5. Parent Consent Flow

- [ ] **Consent email**  
  - Create an under-13 account (or use existing consent flow).  
  - Check the consent email for:  
    - "By approving, you agree to our Terms of Service and Privacy Policy, including our use of anonymized chat data to improve our AI assistants"

- [ ] **Post-approval page**  
  - Approve a child account via the email link.  
  - Confirm the success page mentions Terms/Privacy and AI improvement, and that you can opt out.

---

## 6. Admin Opt-Out

- [ ] **Opt-out endpoint**  
  - With admin key:  
    `POST /api/admin/users/{userId}/opt-out-improvement`  
  - Confirm 200 and success message.  
  - Confirm that user’s events are no longer logged (see Event Logging above).

---

## 7. PostgreSQL (if used)

- [ ] **Schema migration**  
  - Ensure `improvement_opt_out` exists:  
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS improvement_opt_out BOOLEAN NOT NULL DEFAULT false;`  
  - Restart server and verify no DB errors.

---

## Quick Reference

| Feature              | Location                                      |
|----------------------|-----------------------------------------------|
| Event store          | `server/services/eventStore.js`               |
| Model performance    | `server/services/modelPerformance.js`         |
| Admin API            | `GET /api/admin/model-performance`            |
| Admin opt-out        | `POST /api/admin/users/:id/opt-out-improvement` |
| Events file          | `data/generate_events.jsonl`                  |
