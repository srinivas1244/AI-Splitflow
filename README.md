# 💸 SplitFlow

<div align="center">

### AI-Powered Expense Splitting Platform

Built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Supabase**, and **Groq AI**

Production-grade expense management platform that combines modern SaaS design with AI-powered automation, intelligent expense processing, advanced splitting algorithms, and transparent financial tracking.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)
![Groq](https://img.shields.io/badge/Groq-AI-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## ✨ Overview

SplitFlow is a modern, AI-enhanced expense management platform inspired by Splitwise and designed for real-world group finance management.

The platform enables users to:

* Track shared expenses
* Manage friend networks
* Create and organize groups
* Split expenses using advanced algorithms
* Automate expense creation using AI
* Scan receipts with computer vision
* Monitor balances and settlements
* Export professional financial ledgers

Built using scalable architecture, secure database policies, and production-ready engineering practices.

---

## 🚀 What Makes SplitFlow Different?

Unlike traditional expense-splitting applications, SplitFlow combines:

* 🤖 AI Receipt Understanding
* 💬 Conversational Expense Creation
* 🧮 Multiple Advanced Split Methods
* 📝 Immutable Activity Logs
* 📊 Professional Financial Ledger Exports
* ⚡ Modern Full-Stack Architecture
* 🔒 Row Level Security (RLS)

The project focuses on solving real-world shared finance problems using AI and cloud-native technologies.

---

## 🎥 Demo

### Core Workflows

* AI Receipt Scanning
* AI Expense Assistant
* Group Expense Management
* Advanced Expense Splitting
* Settlement Tracking
* Financial Ledger Export

> Add screenshots, GIFs, or deployment links here.

---

# ✨ Features

## 🔐 Authentication & User Management

* Secure authentication with Supabase Auth
* User profiles with unique Split IDs
* Friend request system
* Real-time user search
* Protected routes and sessions
* Group-based collaboration

---

## 👥 Smart Group Management

* Create and manage groups
* Invite and manage members
* Role-based permissions
* Group balance calculations
* Settlement recommendations
* Expense visibility controls

---

## 💰 Advanced Expense Management

* Create expenses with detailed metadata
* Multi-currency support
* Expense attachments
* Categorized spending
* Expense editing and deletion
* Complete expense history tracking

---

## 🧾 AI Receipt Scanner

Powered by **Groq Llama 4 Scout Vision**

### Features

* Upload receipt images
* Automatic total extraction
* Merchant detection
* Smart category prediction
* Itemized expense extraction
* Auto-populate expense forms
* File validation and protection

### Validation

* Blocks unsupported formats
* Prevents oversized uploads
* Handles errors gracefully
* Protects against malformed files

### Example

Upload a restaurant receipt and SplitFlow automatically extracts:

* Total Amount
* Merchant Name
* Expense Category
* Line Items

---

## 💬 AI Expense Assistant

SplitFlow includes a conversational AI agent capable of taking actions inside the application.

### Example Commands

```text
Add a ₹500 Uber expense for Goa Trip
```

```text
Create a restaurant expense for ₹1200
```

### What the AI Does

* Understands intent
* Extracts structured data
* Triggers application workflows
* Opens pre-filled forms
* Reduces manual entry

---

## 🧮 Advanced Splitting Algorithms

### Equal Split

Divide expenses equally among all participants.

### Percentage Split

Examples:

* 60% / 40%
* 50% / 30% / 20%

Validation ensures totals equal 100%.

### Share-Based Split

Examples:

* Couple = 2 shares
* Single = 1 share

Weighted expense distribution based on shares.

### Itemized Split

Assign specific receipt items to individual members.

Perfect for:

* Group dinners
* Grocery bills
* Travel expenses
* Shared purchases

---

## 📝 Discussion & Activity Timeline

Every expense contains a transparent activity history.

Track:

* Expense creation
* Expense modifications
* Settlements
* Comments
* Member actions

Provides accountability, transparency, and auditability.

---

## 📊 Financial Ledger Export

Generate professional CSV financial reports.

### Group Financial Summary

Includes:

* Total spent
* Total paid
* Total owed
* Net balances

### Complete Expense Ledger

Includes:

* Expense history
* Categories
* Participants
* Settlement records

### Debt Simplification Engine

Automatically calculates optimal settlement paths.

Example:

```text
John → ₹500 → Sarah
```

instead of displaying multiple unnecessary transactions.

---

## 🤖 AI-Powered Automation

Built using Groq AI models.

Capabilities include:

* Receipt understanding
* Expense extraction
* Conversational actions
* Smart categorization
* Workflow automation
* Structured data generation

---

## 🏗️ Architecture

### Frontend

* Next.js 16 App Router
* React 19
* TypeScript
* Tailwind CSS v4
* Framer Motion

### Backend

* Supabase
* PostgreSQL
* Row Level Security (RLS)
* Database Functions (RPC)

### AI Layer

* Groq API
* Llama 4 Scout Vision
* Function Calling
* Structured Output Parsing

### Storage

* Supabase Storage

### Deployment

* Vercel
https://ai-splitflow.vercel.app/
---

## 🗄️ Database Design

### Core Tables

* profiles
* friendships
* groups
* group_members
* expenses
* expense_splits
* settlements
* expense_attachments
* expense_comments
* activity_logs

### Database Features

* UUID Primary Keys
* Foreign Key Constraints
* Optimized Indexes
* Row Level Security
* Audit Logging
* Aggregation Functions
* Debt Simplification Logic

---

## 📈 Engineering Highlights

* Built with strict TypeScript
* Implemented PostgreSQL Row Level Security
* Designed advanced debt simplification algorithms
* Developed AI function-calling workflows
* Integrated vision-based receipt understanding
* Created immutable audit logging architecture
* Generated financial reports using RPC aggregation functions
* Built scalable relational database architecture

---

## 🚀 Key Highlights

* AI Vision Receipt Processing
* Conversational AI Agent
* Advanced Expense Splitting Engine
* Activity Audit Trails
* Debt Simplification Algorithm
* CSV Financial Reporting
* Secure RLS Architecture
* Production-Ready TypeScript Codebase

---

## 📂 Project Structure

```text
src/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── friends/
│   │   ├── groups/
│   │   ├── expenses/
│   │   ├── profile/
│   │   └── settings/
│   │
│   └── auth/
│       └── callback/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── features/
│
├── lib/
│   ├── supabase/
│   ├── ai/
│   └── utils/
│
└── types/
```

---

## ⚙️ Local Development Setup

### Clone Repository

```bash
git clone https://github.com/yourusername/splitflow.git
cd splitflow
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

GROQ_API_KEY=

NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=
```

### Run Development Server

```bash
npm run dev
```

Application:

```text
http://localhost:3000
```

---

## 🛡️ Security Features

* Row Level Security (RLS)
* Secure Authentication
* Protected Routes
* User-Based Authorization
* Secure Storage Access
* Session Management
* Database Access Controls

---

## 🌐 Deployment

### Deploy on Vercel

```bash
git push origin main
```

Then:

1. Import Repository into Vercel
2. Add Environment Variables
3. Configure Production URLs
4. Deploy

---

## 🔮 Future Enhancements

* Spending Forecasting
* Budget Recommendations
* Realtime Collaboration
* Mobile PWA Support
* Push Notifications

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ using Next.js, React, TypeScript, Supabase and Groq AI

</div>


