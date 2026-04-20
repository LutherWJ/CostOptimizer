# Application Deep Dive: The User-Facing Platform

## 1. Architectural Pattern: The N-Tier (Layered) Architecture
The Application is built as a classic **N-Tier (Layered) System**. This is the gold standard for robust, maintainable software. Each layer only knows about the layer directly below it, ensuring that "UI concerns" (like HTML buttons) never mix with "Data concerns" (like SQL queries).

### Layer 1: The Presentation Layer (Hono JSX Views)
This layer is responsible for what the user sees. We use **Hono JSX**, which allows us to write HTML as if it were React, but it executes on the server.
*   **Design Principle: Type Safety**. By using JSX, we ensure that every laptop property (price, manufacturer, specs) is correctly typed. If we try to display a `price` that might be `undefined`, the compiler will warn us.

### Layer 2: The Controller Layer (`Controller` Pattern)
The Controller handles the HTTP Request. Its job is to:
1.  Parse the URL (e.g., "What filters did the user select?").
2.  Call the Service Layer.
3.  Return the rendered HTML to the user.
*   **Design Principle: Single Responsibility**. The Controller doesn't know *how* to calculate a recommendation; it only knows *who* to ask for it.

### Layer 3: The Service Layer (`Service` Pattern)
This is the **Business Logic Layer**. It is the bridge between the UI and the Data.
*   **The Logic**: If a user selects the "Student" workload, the Service knows that this corresponds to the "Writing & Study" tag in the database.
*   **The Transformer**: The Service maps raw database rows (which might be messy) into clean, ready-to-display objects (`LaptopRecommendation`).

### Layer 4: The Data Access Layer (`Repository` Pattern)
The Repository is the only place where SQL is written. 
*   **Encapsulation**: The Service asks: "Give me the top 60 laptops for this filter." The Repository handles the complex `WHERE` and `ORDER BY` clauses.
*   **Performance**: The Repository queries the **Materialized View** created by the Aggregator, ensuring that even complex searches return in milliseconds.

---

## 2. Dependency Injection: The Secret to Refactoring
A key architectural feature of the Application is **Dependency Injection (DI)**. 
*   **The Pattern**: When we create the `RecommendationController`, we don't let it create its own `RecommendationService`. Instead, we "inject" the service into the controller's constructor.
*   **Why this is a superpower**: 
    1.  **Testability**: We can "mock" the service during testing. We can give the controller a "Fake Service" that returns 5 specific laptops to see if the UI renders them correctly.
    2.  **Loose Coupling**: We can completely swap out the `RecommendationService` for a new one without touching the `RecommendationController`. 

---

## 3. The Frontend Pattern: HTMX & "Low-JS"
We use **HTMX** to provide a modern, snappy user experience without the complexity of a frontend framework like React or Vue.

### The Logic Trace of a Filter Update:
1.  **Action**: The user clicks the "Gaming" checkbox.
2.  **Trigger**: HTMX detects the click and sends an AJAX request to `/recommend?workloads=gaming`.
3.  **Process**: The server (Hono) runs the Controller -> Service -> Repository pipeline.
4.  **Response**: The server sends back **only the HTML** for the new laptop cards.
5.  **The Swap**: HTMX automatically replaces the old laptop cards with the new ones.

**Educational Note**: This pattern is called **HATEOAS** (Hypermedia as the Engine of Application State). The server dictates the state of the app by sending HTML, rather than the browser managing state in a complex JS object.

---

## 4. How to Make Changes (Refactoring Guide)
### Changing the UI
If you want to change the color of the product cards:
*   **Where**: Go to `views/Recommendations.tsx`.
*   **Impact**: Zero impact on logic or data.

### Adding a New Search Filter (e.g., "Brand")
1.  **View**: Add the brand checkbox to `Filters.tsx`.
2.  **Service**: Update `RecommendationService` to accept a `manufacturer` parameter.
3.  **Repository**: Add a `WHERE manufacturer = $1` clause to the SQL query in `RecommendationRepository`.
4.  **Architecture**: Because of the Layered Architecture, you have a clear, "Step-by-Step" path for the change.

### Changing the Recommendation Algorithm
If you want to change how "Value Score" is calculated:
*   **Where**: You actually don't touch the Application! This logic is in the Aggregator's SQL scripts. The Application just displays the score it’s given. This is the **Power of Decoupling**.

---

## 5. Summary of Key Patterns
*   **MVC (Model-View-Controller)**: The overall organization of the app.
*   **Repository Pattern**: For clean data access.
*   **Service Layer Pattern**: For reusable business logic.
*   **Dependency Injection**: For loose coupling and testability.
*   **HATEOAS (via HTMX)**: For a modern, low-overhead UI.
