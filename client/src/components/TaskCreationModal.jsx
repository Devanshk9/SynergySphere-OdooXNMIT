import React, { useState } from 'react';

const TaskCreationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Mock project members
  const projectMembers = [
    { id: 1, name: 'Jane Doe' },
    { id: 2, name: 'John Smith' },
    { id: 3, name: 'Peter Jones' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>
        
        <form>
          <div className="mb-4">
            <label htmlFor="title" className="block text-slate-400 text-sm font-bold mb-2">Task Title</label>
            <input type="text" id="title" className="w-full bg-slate-700 text-white rounded-lg p-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-slate-400 text-sm font-bold mb-2">Description</label>
            <textarea id="description" rows="4" className="w-full bg-slate-700 text-white rounded-lg p-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="assignee" className="block text-slate-400 text-sm font-bold mb-2">Assignee</label>
              <select id="assignee" className="w-full bg-slate-700 text-white rounded-lg p-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500">
                {projectMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-slate-400 text-sm font-bold mb-2">Due Date</label>
              <input type="date" id="dueDate" className="w-full bg-slate-700 text-white rounded-lg p-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
