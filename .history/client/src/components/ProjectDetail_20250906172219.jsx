import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import TaskCreationModal from './TaskCreationModal';
import TaskDetailModal from './TaskDetailModal';

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const TaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.697-.413l-4.83 1.161c-.786.188-1.482-.652-1.288-1.465l1.161-4.83A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
  </svg>
);

const TeamIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-sky)' }}></div>
  </div>
);

const TaskCard = ({ task, onClick, getStatusColor, formatDate, isOverdue }) => {
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  useEffect(() => {
    fetchAssignees();
  }, [task.id]);

  const fetchAssignees = async () => {
    try {
      setLoadingAssignees(true);
      const response = await api.get(`/tasks/${task.id}/assignees`);
      setAssignees(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch assignees:', error);
    } finally {
      setLoadingAssignees(false);
    }
  };

  return (
    <div 
      className="surface-glass rounded-lg p-4 cursor-pointer hover:scale-[1.01] transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
              {task.description}
            </p>
          )}
          
          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Assigned to:
              </span>
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((assignee) => (
                  <div 
                    key={assignee.user_id}
                    className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                    title={assignee.full_name}
                  >
                    {assignee.full_name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div 
                    className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                    title={`+${assignees.length - 3} more`}
                  >
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status?.replace('_', ' ').toUpperCase() || 'TODO'}
            </span>
            {task.due_date && (
              <span className={`text-xs ${isOverdue(task.due_date) ? 'text-red-400' : ''}`} 
                    style={{ color: isOverdue(task.due_date) ? '#f87171' : 'var(--color-text-secondary)' }}
              >
                Due {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [threads, setThreads] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  // New thread form
  const [newThread, setNewThread] = useState({ title: '' });
  const [creatingThread, setCreatingThread] = useState(false);
  
  // Add member form
  const [newMember, setNewMember] = useState({ userId: '', role: 'member' });
  const [addingMember, setAddingMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      // Fetch project details, tasks, threads, and members in parallel
      const [projectRes, tasksRes, threadsRes, membersRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
        api.get(`/projects/${projectId}/threads`),
        api.get(`/projects/${projectId}/members`)
      ]);

      setProject(projectRes.data);
      setTasks(tasksRes.data.items || []);
      setThreads(threadsRes.data.items || []);
      setMembers(membersRes.data.items || []);
    } catch (error) {
      toast.error('Failed to load project data');
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks([newTask, ...tasks]);
    setShowCreateTaskModal(false);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThread.title.trim()) {
      toast.error('Thread title is required');
      return;
    }

    setCreatingThread(true);
    try {
      const response = await api.post(`/projects/${projectId}/threads`, newThread);
      setThreads([response.data, ...threads]);
      setNewThread({ title: '' });
      setShowCreateThreadModal(false);
      toast.success('Discussion thread created!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create thread');
    } finally {
      setCreatingThread(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.userId) {
      toast.error('Please select a user');
      return;
    }

    setAddingMember(true);
    try {
      const response = await api.post(`/projects/${projectId}/members`, newMember);
      setMembers([response.data, ...members]);
      setNewMember({ userId: '', role: 'member' });
      setShowAddMemberModal(false);
      toast.success('Team member added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await api.get(`/users?q=${encodeURIComponent(query)}&limit=10`);
      // Filter out users who are already members
      const existingMemberIds = members.map(m => m.user_id);
      const filteredUsers = response.data.items.filter(user => 
        !existingMemberIds.includes(user.id)
      );
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to search users:', error);
      setAvailableUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleUserSearchChange = (e) => {
    const query = e.target.value;
    setUserSearchQuery(query);
    searchUsers(query);
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
    return <LoadingSpinner />;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Project not found
          </h2>
          <Link to="/dashboard" className="btn btn-primary">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: TaskIcon, count: tasks.length },
    { id: 'discussions', label: 'Discussions', icon: MessageIcon, count: threads.length },
    { id: 'team', label: 'Team', icon: TeamIcon, count: members.length }
  ];

  return (
    <div className="min-h-screen" style={{ color: 'var(--color-text-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Project Header */}
        <header className="mb-8">
          <Link to="/dashboard" className="text-sm mb-4 inline-block nav-link">
            &larr; All Projects
          </Link>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {project.name}
              </h1>
              {project.description && (
                <p style={{ color: 'var(--color-text-secondary)' }} className="max-w-2xl">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(project.status)}`}>
                  {project.status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Created {formatDate(project.created_at)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              {activeTab === 'tasks' && (
                <button 
                  onClick={() => setShowCreateTaskModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <PlusIcon />
                  Add Task
                </button>
              )}
              {activeTab === 'discussions' && (
                <button 
                  onClick={() => setShowCreateThreadModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <PlusIcon />
                  New Discussion
                </button>
              )}
              {activeTab === 'team' && (
                <button 
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <PlusIcon />
                  Add Member
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b mb-8" style={{ borderColor: 'var(--color-border)' }}>
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
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
                  <Icon />
                  {tab.label}
                  <span className="ml-1 px-2 py-1 text-xs rounded-full" 
                    style={{ 
                      backgroundColor: activeTab === tab.id ? 'var(--color-sky)' : 'var(--color-border)',
                      color: activeTab === tab.id ? '#000' : 'var(--color-text-secondary)'
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'tasks' && (
            <div>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <TaskIcon className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No tasks yet
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Create your first task to get started
                  </p>
                  <button 
                    onClick={() => setShowCreateTaskModal(true)}
                    className="mt-4 btn btn-primary"
                  >
                    Create Task
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tasks.map((task) => (
                    <TaskCard 
                      key={task.id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                      getStatusColor={getStatusColor}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussions' && (
            <div>
              {threads.length === 0 ? (
                <div className="text-center py-12">
                  <MessageIcon className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No discussions yet
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Start a discussion with your team
                  </p>
                  <button 
                    onClick={() => setShowCreateThreadModal(true)}
                    className="mt-4 btn btn-primary"
                  >
                    Start Discussion
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {threads.map((thread) => (
                    <div key={thread.id} className="surface-glass rounded-lg p-4">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        {thread.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <span>Started by {thread.author_name}</span>
                        <span>{formatDate(thread.created_at)}</span>
                        <span>{thread.message_count || 0} messages</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <TeamIcon className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No team members yet
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Add team members to collaborate on this project
                  </p>
                  <button 
                    onClick={() => setShowAddMemberModal(true)}
                    className="mt-4 btn btn-primary"
                  >
                    Add Team Member
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {members.map((member) => (
                    <div key={member.user_id} className="surface-glass rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {member.full_name}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {member.email}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {member.role?.toUpperCase() || 'MEMBER'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showCreateTaskModal && (
          <TaskCreationModal 
            projectId={projectId}
            onTaskCreated={handleTaskCreated}
            onClose={() => setShowCreateTaskModal(false)}
          />
        )}

        {showTaskDetailModal && selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            onTaskUpdated={handleTaskUpdated}
            onClose={() => setShowTaskDetailModal(false)}
          />
        )}

        {/* Create Thread Modal */}
        {showCreateThreadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-modern max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Start New Discussion
              </h2>
              
              <form onSubmit={handleCreateThread}>
                <div className="form-group">
                  <label htmlFor="threadTitle">Discussion Title</label>
                  <input
                    type="text"
                    id="threadTitle"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    className="form-control"
                    placeholder="What would you like to discuss?"
                    required
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={creatingThread}
                  >
                    {creatingThread ? 'Creating...' : 'Start Discussion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateThreadModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-modern max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Add Team Member
              </h2>
              
              <form onSubmit={handleAddMember}>
                <div className="form-group">
                  <label htmlFor="memberEmail">Email Address</label>
                  <input
                    type="email"
                    id="memberEmail"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    className="form-control"
                    placeholder="Enter team member's email"
                    required
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="memberRole">Role</label>
                  <select
                    id="memberRole"
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    className="form-control"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={addingMember}
                  >
                    {addingMember ? 'Adding...' : 'Add Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
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

export default ProjectDetail;
