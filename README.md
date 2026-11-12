# 🏨 SereneStay – Hotel Booking Application

## Project Overview

SereneStay is a full-stack hotel booking application that allows users to explore accommodations, make reservations, manage bookings, and save their favourite hotels.

The application also includes an admin panel for managing accommodations, reservations, and users.

## Technologies Used

**Frontend**
- React.js
- TypeScript
- CSS
- React Router

**Backend**
- Node.js
- Express.js
- TypeScript

**Database**
- PostgreSQL

**Other Integrations**
- OAuth – User authentication
- Payment Gateway – Online payments
- Maps – Hotel locations

## Features

### 1. User Authentication
- Register and log in using OAuth.
- Secure user authentication.
- Log out of the application.

### 2. Accommodation Listings
- View available hotels and accommodations.
- View hotel images and photo galleries.
- View hotel locations on a map.
- View prices, addresses, and star ratings.
- View hotel facilities and policies.
- View more details about accommodations.
- Share hotel information.
- Add or remove hotels from favourites.

### 3. Booking Management
- Select check-in and check-out dates.
- Choose the number of rooms and guests.
- Make hotel reservations.
- View booking details.
- Manage existing bookings.

### 4. Payments
- Make secure online payments.
- View payment information.
- Receive booking confirmation after successful payment.

### 5. User Profile
- View and update personal information.
- View booking history.
- Manage favourite accommodations.

### 6. Admin Panel
- Admin authentication.
- Add new accommodations.
- View all accommodations.
- Update hotel information, prices, and availability.
- Delete accommodations.
- View and manage reservations.
- Approve, modify, or cancel bookings.
- Manage room types and capacity.

## UI/UX Design

The application provides a simple, responsive, and user-friendly interface.

**Main UI Components**
- Navigation bar / Sidebar
- Home page
- Login and registration pages
- Accommodation listing page
- Hotel details page
- Photo gallery
- Search and filter components
- Booking form
- Payment page
- Favourites page
- User profile page
- Admin dashboard
- Reservation management page
- Accommodation management forms
- Footer

The interface is designed to support both desktop and mobile devices.

## CRUD Operations

The application supports the following operations:

| Operation | Description |
|---|---|
| Create | Add accommodations and create bookings |
| Read | View hotels, bookings, and user information |
| Update | Edit hotel details, profiles, and reservations |
| Delete | Remove accommodations and cancel or delete reservations |

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/VutlhariMD/Hotel_Application.git
```

### 2. Navigate to the project

```bash
cd Hotel_Application
```

### 3. Install dependencies

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

### 4. Configure environment variables

Create a `.env` file in the backend directory (see `backend/.env.example`).

For the frontend, copy `frontend/.env.example` if you need to override the API URL. Locally you can leave `VITE_API_URL` empty — Vite proxies `/api` to `http://localhost:5000`.

### 5. Run the application

```bash
npm run dev
```

The frontend and backend will run on their configured local ports.

## Deployment (Vercel + Render)

**Backend (Render)** — set these environment variables:

| Variable | Example |
|---|---|
| `DATABASE_URL` | your Postgres connection string |
| `JWT_SECRET` | a strong secret |
| `CLIENT_URL` | `https://your-app.vercel.app` (comma-separate multiple frontends) |
| `API_URL` | `https://hotel-application-backend-yd7r.onrender.com` |
| Stripe / Google keys | as needed |

**Frontend (Vercel)** — deploy the `frontend` folder. Production builds use `frontend/.env.production`, which points at:

`https://hotel-application-backend-yd7r.onrender.com`

Override with `VITE_API_URL` in the Vercel project settings if the backend URL changes. Redeploy after changing env vars so Vite can bake them into the build.

## Project Goal

The goal of SereneStay is to provide a convenient hotel booking platform where users can search for accommodations, make reservations, and manage their bookings, while administrators can efficiently manage hotel information and reservations.


