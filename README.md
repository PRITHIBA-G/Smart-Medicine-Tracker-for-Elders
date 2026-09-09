# Smart Medicine Tracker for Elders

A web-based medicine tracking and reminder system designed to help elderly patients manage their medications and enable caretakers to monitor and schedule medicine routines.

## Project Overview

The Smart Medicine Tracker provides a simple platform for patients and caretakers to manage medicine schedules.

Patients can register and log in, view their scheduled medicines, and update the status of medicines as taken. Caretakers can log in and schedule medicines for their linked patients.

The system also periodically checks scheduled medicines and automatically marks them as missed when they are not taken within the configured time.

## Features

- Patient registration and login
- Caretaker registration and login
- Patient-caretaker account linking
- Medicine scheduling
- View scheduled medicines
- Mark medicines as taken
- Automatically identify missed medicines
- Delete scheduled medicines
- Password hashing
- Automated background medicine status checking
- REST API-based backend

## Technology Stack

### Frontend

- HTML
- JavaScript

### Backend

- Python
- Flask
- Flask-CORS
- APScheduler

### Database

- MongoDB
- PyMongo

### Security

- Werkzeug password hashing

## Project Structure

Smart-Medicine-Tracker-for-Elders/
│
├── backend/
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── js/
│   │   ├── caretaker.js
│   │   ├── dashboard.js
│   │   ├── login.js
│   │   └── register.js
│   │
│   ├── caretaker.html
│   ├── dashboard.html
│   ├── index.html
│   └── register.html
│
└── .gitignore
