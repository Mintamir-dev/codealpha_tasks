# Buna Market - E-commerce Store (CodeAlpha Task 1)

Frontend: HTML, CSS, JavaScript | Backend: Node.js + Express.js

## Run it
1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` and edit it: set ADMIN_KEY and YOUR bank/Telebirr details.
3. Run:
   npm install
   npm start
4. Shop: http://localhost:3000  |  Admin: http://localhost:3000/admin.html

## How ordering works
1. Customer adds products to the cart.
2. At checkout the customer sees where to send the money, pays, and uploads a screenshot.
3. The server refuses the order if the screenshot is missing or any input is invalid.
4. Order is saved as "Pending verification". You open the admin page, look at the screenshot,
   and click Confirm payment or Reject (rejecting gives the stock back).

## Validation
- Name 2-60 letters, Ethiopian phone number, address 5-200 chars, optional reference 4-30 chars
- Cart items and quantities (1-20) checked; prices and stock are always calculated on the server
- Screenshot: JPG/PNG/WEBP only, max 5 MB, checked by real file bytes, saved with a random name
- Checks run in the browser (fast feedback) AND on the server (the real protection)

## Security
helmet headers + strict CSP, rate limit on orders (10 per 15 min), admin API protected by key,
screenshots are NOT public (only the admin API can read them).

## Structure
server.js                 starts the server
src/app.js                Express setup and middleware
src/config.js             settings from .env
src/routes/               URL -> controller
src/controllers/          handle request/response
src/services/             order logic and storage
src/middleware/           validators, upload, admin auth, error handler
public/                   pages, css/, js/
data/orders.json          created on first order
uploads/                  payment screenshots (private)
