# The Power Gym - Management & Fitness System

A full-stack gym management web application built with **HTML5, Vanilla CSS, Python (Flask), and SQL (SQLite / PostgreSQL)** with persistent cloud-ready data storage, customized member & trainer profiles, Indian UPI QR payment integration, and separated staff and member portals.

---

## Key Credentials & System Details

- **Gym Name**: The Power Gym
- **Merchant UPI ID**: `gopinath71845@oksbi` (GPay / PhonePe / Paytm / BHIM)
- **Staff Master Security Key**: `ASDFGF123456*` (Required to unlock Staff Portal and access Staff Console)
- **Server Address**: `http://127.0.0.1:5000`

### Demo Login Accounts (Pre-Seeded)
1. **Member / Customer Portal**:
   - URL: `http://127.0.0.1:5000/login`
   - Username: `rahul`
   - Password: `rahul123`
2. **Staff / Administration Console**:
   - URL: `http://127.0.0.1:5000/staff/login`
   - Username: `admin`
   - Password: `admin123`
   - Server Security Key: `ASDFGF123456*`

---

## Deployment & Hosting Fixes

### 1. Fix for "No index.html file" Error
- **Cause**: Static hosting platforms (such as Netlify, Surge, or GitHub Pages) require an `index.html` file at the root of the project.
- **Solution Provided**: A complete, self-contained `index.html` is now placed at the project root (`index.html`) and inside the `public/` directory (`public/index.html`). It includes all membership tiers, trainer showcases, Indian UPI payment details, and BMI calculations without requiring any server configuration.

### 2. Fix for "500 FUNCTION_INVOCATION_FAILED" Error
- **Cause**: Serverless cloud platforms like Vercel fail when deploying Python WSGI applications without a configured `vercel.json` routing configuration or when attempting to write SQLite databases in read-only serverless environments.
- **Solution Provided**:
  - `vercel.json` has been added with proper WSGI routing mapping requests directly to `wsgi.py`.
  - Configurable `DATABASE_URL` environment variable support allows seamless connection to remote cloud PostgreSQL (e.g., Supabase, Neon, Railway) while defaulting to local SQLite for development.

---

## Payment System (Online & Offline)

1. **Online UPI QR Payment**:
   - Direct integration with merchant UPI ID `gopinath71845@oksbi`.
   - Dynamic NPCI-compliant UPI QR generator (`/api/upi-qr?amount=...`) that automatically embeds the exact plan price (`₹999`, `₹2,499`, `₹4,499`, `₹7,999`) or custom advance amount.
   - When scanned with Google Pay, PhonePe, or Paytm, the amount is pre-filled without manual typing.
   - Members submit the 12-digit Bank UTR and optional receipt image (stored securely on the local server in `static/uploads/`).
2. **Offline Front Desk Payment**:
   - Members can choose "Front Desk Cash" to generate an official Offline Cash Voucher slip.
   - Staff administrators can directly verify vouchers or record in-person cash payments at the reception counter to activate memberships instantly.

---

## Separation of Portals

1. **Customer / Member Portal**:
   - Registration with Full Name, Username, Email, Phone, Password, and Confirm Password.
   - Dedicated dashboard displaying active membership status, end date, assigned coach, and BMI calculator.
   - Profile customization: update height, weight, fitness goal, emergency contact, and upload personal avatar to the local server.
   - Trainer selection: view detailed trainer bios, specialties, experience, and assign personal mentors.
   - Payment history table tracking real-time approval status (Pending / Approved / Rejected).
2. **Staff / Admin Console**:
   - Protected with 3-factor verification: Username/Email, Password, and Server Key `ASDFGF123456*`.
   - Staff registration (`/staff/register`) for onboarding new gym employees.
   - Financial overview: total approved revenue in INR (₹) and pending transaction queues.
   - Member management: view all member details, membership expiration dates, and toggle active/suspended account statuses.
   - Trainer management: add new certified coaches with custom photo uploads, specialties, hourly fees, and bios.
   - In-person cash recording: collect cash at the desk and immediately activate member plans.

---

## How to Run Locally

### Option A: One-Click Automatic Launch (Recommended)
1. Double-click [run.bat](file:///c:/pr%20try%20gym/idle/New%20folder/run.bat).
2. The script will automatically open a Command Prompt window, check Python, install any missing dependencies, initialize the SQL database, start the server on `http://127.0.0.1:5000`, and open your default web browser automatically.

### Option B: Manual Terminal Execution
Open your Command Prompt or VS Code Terminal in this folder and run:
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python app.py
```
Then visit `http://127.0.0.1:5000` in your web browser.

---

## Downloadable ZIP Archive

A standalone zip archive containing all files, database, images, and run scripts has been generated:
- File: [the_power_gym.zip](file:///c:/pr%20try%20gym/idle/New%20folder/the_power_gym.zip)
