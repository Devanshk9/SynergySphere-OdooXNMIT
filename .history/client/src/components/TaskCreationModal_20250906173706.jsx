import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const TaskCreationModal = ({ projectId, onTaskCreated, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    due_date: ''
  });
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      // Fetch only project members who can be assigned to tasks
      const response = await api.get(`/projects/${projectId}/members`);
      setUsers(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch project members:', error);
      toast.error('Failed to load project members');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setCreating(true);
    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date || null
      };
      
      const response = await api.post(`/projects/${projectId}/tasks`, taskData);
      const createdTask = response.data;
      
      // Assign users to the task if any are selected
      if (selectedAssignees.length > 0) {
        try {
          await api.post(`/tasks/${createdTask.id}/assignees`, {
            userIds: selectedAssignees
          });
        } catch (assignError) {
          console.error('Failed to assign users:', assignError);
          toast.error('Task created but failed to assign users');
        }
      }
      
      onTaskCreated(createdTask);
      toast.success('Task created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        due_date: ''
      });
      setSelectedAssignees([]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleAssigneeToggle = (userId) => {
    setSelectedAssignees(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card-modern max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          Create New Task
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter task title"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-control"
              placeholder="Task description (optional)"
              rows="4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-control"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="due_date">Due Date (Optional)</label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          {/* Assignees Section */}
          <div className="form-group">
            <label>Assign to Users (Optional)</label>
            {loadingUsers ? (
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Loading users...
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {users.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No users available
                  </div>
                ) : (
                  users.map((member) => (
                    <label key={member.user_id} className="flex items-center gap-2 p-2 hover:bg-opacity-20 hover:bg-blue-500 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(member.user_id)}
                        onChange={() => handleAssigneeToggle(member.user_id)}
                        className="w-4 h-4"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {member.full_name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {member.email} • {member.role}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
            {selectedAssignees.length > 0 && (
              <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedAssignees.length} user{selectedAssignees.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
