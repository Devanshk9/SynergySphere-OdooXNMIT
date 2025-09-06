import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const UserProfile = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    console.log('UserProfile mounted, isAuthenticated:', isAuthenticated);
    console.log('Token in localStorage:', localStorage.getItem('token'));
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log('Fetching user data...');
      
      const [userRes, tasksRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/me/tasks')
      ]);
      
      console.log('User response:', userRes.data);
      console.log('Tasks response:', tasksRes.data);
      
      setUser(userRes.data.user);
      setMyTasks(tasksRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load profile data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await api.patch('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'done':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    return dueDate && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-sky)' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-lg">Could not load user profile.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'tasks', label: 'My Tasks', count: myTasks.length },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen" style={{ color: 'var(--color-text-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {user.full_name}
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {user.email}
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b mb-8" style={{ borderColor: 'var(--color-border)' }}>
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  color: activeTab === tab.id ? 'var(--color-sky)' : 'var(--color-text-secondary)'
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 px-2 py-1 text-xs rounded-full" 
                    style={{ 
                      backgroundColor: activeTab === tab.id ? 'var(--color-sky)' : 'var(--color-border)',
                      color: activeTab === tab.id ? '#000' : 'var(--color-text-secondary)'
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'profile' && (
            <div className="grid gap-6">
              <div className="surface-glass rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Profile Information
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Full Name
                    </label>
                    <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
                      {user.full_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Email Address
                    </label>
                    <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Member Since
                    </label>
                    <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              {myTasks.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No tasks assigned
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    You don't have any tasks assigned to you yet
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myTasks.map((task) => (
                    <div key={task.id} className="surface-glass rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {task.title}
                          </h3>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            Project: {task.project_name}
                          </p>
                          {task.description && (
                            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-sm">
                            <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status?.replace('_', ' ').toUpperCase() || 'TODO'}
                            </span>
                            {task.due_date && (
                              <span className={`text-xs ${isOverdue(task.due_date) ? 'text-red-400' : ''}`}>
                                Due {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-6">
              <div className="surface-glass rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Security
                </h3>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="btn btn-secondary"
                >
                  Change Password
                </button>
              </div>
              
              <div className="surface-glass rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Account Actions
                </h3>
                <button 
                  onClick={handleLogout}
                  className="btn text-red-400 border-red-500/30 hover:bg-red-500/20"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="auth-card max-w-md w-full">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Change Password
              </h2>
              
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary flex-1">
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
