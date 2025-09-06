import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import api from '../services/api';

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13.586V10a7 7 0 00-14 0v3.586l-.707.707A1 1 0 005 16h14a1 1 0 00.707-1.707L19 13.586zM13 19a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=5');
      setNotifications(response.data.items || []);
      setNotificationCount(response.data.items?.filter(n => !n.is_read)?.length || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <nav 
        className="sticky top-0 z-50 transition-all duration-300"
        style={{ 
          background: 'var(--gradient-nav)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                to={isAuthenticated ? "/dashboard" : "/"}
                className="font-bold text-xl tracking-tight transition-all duration-200 hover:scale-105"
                style={{
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                SynergySphere
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="nav-link"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/projects"
                    className="nav-link"
                  >
                    Projects
                  </Link>
                  <Link
                    to="/profile"
                    className="nav-link"
                  >
                    Profile
                  </Link>
                  
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="nav-link relative p-2"
                    >
                      <BellIcon />
                      {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {notificationCount}
                        </span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div 
                        className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg z-50 card-modern"
                        style={{ 
                          background: 'var(--color-bg-primary)', 
                          border: '1px solid var(--color-border)' 
                        }}
                      >
                        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Notifications
                          </h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                              No notifications
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`p-3 border-b cursor-pointer transition-colors ${
                                  !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                                style={{ 
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-primary)'
                                }}
                                onClick={() => markAsRead(notification.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      {notification.payload?.message || 'New notification'}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                      {formatDate(notification.created_at)}
                                    </p>
                                  </div>
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="nav-link"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className="nav-link"
                  >
                    Home
                  </Link>
                  <Link
                    to="/login"
                    className="nav-link"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="nav-link"
                  >
                    Register
                  </Link>
                  <ThemeToggle />
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md transition-colors"
                style={{ 
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-hover)'
                }}
              >
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden border-t transition-all duration-300"
            style={{ 
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-primary)'
            }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/projects"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Projects
                  </Link>
                  <Link
                    to="/profile"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mobile-nav-link w-full text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/login"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Notifications */}
      {isAuthenticated && (
        <div className="md:hidden">
          {showNotifications && (
            <div 
              className="fixed inset-x-0 top-16 z-40 mx-4 mt-2 rounded-lg shadow-lg card-modern"
              style={{ 
                background: 'var(--color-bg-primary)', 
                border: '1px solid var(--color-border)' 
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Notifications
                </h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      style={{ 
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">
                            {notification.payload?.message || 'New notification'}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;
