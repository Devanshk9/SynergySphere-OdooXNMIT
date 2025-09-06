import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const TaskDetailModal = ({ task, onTaskUpdated, onClose }) => {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    due_date: task.due_date ? task.due_date.split('T')[0] : ''
  });
  const [updating, setUpdating] = useState(false);
  const [assignees, setAssignees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAssigneeEdit, setShowAssigneeEdit] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  useEffect(() => {
    fetchAssignees();
    if (showAssigneeEdit) {
      fetchUsers();
    }
  }, [showAssigneeEdit]);

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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data.items || []);
      setSelectedAssignees(assignees.map(a => a.user_id));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
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

    setUpdating(true);
    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date || null
      };
      
      const response = await api.patch(`/tasks/${task.id}`, taskData);
      onTaskUpdated(response.data);
      toast.success('Task updated successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success('Task deleted successfully!');
      onClose();
      // Note: You might want to add a callback to remove the task from the parent component's state
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete task');
    }
  };

  const handleAssigneeToggle = (userId) => {
    setSelectedAssignees(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveAssignees = async () => {
    try {
      const currentAssigneeIds = assignees.map(a => a.user_id);
      const toAdd = selectedAssignees.filter(id => !currentAssigneeIds.includes(id));
      const toRemove = currentAssigneeIds.filter(id => !selectedAssignees.includes(id));

      // Add new assignees
      if (toAdd.length > 0) {
        await api.post(`/tasks/${task.id}/assignees`, {
          userIds: toAdd
        });
      }

      // Remove assignees
      for (const userId of toRemove) {
        await api.delete(`/tasks/${task.id}/assignees/${userId}`);
      }

      await fetchAssignees();
      setShowAssigneeEdit(false);
      toast.success('Assignees updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update assignees');
    }
  };

  const removeAssignee = async (userId) => {
    try {
      await api.delete(`/tasks/${task.id}/assignees/${userId}`);
      await fetchAssignees();
      toast.success('Assignee removed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove assignee');
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
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    return dueDate && new Date(dueDate) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="auth-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Task Details
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
              {task.status?.replace('_', ' ').toUpperCase() || 'TODO'}
            </span>
            {task.due_date && (
              <span 
                className={`text-xs px-2 py-1 rounded ${isOverdue(task.due_date) ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}
              >
                Due {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        
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
              <label htmlFor="due_date">Due Date</label>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Assigned Users
              </label>
              <button
                type="button"
                onClick={() => setShowAssigneeEdit(!showAssigneeEdit)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showAssigneeEdit ? 'Cancel' : 'Edit Assignees'}
              </button>
            </div>
            
            {showAssigneeEdit ? (
              <div>
                {loadingUsers ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Loading users...
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 mb-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    {users.length === 0 ? (
                      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        No users available
                      </div>
                    ) : (
                      users.map((user) => (
                        <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-opacity-20 hover:bg-blue-500 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAssignees.includes(user.id)}
                            onChange={() => handleAssigneeToggle(user.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {user.full_name}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAssignees}
                    className="btn btn-primary text-sm py-1 px-3"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssigneeEdit(false)}
                    className="btn btn-secondary text-sm py-1 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {loadingAssignees ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Loading assignees...
                  </div>
                ) : assignees.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No users assigned to this task
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((assignee) => (
                      <div key={assignee.user_id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {assignee.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {assignee.full_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAssignee(assignee.user_id)}
                          className="text-red-400 hover:text-red-300 text-xs ml-1"
                          title="Remove assignee"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Task Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-border)' }}>
              <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Created
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(task.created_at)}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-border)' }}>
              <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Last Updated
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(task.updated_at)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn text-red-400 border-red-500/30 hover:bg-red-500/20"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDetailModal;
