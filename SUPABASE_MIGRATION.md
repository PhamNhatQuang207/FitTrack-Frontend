# Supabase to MERN Refactoring Summary

## ✅ Completed Refactoring

### 1. **Authentication Pages**

#### Login.jsx
- ✅ Replaced `supabase.auth.signInWithPassword()` with `useAuth().login()`
- ✅ Uses MERN backend `/api/auth/login` endpoint
- ✅ Token stored in localStorage and managed by AuthContext
- ⚠️ Password reset temporarily disabled (backend endpoint needed)

#### Register.jsx  
- ✅ Replaced `supabase.auth.signUp()` with `useAuth().register()`
- ✅ Uses MERN backend `/api/auth/register` endpoint
- ⚠️ **Note**: Backend requires `name, age, height, weight` - currently using defaults
- 💡 **TODO**: Add form fields for user profile data during registration

#### Profile.jsx
- ✅ Replaced `supabase.auth.getSession()` with `useAuth().user`
- ✅ Replaced `supabase.from('profiles')` with `axiosClient.get('/users/progress')`
- ✅ Profile updates now use `/api/users/progress` endpoint
- ✅ Added bodyFat field to form
- ✅ Logout uses `useAuth().logout()` and navigates to `/login`
- ⚠️ **Data Structure**: MongoDB uses `_id` instead of `id`
- ⚠️ **Note**: Weight and bodyFat come from history arrays (latest value)

### 2. **API Layer**

#### axiosClient.js (NEW)
- ✅ Centralized axios instance
- ✅ Base URL: `http://localhost:5000/api`
- ✅ Request interceptor: Adds JWT token from localStorage
- ✅ Response interceptor: Handles 401 errors (auto-logout)

#### api/index.js
- ✅ Updated to use `axiosClient` instead of `api`
- ✅ Auth API: register, login, logout
- ✅ User API: getProgress, updateProgress  
- ✅ Workout API: getWorkouts, logWorkout

### 3. **Context & Authentication**

#### AuthContext.jsx
- ✅ Manages user state
- ✅ Provides login, register, logout functions
- ✅ Persists auth state in localStorage

#### ProtectedRoute.jsx
- ✅ Migrated from Supabase session to `useAuth().isAuthenticated`
- ✅ Redirects to `/login` if not authenticated

---

## 🔄 Data Structure Mapping

### MongoDB vs Supabase

| Supabase | MongoDB | Notes |
|----------|---------|-------|
| `id` | `_id` | MongoDB uses ObjectId |
| `profiles` table | Users collection | Profile data in main users document |
| `weight` field | `weightHistory[]` | Array of {value, date} objects |
| N/A | `bodyFatHistory[]` | Array of {value, date} objects |

### Workout Structure

Backend expects:
```javascript
{
  date: "2026-01-07",
  exercises: [
    {
      exerciseName: "Bench Press",
      category: "Chest",
      sets: [
        { setNumber: 1, reps: 10, weight: 60 },
        { setNumber: 2, reps: 8, weight: 65 }
      ]
    }
  ]
}
```

---

## ⚠️ Remaining Supabase References

The following files still contain Supabase calls and need refactoring:

### 1. **ChangePassword.jsx**
- Uses `supabase.auth.updateUser({ password })`
- **TODO**: Create backend endpoint for password change

### 2. **ResetPassword.jsx**
- Uses `supabase.auth.onAuthStateChange()` and `supabase.auth.updateUser()`
- **TODO**: Implement password reset flow in backend

### 3. **Dashboard.jsx**
- May have Supabase references (needs verification)
- **TODO**: Check and refactor if needed

### 4. **WorkoutTracking.jsx**
- Likely has Supabase workout queries
- **TODO**: Replace with `workoutAPI.getWorkouts()` and `workoutAPI.logWorkout()`

---

## 📝 Migration Checklist

### Completed ✅
- [x] Install axios, lucide-react, react-router-dom
- [x] Create folder structure (api, components, pages, context, hooks)
- [x] Create axiosClient with interceptors
- [x] Create API service layer
- [x] Create AuthContext
- [x] Refactor Login page
- [x] Refactor Register page
- [x] Refactor Profile page
- [x] Update ProtectedRoute component

### Still TODO 🔲
- [ ] Refactor WorkoutTracking.jsx (workout CRUD operations)
- [ ] Refactor Dashboard.jsx (if has Supabase calls)
- [ ] Implement password change endpoint in backend
- [ ] Implement password reset flow in backend
- [ ] Refactor ChangePassword.jsx
- [ ] Refactor ResetPassword.jsx
- [ ] Add profile fields to Register form (name, age, height, weight)
- [ ] Update App.js to wrap with AuthProvider
- [ ] Remove old axios.js file (using axiosClient now)
- [ ] Remove/delete supabase.js file

---

## 🚀 Next Steps

1. **Update App.js**:
```javascript
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                {/* Your routes */}
            </BrowserRouter>
        </AuthProvider>
    );
}
```

2. **Refactor WorkoutTracking.jsx**:
   - Replace Supabase workout queries
   - Use `workoutAPI.getWorkouts()` and `workoutAPI.logWorkout()`
   - Map `_id` to `id` in UI if needed

3. **Backend Enhancements** (if needed):
   - Add password change endpoint
   - Add password reset flow
   - Add user profile update endpoint (name, age, etc.)

---

## 💡 Important Notes

### Authentication Flow
1. User logs in → Backend returns JWT token + user object
2. Token stored in localStorage
3. axiosClient automatically adds token to all requests
4. On 401 error → Auto-logout and redirect to login

### Progress Tracking
- Weight and bodyFat are stored as history arrays in MongoDB
- When displaying current values, use the **latest entry** from arrays:
  ```javascript
  const currentWeight = weightHistory[weightHistory.length - 1]?.value
  ```

### Error Handling
- All API calls wrapped in try-catch
- Error messages from `error.response?.data?.message`
- Display errors to user in UI

---

## 🔍 Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Register new user
- [ ] View profile (should load user data)
- [ ] Update weight and body fat
- [ ] Logout (should clear localStorage and redirect)
- [ ] Access protected route without login (should redirect)
- [ ] Token expiration handling (401 → auto-logout)
