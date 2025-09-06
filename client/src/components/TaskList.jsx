import React, { useState } from 'react';
import TaskDetailModal from './TaskDetailModal';

// Mock data
const mockTasks = [
  { id: 1, title: 'Design the new dashboard layout', assignee: { name: 'Jane Doe', avatar: 'https://i.pravatar.cc/150?u=jane' }, dueDate: '2025-10-15', status: 'In Progress' },
  { id: 2, title: 'Develop the API for project creation', assignee: { name: 'John Smith', avatar: 'https://i.pravatar.cc/150?u=john' }, dueDate: '2025-10-20', status: 'To Do' },
  { id: 3, title: 'Implement user authentication flow', assignee: { name: 'Jane Doe', avatar: 'https://i.pravatar.cc/150?u=jane' }, dueDate: '2025-10-22', status: 'Done' },
  { id: 4, title: 'Create the landing page animation', assignee: { name: 'Peter Jones', avatar: 'https://i.pravatar.cc/150?u=peter' }, dueDate: '2025-10-25', status: 'To Do' },
];

const TaskList = () => {
  const [selectedTask, setSelectedTask] = useState(null);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Tasks</h2>
        <div className="space-y-3">
          {mockTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="bg-slate-800 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-700/80 transition-colors"
            >
              <div>
                <p className="text-slate-100">{task.title}</p>
                <p className="text-xs text-slate-400 mt-1">Due: {task.dueDate}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full
                  ${task.status === 'Done' ? 'bg-green-500/20 text-green-400' : ''}
                  ${task.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                  ${task.status === 'To Do' ? 'bg-sky-500/20 text-sky-400' : ''}
                `}>
                  {task.status}
                </span>
                <div className="flex items-center gap-2">
                  <img src={task.assignee.avatar} alt={task.assignee.name} className="w-8 h-8 rounded-full" />
                  <span className="text-sm text-slate-300 hidden sm:inline">{task.assignee.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default TaskList;
