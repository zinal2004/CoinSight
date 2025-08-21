import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Profile from './components/Profile';
import CoinDetail from './components/CoinDetail';
import Home from './components/Home';

const AppLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const hideNavbar = ['/login', '/register'].includes(location.pathname);
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-crypto-blue transition-colors duration-300">
      {!hideNavbar && <Navbar isAuthenticated={!!user} onLogout={onLogout} user={user} />}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token and get user data
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({ ...userData, token });
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    console.log('App component - Login handler called with:', userData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={<Register onLogin={handleLogin} />}
        />
        <Route
          path="*"
          element={
            <AppLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard isAuthenticated={!!user} />} />
                <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/login" replace />} />
                <Route path="/watchlist" element={user ? <Watchlist /> : <Navigate to="/login" replace />} />
                <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" replace />} />
                <Route path="/crypto/:id" element={<CoinDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
