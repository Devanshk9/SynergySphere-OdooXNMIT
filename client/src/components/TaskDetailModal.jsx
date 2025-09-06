import React, { useState } from 'react';

const TaskDetailModal = ({ task, isOpen, onClose }) => {
  if (!isOpen) return null;

  const [currentStatus, setCurrentStatus] = useState(task.status);

  const handleStatusChange = (e) => {
    setCurrentStatus(e.target.value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">{task.title}</h2>
        
        <div className="mb-6">
          <label className="block text-slate-400 text-sm font-bold mb-2">Description</label>
          <p className="text-slate-300 bg-slate-700/50 p-3 rounded-lg">
            This is a placeholder description for the task. In a real application, this would be editable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-2">Assignee</label>
            <div className="flex items-center gap-2">
              <img src={task.assignee.avatar} alt={task.assignee.name} className="w-8 h-8 rounded-full" />
              <span className="text-white">{task.assignee.name}</span>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-2">Due Date</label>
            <p className="text-white">{task.dueDate}</p>
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="status" className="block text-slate-400 text-sm font-bold mb-2">Status</label>
          <select 
            id="status" 
            value={currentStatus}
            onChange={handleStatusChange}
            className="w-full bg-slate-700 text-white rounded-lg p-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option>To Do</option>
            <option>In Progress</option>
            <option>Done</option>
          </select>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Close
          </button>
          <button type="button" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
