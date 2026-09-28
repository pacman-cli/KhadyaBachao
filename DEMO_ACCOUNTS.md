# Khadya Bachao - Demo Accounts & Test Credentials

This document contains test accounts seeded into PostgreSQL via Flyway migration (`V12__seed_demo_data_and_users.sql`).

## Password & Authentication Rules

> **Important**: When running in local development mode (`app.firebase.enabled=false`), backend authentication uses **Dev Auth Mode**.
> - **Password**: Enter **any password** (e.g. `123456`, `password`, or `admin123`).
> - **Login Method**: Type the user's email in the login screen and tap **Sign In with Email** or **Bypass with Dev Login**. The backend identifies the user by email, retrieves their seeded role/data from PostgreSQL, and generates an authenticated JWT session token.

---

## Table of Contents

- [1. Admin Accounts (5)](#1-admin-accounts-5)
- [2. Donor Accounts (5)](#2-donor-accounts-5)
- [3. Recipient NGO Accounts (5)](#3-recipient-ngo-accounts-5)
- [4. Recipient Individual Accounts (5)](#4-recipient-individual-accounts-5)
- [5. Volunteer Accounts (5)](#5-volunteer-accounts-5)
- [6. Seeded Activities & Data Overview](#6-seeded-activities--data-overview)

---

## 1. Admin Accounts (5)

Use these accounts to test the **Admin & Moderation Console** (`AdminScreen.tsx`), including content moderation reports and organization verification approvals.

| Email | Name | Password | Verification Status | Primary Role |
| :--- | :--- | :--- | :--- | :--- |
| `admin1@khadyabachao.org` | Imran Admin (Lead) | *any* | Verified | `ADMIN` |
| `admin2@khadyabachao.org` | Sarah Moderation Admin | *any* | Verified | `ADMIN` |
| `admin3@khadyabachao.org` | Rafiq Operations Admin | *any* | Verified | `ADMIN` |
| `admin4@khadyabachao.org` | Nadia Verification Admin | *any* | Verified | `ADMIN` |
| `admin5@khadyabachao.org` | Tanvir System Admin | *any* | Verified | `ADMIN` |

---

## 2. Donor Accounts (5)

Use these accounts to post surplus food listings, manage claim requests, coordinate pickup schedules, and complete food handovers.

| Email | Name / Establishment | Password | Verified | Seeded Activity |
| :--- | :--- | :--- | :--- | :--- |
| `donor1@gmail.com` | Dhaka Bakers & Bakery | *any* | Yes | Active Bakery Pastry Listing (Gulshan) |
| `donor2@gmail.com` | Star Kabab & Restaurant | *any* | Yes | Active Biryani Listing (Dhanmondi) |
| `donor3@gmail.com` | Grand Sultan Kitchen | *any* | Yes | Active Claimed Dinner Buffet (Banani) |
| `donor4@gmail.com` | Agora Supershop Dhanmondi | *any* | No | Raw Rice & Oil Listing |
| `donor5@gmail.com` | Kazi Food Catering | *any* | Yes | Completed Catering Handover |

---

## 3. Recipient NGO Accounts (5)

Use these accounts to view available food listings, submit claims, chat in real-time with donors, and review organization verification state.

| Email | Organization Name | Password | Verification Status | Seeded Activity |
| :--- | :--- | :--- | :--- | :--- |
| `ngo1@ekmatra.org` | Ekmatra Society Relief | *any* | Approved | Active Claim & Chat for Grand Sultan Dinner |
| `ngo2@bidyanondo.org` | Bidyanondo Food Wing | *any* | Approved | Completed Pickup & 5-Star Rating |
| `ngo3@jaago.com.bd` | Jaago Foundation NGO | *any* | **PENDING** | Appears in Admin Verification Queue |
| `ngo4@shastho.org` | Shastho Relief Trust | *any* | **PENDING** | Appears in Admin Verification Queue |
| `ngo5@carebangladesh.org` | Care Hope Community | *any* | Approved | Active NGO Account |

---

## 4. Recipient Individual Accounts (5)

Use these accounts to test individual food claims, nearby search radius filters, and recipient flow.

| Email | Full Name | Password | Role |
| :--- | :--- | :--- | :--- |
| `indiv1@gmail.com` | Rahim Uddin | *any* | `RECIPIENT_INDIVIDUAL` |
| `indiv2@gmail.com` | Fatema Begum | *any* | `RECIPIENT_INDIVIDUAL` |
| `indiv3@gmail.com` | Kamal Hossain | *any* | `RECIPIENT_INDIVIDUAL` |
| `indiv4@gmail.com` | Rina Akter | *any* | `RECIPIENT_INDIVIDUAL` |
| `indiv5@gmail.com` | Sumon Chowdhury | *any* | `RECIPIENT_INDIVIDUAL` |

---

## 5. Volunteer Accounts (5)

Use these accounts to test food transportation, claiming on behalf of communities, and volunteer user flows.

| Email | Full Name | Password | Seeded Activity |
| :--- | :--- | :--- | :--- |
| `volunteer1@gmail.com` | Arif Youth Volunteer | *any* | Submitted Pending Claim for Biryani |
| `volunteer2@gmail.com` | Mehedi Hasan Volunteer | *any* | Active Volunteer |
| `volunteer3@gmail.com` | Nusrat Jahan Volunteer | *any* | Active Volunteer |
| `volunteer4@gmail.com` | Sakib Ahmed Volunteer | *any* | Active Volunteer |
| `volunteer5@gmail.com` | Tasnim Farhana Volunteer | *any* | Active Volunteer |

---

## 6. Seeded Activities & Data Overview

The Flyway migration (`V12__seed_demo_data_and_users.sql`) seeds the following relational data:

1. **Food Listings**:
   - `Cooked Mutton Biryani` (Dhanmondi, 30 servings, Available)
   - `Assorted Evening Pastries` (Gulshan, 15 kg, Available)
   - `Surplus Rice & Oil` (Agora Dhanmondi, 50 kg, Available)
   - `Dinner Buffet Chicken Curry` (Banani, 25 servings, Claimed by `ngo1@ekmatra.org`)
   - `Catering Surplus Polao` (Uttara, 40 servings, Completed & Rated 5 Stars)
   - `Unclaimed Sandwiches` (Expired)

2. **Real-time Chat & Schedule Negotiation**:
   - Active chat between `ngo1@ekmatra.org` and `donor3@gmail.com` regarding dinner buffet pickup at Banani Gate 2.
   - Agreed pickup schedule confirmed by both parties.

3. **Admin Moderation & Verification Queue**:
   - Open content abuse reports on listings and non-responding users for `admin1@khadyabachao.org` to review.
   - Pending organization verification requests for `Jaago Foundation` (`ngo3@jaago.com.bd`) and `Shastho Relief Trust` (`ngo4@shastho.org`).
