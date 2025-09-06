import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Import the api instance

const UserProfile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/profile');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user profile', error);
        // Optional: handle error, e.g., show a notification
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">Could not load user profile.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-sans p-8">
      <div className="container mx-auto max-w-lg">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-8">
          User Profile & Settings
        </h1>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="mb-6">
            <label className="text-sm text-slate-400">Full Name</label>
            <p className="text-lg text-white">{user.full_name}</p>
          </div>
          <div className="mb-8">
            <label className="text-sm text-slate-400">Email Address</label>
            <p className="text-lg text-white">{user.email}</p>
          </div>

          <h2 className="text-xl font-semibold text-white border-t border-slate-700 pt-6 mb-4">
            Notifications
          </h2>
          <div className="flex items-center justify-between mb-8">
            <span className="text-slate-300">Email Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-sky-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full bg-red-600/80 hover:bg-red-700/80 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
