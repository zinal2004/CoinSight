import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';

const Navbar = ({ isAuthenticated, onLogout, user }) => {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link to="/" className="font-orbitron text-2xl font-bold text-gray-800 dark:text-gray-100">
          CoinSight
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-blue-600 font-semibold text-gray-700 dark:text-gray-200">Home</Link>
          <Link to="/portfolio" className="hover:text-blue-600 font-semibold text-gray-700 dark:text-gray-200">Portfolio</Link>
          <Link to="/watchlist" className="hover:text-blue-600 font-semibold text-gray-700 dark:text-gray-200">Watchlist</Link>
          <button
            onClick={toggleTheme}
            className="relative w-10 h-6 flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle theme"
          >
            <span className="sr-only">Toggle theme</span>
            <span
              className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4' : ''}`}
            />
            <span className="absolute left-1 text-xs text-gray-400 dark:text-gray-500">☀️</span>
            <span className="absolute right-1 text-xs text-gray-400 dark:text-gray-500">🌙</span>
          </button>
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <UserCircleIcon className="w-7 h-7" />
                <span>{user?.username || 'Profile'}</span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                  <Link to="/profile" className="block py-2 hover:text-blue-600">Settings</Link>
                  <button onClick={onLogout} className="block w-full text-left py-2 hover:text-red-500">Logout</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 