import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ActivityItem = ({ type, title, description, time, user }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'project_created':
        return (
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'task_completed':
        return (
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      {getActivityIcon(type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
        <div className="flex items-center mt-1 space-x-2">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {time}
          </span>
          {user && (
            <>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>•</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const RecentActivity = () => {
  const activities = [
    {
      type: 'project_created',
      title: 'New project created',
      description: 'E-commerce Platform Development',
      time: '2 hours ago',
      user: 'John Doe'
    },
    {
      type: 'task_completed',
      title: 'Task completed',
      description: 'Design system implementation',
      time: '4 hours ago',
      user: 'Jane Smith'
    },
    {
      type: 'comment_added',
      title: 'Comment added',
      description: 'Updated requirements for user authentication',
      time: '6 hours ago',
      user: 'Mike Johnson'
    },
    {
      type: 'project_created',
      title: 'New project created',
      description: 'Mobile App Redesign',
      time: '1 day ago',
      user: 'Sarah Wilson'
    },
    {
      type: 'task_completed',
      title: 'Task completed',
      description: 'API documentation review',
      time: '2 days ago',
      user: 'Alex Brown'
    }
  ];

  return (
    <div className="card-modern p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Recent Activity
        </h3>
        <button className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          View all
        </button>
      </div>
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <ActivityItem key={index} {...activity} />
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
