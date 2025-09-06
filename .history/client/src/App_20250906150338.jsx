import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import Home from './components/Home';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import ProjectDetail from './components/ProjectDetail';
import UserProfile from './components/UserProfile';
import { useAuth, AuthProvider } from './context/AuthContext';

// Create a client for React Query
const queryClient = new QueryClient();

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-accent/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="text-sky font-semibold text-xl tracking-tight"
            >
              SynergySphere
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Home
                </Link>
                <Link
                  to="/login"
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-text-primary hover:text-sky transition-colors py-2 px-3 rounded-md"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-bg-primary flex flex-col">
            <Navigation />
              <Container component="main" sx={{ flex: 1, py: 4 }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/projects/:id" element={
                    <ProtectedRoute>
                      <ProjectDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Container>
              <Box component="footer" sx={{ py: 3, bgcolor: 'background.paper' }}>
                <Container maxWidth="lg">
                  <Typography variant="body2" color="text.secondary" align="center">
                    © {new Date().getFullYear()} SynergySphere. All rights reserved.
                  </Typography>
                </Container>
              </Box>
            </Box>
          </AuthProvider>
        </Router>
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

