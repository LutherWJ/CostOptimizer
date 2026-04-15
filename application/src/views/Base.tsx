const Base = (content: string, title = "App") => {
  return `
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <script src="/public/htmx.min.js"></script>
      </head>
      <body>
        <main>
          ${content}
        </main>
      </body>
    </html>
  `;
};

export default Base;