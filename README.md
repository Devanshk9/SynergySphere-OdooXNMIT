# SynergySphere - Advanced Team Collaboration Platform

## Overview

SynergySphere is a comprehensive team collaboration platform designed to streamline project management, task tracking, team communication, and resource coordination. Built with a modern tech stack, it provides both desktop and mobile-ready interfaces for seamless collaboration.

## Problem Statement Addressed

SynergySphere addresses key pain points experienced by teams:

- **Scattered Information**: Centralized hub for files, chats, and decisions
- **Unclear Progress**: Real-time task and project status visibility
- **Resource Confusion**: Clear task assignments and team coordination
- **Deadline Surprises**: Proactive task tracking with due dates
- **Communication Gaps**: Threaded discussions and project-specific communication

## Features

### Core Functionality

1. **User Authentication**
   - Secure login/registration system
   - JWT-based authentication
   - Password management

2. **Project Management**
   - Create and manage projects
   - Project status tracking (active, completed, on hold, archived)
   - Project-specific dashboards

3. **Task Management**
   - Create, edit, and delete tasks
   - Task status tracking (todo, in progress, done, blocked)
   - Due date management with overdue indicators
   - Task assignment (foundation ready for team expansion)

4. **Team Communication**
   - Project-specific threaded discussions
   - Real-time messaging system
   - Team member management

5. **User Profile & Settings**
   - Personal task overview
   - Profile management
   - Password change functionality

6. **Notification System**
   - Real-time notifications
   - Notification bell with unread count
   - Mark as read functionality

7. **Responsive Design**
   - Mobile-first approach
   - Desktop and tablet optimized
   - Touch-friendly interfaces

## Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hot Toast** - Notification system
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool

### Backend
- **Node.js** with **Express** - Server framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin requests

## Project Structure

```
SynergySphere-OdooXNMIT/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── TaskCreationModal.jsx
│   │   │   ├── TaskDetailModal.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   └── Home.jsx
│   │   ├── context/        # React context
│   │   │   └── AuthContext.jsx
│   │   ├── services/       # API services
│   │   │   └── api.js
│   │   ├── App.jsx         # Main application component
│   │   ├── main.jsx        # Application entry point
│   │   └── index.css       # Global styles
│   ├── package.json
│   └── vite.config.js
└── server/                 # Backend Node.js application
    ├── routes/             # API routes
    │   ├── auth.routes.js
    │   ├── projects.routes.js
    │   ├── tasks.routes.js
    │   ├── threads.routes.js
    │   ├── messages.routes.js
    │   ├── notifications.routes.js
    │   ├── members.routes.js
    │   └── users.routes.js
    ├── middleware/         # Express middleware
    │   └── auth.js
    ├── db.js              # Database connection
    ├── server.js          # Server entry point
    └── package.json
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile
- `PATCH /auth/password` - Change password

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Tasks
- `GET /projects/:projectId/tasks` - List project tasks
- `POST /projects/:projectId/tasks` - Create new task
- `GET /tasks/:taskId` - Get task details
- `PATCH /tasks/:taskId` - Update task
- `DELETE /tasks/:taskId` - Delete task
- `GET /me/tasks` - Get user's assigned tasks

### Communication
- `GET /projects/:projectId/threads` - List discussion threads
- `POST /projects/:projectId/threads` - Create new thread
- `GET /threads/:threadId/messages` - List thread messages
- `POST /threads/:threadId/messages` - Post new message

### Notifications
- `GET /notifications` - List user notifications
- `PATCH /notifications/:id/read` - Mark notification as read
- `POST /notifications/read-all` - Mark all as read

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env file with:
   PORT=5001
   JWT_SECRET=your_secret_key
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=synergysphere
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   ```

4. Set up the database:
   ```bash
   node setup-db.js
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage Guide

### Getting Started
1. **Register**: Create a new account or login with existing credentials
2. **Dashboard**: View your projects overview and stats
3. **Create Project**: Use the "New Project" button to create your first project
4. **Add Tasks**: Within each project, create and manage tasks
5. **Team Communication**: Use the discussions tab for project-specific communication
6. **Notifications**: Stay updated with the notification bell in the navigation

### Mobile Usage
- Optimized for touch interactions
- Responsive design adapts to screen sizes
- Easy navigation with mobile-friendly buttons
- Swipe and tap gestures supported

## Key Features Detail

### Responsive Design
- **Mobile-first approach**: Designed primarily for mobile usage
- **Desktop enhancement**: Rich desktop experience with additional features
- **Touch optimization**: 44px minimum touch targets for iOS compliance
- **Fluid layouts**: CSS Grid and Flexbox for responsive layouts

### Task Management
- **Status tracking**: Visual indicators for task progress
- **Due date management**: Color-coded overdue indicators
- **Quick actions**: Update task status with dropdown menus
- **Detailed views**: Comprehensive task editing modals

### Real-time Features
- **Instant notifications**: Get notified of important events
- **Live updates**: Dynamic content updates without page refresh
- **Responsive feedback**: Toast notifications for user actions

### Security
- **JWT Authentication**: Secure token-based authentication
- **Password hashing**: bcrypt for secure password storage
- **Protected routes**: Frontend route protection
- **Input validation**: Server-side input validation

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License
This project is licensed under the MIT License.

## Support
For support, please contact [your-email] or create an issue in the repository.

---

**SynergySphere** - Orchestrate Operations. Accelerate Growth.
