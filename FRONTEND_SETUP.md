# Frontend Setup - MERN Migration from Supabase

## ✅ Completed Setup

### 1. Dependencies Installed
- ✅ `axios` - HTTP client for API calls
- ✅ `lucide-react` - Icon library
- ✅ `react-router-dom` - Routing

### 2. Folder Structure Created

```
src/
├── api/               # API integration layer
│   ├── axios.js       # Axios instance with interceptors
│   └── index.js       # API service functions (auth, user, workout)
├── components/        # Reusable UI components
│   └── ProtectedRoute.jsx  # Route protection (migrated from Supabase)
├── pages/             # Page components
├── context/           # React Context providers
│   └── AuthContext.jsx     # Authentication state management
└── hooks/             # Custom React hooks
    └── useAuth.js          # Hook to access auth context
```

### 3. API Configuration

**Base URL**: `http://localhost:5000/api`

#### axios.js Features:
- Request interceptor: Automatically adds JWT token to all requests
- Response interceptor: Handles 401 errors and redirects to login
- Global error handling

#### API Services (api/index.js):

**Auth API:**
- `authAPI.register(userData)` - Register new user
- `authAPI.login(credentials)` - Login user
- `authAPI.logout()` - Logout user

**User API:**
- `userAPI.getProgress()` - Get user's weight/body fat history
- `userAPI.updateProgress(progressData)` - Update progress

**Workout API:**
- `workoutAPI.getWorkouts()` - Get all user workouts
- `workoutAPI.logWorkout(workoutData)` - Log new workout

### 4. Authentication System

**AuthContext** provides:
- `user` - Current user object
- `login(credentials)` - Login function
- `register(userData)` - Register function
- `logout()` - Logout function
- `isAuthenticated` - Boolean auth status
- `loading` - Loading state

**Usage Example:**
```javascript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
    const { user, login, logout, isAuthenticated } = useAuth();
    
    // Your component logic
}
```

### 5. Protected Routes

The `ProtectedRoute` component has been migrated from Supabase to use the new MERN auth system.

**Usage:**
```javascript
import ProtectedRoute from '../components/ProtectedRoute';

<Route path="/dashboard" element={
    <ProtectedRoute>
        <Dashboard />
    </ProtectedRoute>
} />
```

## 🔄 Migration Notes

### What Changed:
1. **Removed**: Supabase client and authentication
2. **Added**: Axios-based API calls to Node.js backend
3. **Updated**: ProtectedRoute to use AuthContext instead of Supabase session

### Next Steps for Full Migration:

1. **Update App.js**: Wrap app with `AuthProvider`
```javascript
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            {/* Your app routes */}
        </AuthProvider>
    );
}
```

2. **Update Login/Register pages**: Replace Supabase calls with `useAuth` hooks

3. **Update other pages**: Replace Supabase data fetching with API calls from `api/index.js`

## 🧪 Testing API Integration

### Example: Login Flow
```javascript
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
    const { login } = useAuth();
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login({ email, password });
            // Redirect to dashboard
        } catch (error) {
            console.error('Login failed:', error);
        }
    };
}
```

### Example: Fetch Workouts
```javascript
import { workoutAPI } from '../api';

function WorkoutPage() {
    const [workouts, setWorkouts] = useState([]);
    
    useEffect(() => {
        const fetchWorkouts = async () => {
            try {
                const data = await workoutAPI.getWorkouts();
                setWorkouts(data);
            } catch (error) {
                console.error('Error fetching workouts:', error);
            }
        };
        fetchWorkouts();
    }, []);
}
```

## 📝 Environment Setup

The backend API should be running on `http://localhost:5000`

To run the full stack:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```
