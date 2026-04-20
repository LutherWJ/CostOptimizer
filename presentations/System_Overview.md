# System Architecture: The CostOpt Blueprint

## 1. Architectural Philosophy: The Power of Decoupling
CostOpt is designed around the principle of **Logical and Physical Decoupling**. In many modern applications, the backend and frontend are tightly coupled via live API calls (REST or GraphQL). If the backend is slow, the frontend hangs; if the backend API changes, the frontend breaks.

CostOpt breaks this cycle by using a **Shared Database Integration Pattern**.
*   **The Aggregator** is the "Writer": It lives in its own world, focusing exclusively on data acquisition and refinement.
*   **The Application** is the "Reader": It lives in its own world, focusing exclusively on user experience and data visualization.

### Why this matters for the Team:
Because they only communicate through the database, you can completely rewrite the Aggregator in a different language (like Python or Go) without changing a single line of code in the Application. This is the ultimate form of **Future-Proofing**.

---

## 2. The Tech Stack: "Low-JS" & High Performance
We made a conscious architectural choice to move away from the "Heavy SPA" (Single Page Application) trend (like standard React or Vue).

*   **Runtime: Bun**: We use Bun because it is an all-in-one toolkit. It replaces Node.js, npm, and even the test runner. Its native `bun:sql` driver is optimized for high-performance PostgreSQL connections.
*   **The "HTML-First" Frontend (Hono + HTMX)**:
    *   **Hono JSX**: Instead of sending a JSON object to a browser and letting a complex JS framework figure out how to render it, our server renders the HTML directly.
    *   **HTMX**: This is our secret weapon. It allows us to perform "Partial Page Swaps." When a user clicks a filter, we don't reload the page; we just ask the server for the "Products" HTML and swap it into the existing page.
    *   **Architectural Benefit**: This reduces the "Mental Load" for developers. You don't have to manage complex state in the browser (Redux, Vuex, etc.). The server *is* the state.

---

## 3. Data Materialization: The "CQRS-Lite" Pattern
In a standard app, a recommendation query might look like this:
`JOIN laptops -> JOIN prices -> JOIN benchmarks -> JOIN workloads -> FILTER -> CALCULATE VALUE`.
Doing this for every user click would kill the database performance.

We use a pattern called **Materialized Views**.
1.  The Aggregator does all the heavy math in the background.
2.  It saves the final, flattened results into a "Materialized View" called `laptop_recommendations`.
3.  The Application performs a simple `SELECT * FROM laptop_recommendations`.

**Educational Note**: This is a simplified version of **CQRS (Command Query Responsibility Segregation)**. We separate the "Commands" (the Aggregator writing data) from the "Queries" (the Application reading data).

---

## 4. The Lifecycle of a Recommendation (Data Flow)
To understand the system, trace a single laptop from discovery to the user's screen:

1.  **Discovery (Aggregator)**: The `IcecatService` finds a new SKU (e.g., "Dell XPS 13"). It creates a "Shell" record with basic specs.
2.  **Market Awareness (Aggregator)**: The `EbayService` finds the latest price for that SKU.
3.  **Performance Context (Aggregator)**: The `BenchmarkSyncJob` pulls the latest scores for the CPU inside that Dell.
4.  **The Suitability Calculation (Aggregator)**: The `SuitabilityTransformer` looks at the specs + benchmarks and decides: "This is powerful enough for 4K Video Editing."
5.  **Flattening (Database)**: The database runs a `REFRESH MATERIALIZED VIEW` command. The Dell XPS 13, its price, its benchmark, and its suitability tags are squashed into one row.
6.  **The User Request (Application)**: A student clicks "I need a laptop for Video Editing under $1200."
7.  **The Delivery (Application)**: The `RecommendationRepository` runs a fast query against the flattened view. The `RecommendationController` renders the HTML and sends it to the student.

---

## 5. Mental Model for Refactoring
*   **"I want to change the UI"**: You are in the `application` folder. You only touch the Views and Controllers. The data is already there; you just need to change how it's shown.
*   **"The recommendations are inaccurate"**: You are in the `aggregator` folder. You need to adjust the `workloads.ts` definitions or the `SuitabilityTransformer` logic.
*   **"We need more laptops"**: You are in the `aggregator` folder. You need to check the `LaptopDiscoveryJob` or add a new `Extractor`.

---

## 6. Design Patterns Summary
*   **Decoupled Monorepo**: Separation of concerns.
*   **Shared Database Contract**: Integration via data, not APIs.
*   **Materialized View (CQRS-Lite)**: Performance through pre-calculation.
*   **Hypermedia as the Engine of Application State (HATEOAS)**: Using HTMX to drive the UI via server-rendered HTML.
