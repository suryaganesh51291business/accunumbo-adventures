# AccuNumbo Adventures — Clean Restart V1

**Tagline:** Experience First. Explanation Second.

This package is a clean restart of the AccuNumbo Adventures website. It keeps the agreed visual direction: dark navy navigation, bright gold CTAs, soft blue/lilac hero, large AccuNumbo logo, experiential learning cards, adventures, teacher space, feedback and a connected login/dashboard starter.

## Files
- `index.html` — home page
- `adventures.html` — Adventure 1 + starter game + games/simulations sections
- `teachers.html` — educator page
- `feedback.html` — feedback form
- `login.html` — signup/login
- `dashboard.html` — authenticated student dashboard
- `styles.css` — shared design system
- `server.js` — Express server + SQLite API
- `package.json` — Node dependencies and start script
- `accunumbo-logo.png` — brand logo
- `DATABASE_PLAN.md` — future production data plan
- `DEPLOYMENT.md` — deployment checklist

## Local run
1. Install Node.js 20+.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:10000`.

## Render
Use a Node Web Service connected to this repository.
- Build Command: `npm install`
- Start Command: `npm start`
- No Root Directory / no `src` directory is required.
- Optional environment variable: `JWT_SECRET` = a strong random secret.

The important fix in this restart is that `index.html`, `styles.css`, `server.js` and the logo all live in the repository root, so the server never looks for `src/index.html`.
