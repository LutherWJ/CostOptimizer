import { Child } from "hono/jsx";

const Base = (props: { children: Child; title?: string }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title || "Todo App"}</title>
        <script src="/public/htmx.min.js"></script>
      </head>
      <body>
        <main>
          {props.children}
        </main>
      </body>
    </html>
  );
};

export default Base;
