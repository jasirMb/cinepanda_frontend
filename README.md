Skip to content
jasirMb
cinepanda_frontend
Repository navigation
Code
Issues
Pull requests
Actions
Projects
Security
Insights
Settings
Files
Go to file
t
README.md
cinepanda_frontend
/
README.md
in
main

Edit

Preview

Show Diff
CinePanda Admin System Frontend

Frontend admin dashboard for managing CinePanda's home theater installation business operations. This application provides an intuitive interface for managing leads, quotations, projects, financial ledger entries, and business analytics.

Features Leads Management

View and manage customer enquiries

Lead filtering, searching, and pagination

Update lead status and follow-ups

Track next call schedules

Quotations Management

Create and manage quotations

Add multiple quotation items

View quotation details

Download generated quotation PDFs

Projects Management

Track installation project lifecycle

Monitor project status

Manage project details and timelines

Organization Ledger

Track income and expenses

Filter ledger entries by date and type

Associate entries with projects

Dashboard Overview

Business analytics and metrics

Quick insights on projects and revenue

Activity overview

Authentication

Secure admin login

JWT token-based session management

Protected routes

Technology Stack

Frontend Framework

Next.js (React Framework)

Language

TypeScript

Styling

TailwindCSS

State Management

React Context / Hooks

HTTP Client

Axios

Forms & Validation

React Hook Form

Routing

Next.js App Router

Installation

Clone the repository

git clone

Install dependencies

npm install

Copy environment variables

cp .env.example .env

Configure environment variables

NEXT_PUBLIC_API_URL=http://localhost:5000/api

Run development server

npm run dev

Application will start at

http://localhost:3000 Build for Production npm run build npm start Project Structure src │ ├── app │ ├── dashboard │ ├── leads │ ├── quotations │ ├── projects │ ├── ledger │ └── login │ ├── components │ ├── ui │ ├── forms │ ├── tables │ └── layout │ ├── services │ ├── api.ts │ ├── auth.service.ts │ ├── leads.service.ts │ ├── quotations.service.ts │ ├── projects.service.ts │ └── ledger.service.ts │ ├── hooks │ └── custom hooks │ ├── context │ └── auth context │ ├── types │ └── TypeScript interfaces │ └── utils └── helper functions API Integration

The frontend communicates with the CinePanda Backend API.

All requests include the JWT token:

Authorization: Bearer

Example API request

axios.get("/api/leads", { headers: { Authorization: Bearer ${token} } }) Authentication Flow

Admin logs in using credentials

Backend returns a JWT token

Token is stored in localStorage

All protected API requests include the token

Token expires after 7 days

Environment Variables

Create .env file:

NEXT_PUBLIC_API_URL=http://localhost:5000/api

Example production value:

NEXT_PUBLIC_API_URL=https://api.cinepanda.com/api UI Pages Login

Admin authentication page.

Dashboard

Business overview with metrics and project summaries.

Leads

Create and manage leads

Search and filter leads

Track follow-ups

Quotations

Create quotations

Manage quotation items

Download quotation PDF

Projects

Track project lifecycle

Update project status

Ledger

Track income and expenses

Filter financial records

Error Handling

Frontend handles API errors with consistent UI feedback.

Common scenarios handled:

Authentication errors

Validation errors

API failures

Network errors

Example response handling

try { const res = await api.get("/leads"); } catch (error) { toast.error("Failed to fetch leads"); } Development

Start development server

npm run dev

Lint code

npm run lint

Build production

npm run build Deployment

The frontend can be deployed using:

Vercel

Netlify

Docker

Any Node hosting provider

Recommended: Vercel for Next.js apps

Future Improvements

Role-based admin permissions

Real-time notifications

Advanced analytics dashboard

Mobile responsive improvements

Multi-admin support

Copied!
