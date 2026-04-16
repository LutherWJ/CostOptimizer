const Base = (content: string, title = "App", extraCss: string[] = [], extraJs: string[] = []) => {
  const extraLinks = extraCss
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n    ");

  const extraScripts = extraJs
    .map((src) => `<script src="${src}"></script>`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/public/base.css">
  ${extraLinks}
</head>
<body>
  ${content}
  ${extraScripts}
</body>
</html>`;
};

export default Base;
