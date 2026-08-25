# AccuNumbo Adventures — Deployment

## Render setup
Create/use a Node Web Service connected to the GitHub repository.

**Root Directory:** leave blank

**Build Command:**
```text
npm install
```

**Start Command:**
```text
npm start
```

**Environment variable:**
```text
JWT_SECRET=<strong-random-secret>
```

The app listens on `process.env.PORT` and defaults to `10000` for local testing.

## Expected repository root
```text
index.html
styles.css
server.js
package.json
accunumbo-logo.png
adventures.html
dashboard.html
feedback.html
login.html
teachers.html
```

Do not move `index.html` into `src/` unless the server is deliberately changed to use that structure.

## Before public launch
Use HTTPS, a production database, rate limiting, robust session security, backups, monitoring, a privacy policy and appropriate consent/data safeguards for school-age learners.
