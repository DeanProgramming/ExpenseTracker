# Expense Tracker

## Overview

**Expense Tracker** is a full-stack web application built with **.NET 9.0** and **ASP.NET MVC**, designed to help users record and manage their spending with ease. Users can create, edit, and delete expense entries, while the dashboard provides a clear monthly breakdown using **Chart.js** pie charts—including a smooth, live-updating view of each month’s category spend and an **average monthly** category chart.  

The project uses **SQL Server** for persistence, includes a secure **login system (ASP.NET Identity)**, and is fully deployed on **Azure**.

## Project URL
Visit the live site here: [Expense Tracker](https://expensetracker-deanh.azurewebsites.net/)

## Features

- **Secure Authentication & User Accounts:** Users can sign in and manage expenses tied to their account using **ASP.NET Identity**.

- **Full Expense Management (CRUD):**  
  - Add new expenses  
  - Edit existing expenses  
  - Remove expenses  

- **Monthly Chart Dashboard (Chart.js):**
  - **Monthly pie charts** showing expense totals per category
  - **Average monthly pie chart** showing average spend per category across available months
  - **Smooth live updates** as expenses are added/edited/deleted (no full-page refresh required)

- **Interactive Monthly Editing Panel:**
  - Select a month and instantly view/edit that month’s transactions
  - Quickly create new entries from within the month view
  - Delete flow includes a short confirm step to prevent accidental removal

- **Demo / Seed Data Regeneration (Optional):**
  - Seed logic can regenerate demo data when stale
  - Includes a cooldown mechanism to prevent repeated manual regeneration requests

## System Architecture
The Expense Tracker follows a clean, layered structure:

1. **Presentation Layer**
   - ASP.NET MVC Views (Razor)
   - Client-side JavaScript for smooth UX and chart updates
   - Chart.js for interactive visualization

2. **Application Layer**
   - Controllers handle routing, validation, and orchestration
   - Services encapsulate business workflows (e.g., seeding / regeneration)

3. **Data Layer**
   - Entity Framework Core (EF Core) for data access
   - SQL Server for persistence
   - Identity tables for authentication and user management
