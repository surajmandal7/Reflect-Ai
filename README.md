# ReflectAI — Private AI Journal & Personal Reflection Companion

ReflectAI is a production-quality, privacy-first AI journaling and reflection web application built with **React**, **Vite**, **Cloud Firestore**, **Firebase Auth**, and **Google Gemini API** (via resilient server-side proxy).

---

## 🌟 Key Architecture & Features

1. **Private by Design & Zero-Knowledge Isolation**:
   - Every journal entry, reflection message, and goal is isolated strictly to the authenticated user's tenant (`users/{userId}/*`).
   - Firestore security rules enforce `request.auth.uid == userId` for all read, write, update, and delete actions.

2. **Server-Side Gemini API Proxy**:
   - Zero API keys exposed to frontend bundles.
   - Resilient model fallback ladder: `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`.

3. **Multi-Turn Mindful AI Dialogues**:
   - ChatGPT-style streaming chat with adaptive reflection modes:
     - **Reflect**: Empathetic, mindful mirror for exploring feelings.
     - **Summarize**: Concise takeaway synthesis.
     - **Brainstorm**: Creative ideation and divergent thinking.
     - **Challenge Me**: Constructive devil's advocate questioning assumptions.
     - **Action Plan**: Milestone task extraction.
     - **Coach**: Socratic inquiry questions.
     - **Find Patterns**: Identifies recurring themes across journal history.

4. **Actionable Roadmap & Goal Extraction**:
   - 1-click goal and subtask extraction directly from reflective writing.
   - Interactive progress checklists with linked journal citations.

5. **Periodic Syntheses & Analytics**:
   - Weekly and monthly structured reviews.
   - Mood distribution, writing streaks, volume metrics, and tag clustering.

6. **Data Portability**:
   - Instant export of all reflections to JSON and formatted Markdown.

---

## 🛡️ Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /journalEntries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /conversations/{conversationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /goals/{goalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /insights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Google Cloud Run & Secret Manager Deployment

### 1. Prerequisites
Ensure the Google Cloud SDK (`gcloud`) is installed and authenticated:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable required Google Cloud APIs:
```bash
gcloud services enable run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Secret Manager Setup
Store the Gemini API Key securely in Secret Manager:
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run
Deploy the application with secret injection and container build:
```bash
gcloud run deploy reflect-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 4. Challenge Verification Binding
Apply the verification label:
```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 📋 Comprehensive Functional Stability Checklist (Walkthrough Test Matrix)

1. **Authentication & Session Initialization**:
   - [ ] Sign in with Google opens popup or seamlessly activates authenticated session.
   - [ ] Guest session button provisions private local workspace with seeded reflective data.
   - [ ] Sign out clears user state and redirects to Landing Page.

2. **Dashboard & Quick Actions**:
   - [ ] Dynamic time greeting displays accurate morning/afternoon/evening message.
   - [ ] Streak, entry count, word volume, and active goal metrics compute live.
   - [ ] "Generate Another" fetches a new daily reflection prompt from Gemini.
   - [ ] "Use Prompt" initializes a new journal entry prepopulated with the prompt.

3. **Distraction-Free Journal Editor**:
   - [ ] Typing in the editor triggers auto-save with visual status indicators (`Saving...` -> `Saved`).
   - [ ] Live word count and character count update in real-time.
   - [ ] Adding/removing tags `#tags` and selecting moods works with instant persistence.
   - [ ] Favorite and Pin buttons update entry priority across the app.
   - [ ] `beforeunload` event handler prevents accidental loss of unsaved changes.

4. **In-Editor AI Reflection Actions**:
   - [ ] "Reflect" produces thoughtful, empathetic introspection.
   - [ ] "Summarize" synthesizes the entry and saves an AI summary snippet.
   - [ ] "Create Action Plan" extracts structured goals and subtasks with 1-click "Save as Goal" button.
   - [ ] AI Context Selector controls whether past entries are sent with the prompt.

5. **Multi-Turn AI Conversations (Streaming)**:
   - [ ] Mode buttons (`Reflect`, `Summarize`, `Brainstorm`, `Challenge Me`, `Action Plan`, `Coach`, `Find Patterns`) adapt Gemini's persona.
   - [ ] Server-Sent Events (SSE) stream text smoothly with "Gemini is reflecting..." indicator.
   - [ ] "Stop Generation" aborts the streaming response cleanly.
   - [ ] "Regenerate" and "Edit Message" re-trigger responses from previous dialogue points.
   - [ ] "Clear Messages" resets the active thread.

6. **History, Search & Bulk Operations**:
   - [ ] Search input matches title, body content, tags, and AI summary previews.
   - [ ] Filter chips (`All`, `Favorites`, `Pinned`, `Archived`) correctly isolate entries.
   - [ ] Sort dropdown toggles between `Newest First`, `Oldest First`, and `Most Words`.
   - [ ] Bulk selection allows multi-item archiving or deletion.
   - [ ] "Export Markdown" and "Export JSON" download clean local files.

7. **Insights & Reviews**:
   - [ ] Mood distribution progress bars accurately represent self-reported emotional states.
   - [ ] "Generate Weekly Review" aggregates recent reflections into summaries, themes, and actionable takeaways.
   - [ ] "Monthly Synthesis" generates high-level monthly growth patterns.

8. **Goals & Action Items**:
   - [ ] Creating a new goal with checklist subtasks tracks completion percentages.
   - [ ] Checking off all subtasks automatically transitions goal to `Completed`.
   - [ ] Extracted goals link directly back to the originating journal reflection.

9. **Reflection Calendar**:
   - [ ] Highlights days with reflections using badge indicators.
   - [ ] Clicking a date filters and previews all reflections written on that specific calendar day.

10. **Settings & Theming**:
    - [ ] Light / Dark / System theme toggle switches styles seamlessly.
    - [ ] Default AI mode preference saves and applies to subsequent chat sessions.
    - [ ] Full backup export downloads complete database records.
