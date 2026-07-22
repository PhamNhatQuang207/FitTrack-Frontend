# FitTrack Frontend 💪

A modern, full-featured fitness tracking web application built with **React 19** and **Tailwind CSS**, designed to help users plan, track, and monitor their fitness progress with an intuitive user interface.

## 📋 Overview

**FitTrack** is a comprehensive fitness tracking platform that enables users to:
- Create and manage personalized workout plans
- Build weekly exercise schedules
- Track daily workout progress
- Monitor body metrics and fitness improvements
- Access a library of pre-built workout templates
- View detailed workout history and analytics

---

## 🛠️ Tech Stack

### Core Framework
- **React** v19.1.0 - UI library
- **React Router DOM** v7.11.0 - Client-side routing
- **React DOM** v19.1.0 - DOM rendering

### Styling & UI
- **Tailwind CSS** v3.4.1 - Utility-first CSS framework
- **PostCSS** v8.5.3 - CSS transformations
- **Autoprefixer** v10.4.21 - CSS vendor prefixing
- **Lucide React** v0.562.0 - Icon library

### API & State Management
- **Axios** v1.13.2 - HTTP client for API calls
- **React Context API** - Global state management (Authentication)

### Charts & Data Visualization
- **Recharts** v3.6.0 - Data visualization components

### Development & Testing
- **React Scripts** v5.0.1 - Build and development tools
- **Testing Library** - Testing utilities
  - @testing-library/react v16.3.0
  - @testing-library/jest-dom v6.6.3
  - @testing-library/user-event v13.5.0
  - @testing-library/dom v10.4.0

### Build & Deployment
- **Create React App** - Project scaffolding and build tool
- **Vercel** - Deployment platform (vercel.json configured)

---

## 📁 Project Structure

```
src/
├── api/
│   ├── axiosClient.js           # Axios HTTP client with JWT interceptors
│   ├── axios.js                 # Axios instance configuration
│   └── index.js                 # Centralized API service functions
│
├── components/
│   ├── ErrorBoundary.jsx        # Error boundary for error handling
│   └── ProtectedRoute.jsx       # Route protection wrapper
│
├── context/
│   └── AuthContext.jsx          # Global authentication state & provider
│
├── hooks/
│   └── useAuth.js               # Custom hook for auth context
│
├── pages/
│   ├── Login.jsx                # User login page
│   ├── Register.jsx             # User registration page
│   ├── VerifyEmail.jsx          # Email verification page
│   ├── ResetPassword.jsx        # Password reset functionality
│   ├── Dashboard.jsx            # Main dashboard view
│   ├── Profile.jsx              # User profile management
│   ├── WorkoutPlanning.jsx      # Workout plan creation
│   ├── WeeklyPlanBuilder.jsx    # Weekly schedule builder
│   ├── WeeklyPlanLibrary.jsx    # Pre-built workout templates
│   ├── WeeklyCalendar.jsx       # Weekly schedule view
│   ├── ActiveWorkout.jsx        # Live workout tracking
│   ├── ProgressTracking.jsx     # Progress analytics & metrics
│   └── WorkoutHistory.jsx       # Historical workout logs
│
├── assets/
│   └── icons/muscle/            # Custom muscle group icons
│
├── App.js                       # Main App component with routing
├── App.css                      # Global App styles
├── index.js                     # React DOM entry point
├── index.css                    # Global styles
│
├── public/
│   ├── index.html               # HTML template
│   ├── manifest.json            # PWA manifest
│   └── robots.txt               # SEO robots configuration
│
└── build/                       # Production build output
```

---

## ✨ Features

### Authentication & Security
- **User Registration** - Create new account with email verification
- **Login/Logout** - Secure JWT token-based authentication
- **Email Verification** - Token-based email verification system
- **Password Reset** - Forgot password functionality with token validation
- **Protected Routes** - Route guards preventing unauthorized access
- **JWT Tokens** - Secure API communication with automatic token management

### Workout Management
- **Workout Planning** - Create and customize personal workout plans
- **Weekly Plan Builder** - Design custom weekly exercise schedules
- **Workout Library** - Browse and select from pre-built workout templates
- **Active Workouts** - Real-time workout tracking during exercise sessions
- **Workout History** - View past workouts with detailed logs and stats

### Progress Tracking
- **Progress Dashboard** - Visual overview of fitness journey
- **Progress Metrics** - Track weight, body metrics, and performance indicators
- **Progress Charts** - Historical data visualization using Recharts
- **Performance Analytics** - Detailed insights into fitness improvements

### User Experience
- **Weekly Calendar** - Visual weekly schedule management
- **User Profile** - Manage personal information and preferences
- **Responsive Design** - Mobile-first, fully responsive UI
- **Error Boundaries** - Graceful error handling and recovery
- **Server Health Monitoring** - Automatic backend connectivity checks

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Backend API running (see FRONTEND_SETUP.md for configuration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fittrack/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in project root
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start development server**
   ```bash
   npm start
   ```
   
   The app will automatically open at [http://localhost:3000](http://localhost:3000)

---

## 📦 Available Scripts

### Development
```bash
npm start          # Start development server with hot reload
npm test           # Run tests in watch mode
```

### Production
```bash
npm run build      # Create optimized production build
```

### Advanced
```bash
npm eject          # Eject from Create React App (⚠️ irreversible)
```

---

## 🔌 API Integration

### Base Configuration
- **Base URL**: `http://localhost:5000/api`
- **Authentication**: JWT token in Authorization header
- **Request/Response**: JSON

### Axios Configuration (src/api/axiosClient.js)
- **Request Interceptor**: Automatically adds JWT token to all requests
- **Response Interceptor**: Handles 401 errors and redirects to login
- **Global Error Handling**: Centralized error management

### API Services (src/api/index.js)

#### Authentication
```javascript
authAPI.register(userData)      // Register new user
authAPI.login(credentials)      // Login with email/password
authAPI.logout()                // Clear session
```

#### User Management
```javascript
userAPI.getProgress()           // Fetch user progress data
userAPI.updateProgress(data)    // Update body metrics/progress
```

#### Workout Operations
```javascript
workoutAPI.getWorkouts()        // Fetch all user workouts
workoutAPI.logWorkout(data)     // Log new workout session
```

---

## 🔐 Authentication System

### AuthContext (src/context/AuthContext.jsx)
Global authentication state management providing:

**State**
- `user` - Current authenticated user object
- `loading` - Loading state during initialization
- `isAuthenticated` - Boolean auth status

**Methods**
- `login(credentials)` - Authenticate user
- `register(userData)` - Create new account
- `logout()` - Sign out user
- `updateUser(updates)` - Update user profile locally

### Using Authentication

**Hook-based approach (Recommended)**
```javascript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
    const { user, login, logout, isAuthenticated, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!isAuthenticated) return <div>Please login</div>;
    
    return <div>Welcome, {user.name}!</div>;
}
```

### Protected Routes
```javascript
import ProtectedRoute from '../components/ProtectedRoute';

<Route
    path="/dashboard"
    element={
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    }
/>
```

---

## 🗺️ Application Routes

| Route | Component | Access | Purpose |
|-------|-----------|--------|---------|
| `/` | Login | Public | Main login page |
| `/login` | Login | Public | User login |
| `/register` | Register | Public | User registration |
| `/verify-email/:token?` | VerifyEmail | Public | Email verification |
| `/reset-password/:token?` | ResetPassword | Public | Password reset |
| `/dashboard` | Dashboard | Protected | Main dashboard |
| `/profile` | Profile | Protected | User profile management |
| `/workout-planning` | WorkoutPlanning | Protected | Workout plan creation |
| `/weekly-planning/:id?` | WeeklyPlanBuilder | Protected | Weekly schedule builder |
| `/weekly-plan-library` | WeeklyPlanLibrary | Protected | Workout template library |
| `/weekly-schedule` | WeeklyCalendar | Protected | Weekly calendar view |
| `/workout-history` | WorkoutHistory | Protected | Past workouts |
| `/progress-tracking` | ProgressTracking | Protected | Analytics & progress |
| `/active-workout` | ActiveWorkout | Protected | Live workout tracking |

---

## 🎨 Component Architecture

### Page Components
- **Dashboard** - Central hub with overview and navigation
- **Login/Register** - Authentication forms with validation
- **VerifyEmail** - Email confirmation flow
- **ResetPassword** - Password recovery mechanism
- **Profile** - User settings and personal info
- **WorkoutPlanning** - Workout creation interface
- **WeeklyPlanBuilder** - Schedule design and customization
- **WeeklyPlanLibrary** - Browse and select templates
- **WeeklyCalendar** - Schedule visualization
- **ActiveWorkout** - Live tracking and monitoring
- **ProgressTracking** - Visualizations and analytics
- **WorkoutHistory** - Historical records

### Reusable Components
- **ProtectedRoute** - Route authentication wrapper
- **ErrorBoundary** - Error handling wrapper

---

## 🌐 Deployment

### Vercel Deployment
The project is configured for **Vercel** deployment with `vercel.json`:

```bash
npm run build    # Create production build
# Push to Vercel for automatic deployment
```

**Environment Variables** on Vercel:
- `REACT_APP_API_URL` - Backend API endpoint

---

## 📊 Build Information

- **Build Output**: `./build/` directory
- **Build Size**: Production-optimized bundle with code splitting
- **Browser Support**: Latest versions of Chrome, Firefox, Safari, Edge
- **Mobile Support**: Fully responsive on all devices

---

## 🔧 Development Workflow

1. Start development server: `npm start`
2. Make changes to components in `src/`
3. Changes auto-reload in browser
4. Test using: `npm test`
5. Build for production: `npm run build`
6. Deploy to Vercel (or your hosting provider)

---

## 📚 Additional Documentation

See [FRONTEND_SETUP.md](FRONTEND_SETUP.md) for:
- Detailed API configuration
- Authentication implementation details
- Next steps for full backend integration

---

## 📄 License

This project is part of the FitTrack fitness tracking platform developed for ULille.

---

## 👥 Support

For issues, feature requests, or questions, please contact the development team.
