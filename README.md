# AI DevOps - Self-Healing AI Engine & Notes Application

A full-stack DevOps and AI automation system featuring a **Self-Healing AI Engine** powered by multi-agent LLM debate (Groq SDK / Llama 3) along with a Express.js backend and a frontend Notes application.

When runtime errors occur in the application, the AI Engine automatically detects them, gathers context, runs a multi-agent debate to synthesize a targeted fix, applies the patch, tests server health, and rolls back if necessary.

---

## 🌟 Key Features

- **Automated Error Watching**: Continuous polling and signature tracking on log files (`error.log`) to catch unhandled application exceptions.
- **Context-Aware Analysis**: Automatically isolates the buggy file and line number from stack traces, retrieving relevant context from related project files.
- **Multi-Agent AI Debate Pipeline**:
  1. **Agent A (Proposer)**: Analyzes the error log and context to propose an initial fix.
  2. **Agent B (Critic)**: Reviews Agent A's proposed fix for edge cases, syntax, or logical flaws.
  3. **Agent A (Refiner)**: Re-evaluates and refines the code fix based on Agent B's critique.
  4. **Judge Agent**: Delivers the final single-line code correction.
- **Safe Auto-Fix & Rollback Engine**:
  - Automatically creates file backups (`.bak`).
  - Safely applies the exact line replacement.
  - Logs changes to `fix.log`.
  - Gracefully restarts the backend process.
  - Runs automated health check endpoints (`GET /notes`) to verify stability, automatically rolling back changes if health verification fails.

---

## 📁 Repository Structure

```text
.
├── app/
│   ├── ai-engine/          # Automated error watcher & AI debate pipeline
│   │   ├── autoFix.js      # File patcher, backup creation, health check & rollback
│   │   ├── contextBuilder.js # Extracts buggy lines & gathers file context
│   │   ├── debate.js       # Multi-agent debate orchestration (Proposer, Critic, Judge)
│   │   ├── groqClient.js   # Groq SDK integration (Llama 3.1)
│   │   ├── prompts.js      # Structured prompt templates for AI agents
│   │   └── watcher.js      # Log file poller and error watcher daemon
│   ├── backend/            # Express.js REST API
│   │   ├── error.log       # Application runtime error log
│   │   └── server.js       # Notes API server & global error logger
│   └── frontend/           # Vanilla JS Web UI
│       ├── index.html      # User interface layout
│       ├── script.js       # Frontend API interaction logic
│       └── style.css       # Interface styling
├── package.json            # Node.js dependencies and scripts
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: Package manager included with Node.js
- **Groq API Key**: Required for AI Engine multi-agent debates ([Get Groq API key](https://console.groq.com/))

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd aidevops
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

---

## 💻 Running the Application

### 1. Start the Backend API Server
Runs the Express REST API on `http://localhost:3000`.
```bash
npm run start:backend
```

### 2. Start the AI Watcher Engine
Monitors backend errors and automatically applies fixes when runtime exceptions are logged.
```bash
npm run start:watcher
```

### 3. Open the Frontend
Open `app/frontend/index.html` in your web browser or serve it via a static web server.

---

## 📡 API Endpoints

The backend provides the following endpoints for managing notes:

| Method | Endpoint    | Description                     |
| ------ | ----------- | ------------------------------- |
| GET    | `/notes`    | Fetch all stored notes          |
| POST   | `/notes`    | Create a new note               |
| DELETE | `/notes/:id`| Delete a note by its unique ID  |

---

## 🛡️ How Auto-Fix Works

1. **Detection**: `watcher.js` detects a new stack trace written to `app/backend/error.log`.
2. **Context Building**: `contextBuilder.js` extracts the exact file and line number causing the error and loads related code files into context.
3. **Debate**: `debate.js` sends the error stack trace and code context through Groq SDK (Llama 3 model) in a multi-round debate between Agent A (Fixer), Agent B (Critic), and Judge.
4. **Application & Verification**:
   - `autoFix.js` creates a `.bak` copy of the buggy file.
   - Replaces the bad line with the AI's patch.
   - Restarts the Express server on port `3000`.
   - Sends a test GET request to `/notes`.
   - If response is valid HTTP 200 array, the fix is marked successful.
   - If invalid, `.bak` file is restored immediately.
