# CostOpt Application: Web Interface & Recommendation Engine

The `application` service is a Bun-powered web application that provides a user-friendly interface for discovering laptop recommendations. It is built using a modern, lightweight stack focused on server-side performance and high interactivity.

## Architecture

The application follows a traditional **MVC (Model-View-Controller)** pattern, implemented with **Hono** and **HTMX**.

### 1. Controllers (`src/controllers/`)
Controllers handle incoming HTTP requests, interact with the model layer, and return rendered views.

- **`homeController.tsx`**: Manages the landing page and initial user state.
- **`workloadsController.ts`**: Handles the selection of user workloads and updates the session-based requirements.
- **`filtersController.ts`**: Manages hardware filters (brand, price range, etc.) that further refine recommendations.
- **`recommendationController.ts`**: The core logic that fetches and ranks laptops based on the user's workload and filters.
- **`supportChatController.ts`**: Implements a RAG-powered support chat using Ollama and internal knowledge documents.

### 2. Views (`src/views/`)
Views are written in **Hono JSX**, providing a type-safe way to define HTML templates that are rendered on the server.

- **`Base.tsx`**: The main layout wrapper (header, footer, common scripts).
- **`Home.tsx`**: The entry point for the user journey.
- **`Workloads.tsx`**: Interactive workload selection interface.
- **`Filters.tsx`**: Sidebar/top-bar for refining hardware specifications.
- **`Recommendations.tsx`**: Displays the ranked list of laptops with "Value Score" indicators.

### 3. Models & Repositories (`src/models/`, `src/repositories/`)
The data layer interacts with the PostgreSQL database.

- **`laptopRecommendationsModel.ts`**: Primary interface to the `laptop_recommendations` Materialized View.
- **`KnowledgeRepository.ts`**: Manages vector-searchable knowledge chunks for the support chat.
- **`ComponentBenchmarkRepository.ts`**: Handles CPU/GPU benchmark lookups and example retrieval.
- **`SoftwareRequirementsRepository.ts`**: Manages software compatibility profiles.
- **`WorkloadRepository.ts`**: Manages user workload definitions.

### 4. Services (`src/services/`)
- **`OllamaService.ts`**: Local service wrapper for interacting with the Ollama LLM for chat and embeddings.

---

## Deployment & Independence

The application is fully independent of the `aggregator` directory. All necessary repositories, models, and services have been localized to `application/src` to ensure the application can be deployed as a standalone service (e.g., on a separate VM or container) without requiring the ETL pipeline code.

---

## Key Technologies

- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Hono](https://hono.dev/) (fast, lightweight, and supports JSX).
- **Frontend Interactivity**: [HTMX](https://htmx.org/) for AJAX-powered UI updates without a heavy client-side JavaScript framework.
- **Database Interface**: `bun:sql` for high-performance PostgreSQL queries.
- **Styling**: Vanilla CSS, scoped to specific views (e.g., `workloads.css`, `recommendations.css`).

---

## Frontend Interactivity (HTMX)

The application uses HTMX to provide a "Single Page App" feel while keeping all logic on the server:

- **Workload Selection**: When a user selects a workload, HTMX triggers a POST request to `/workloads`, which updates the session and returns a partial HTML update for the filters and recommendations.
- **Filtering**: Changing a filter (e.g., price range) triggers an out-of-band swap that refreshes the recommendation list without a full page reload.
- **Dynamic Assets**: Custom JS in `public/` (e.g., `filters.js`) provides minor client-side enhancements (like sliders or transitions) while HTMX handles the data flow.

---

## Performance Optimization

The application is optimized for speed through:
1. **Materialized Views**: The complex join logic and scoring calculations are handled in the database, allowing the application to perform simple `SELECT` queries with filtering.
2. **Server-Side Rendering (SSR)**: By sending pre-rendered HTML to the browser, the "Time to First Meaningful Paint" is minimized.
3. **No Heavy JS Bundles**: The use of HTMX and vanilla CSS avoids the overhead of large framework runtimes like React or Vue.
