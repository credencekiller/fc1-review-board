# FC-1 Review Board

Students rate the daily meals at FC-1 and see charts of which dishes are liked.

## Run
1. Install Node.js
2. `npm install`
3. `node server.js`
4. Open http://localhost:3000

Admin login: admin@fc1.com / admin123 (can add the daily menu). Anyone else signs up as a student.

## How it works
- public/ = pages the user sees (HTML, CSS, JS)
- server.js = backend with all the API routes (Express)
- fc1.db = SQLite database, created on first run (users, menu, ratings, comments)
- Login gives a JWT token, the browser sends it with every request
