import React from 'react';
import { Link } from 'react-router-dom';

// Mock data for projects. In a real app, this would come from an API.
const mockProjects = [
  { id: 1, name: 'SynergySphere UI Overhaul', tasksPending: 5, status: 'In Progress' },
  { id: 2, name: 'Odoo Integration Module', tasksPending: 2, status: 'Planning' },
  { id: 3, name: 'Backend API Refactoring', tasksPending: 8, status: 'In Progress' },
  { id: 4, name: 'Mobile App Development', tasksPending: 12, status: 'On Hold' },
  { id: 5, name: 'Marketing Website Launch', tasksPending: 0, status: 'Completed' },
];

// A simple icon component to avoid adding a new library
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const Dashboard = () => {
  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-sans">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Project Dashboard
            </h1>
            <p className="mt-1 text-slate-400">
              Welcome back, here's your list of active projects.
            </p>
          </div>
          <button className="mt-4 sm:mt-0 flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-sky-900/50">
            <PlusIcon />
            New Project
          </button>
        </header>

        {/* Project List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <Link to={`/project/${project.id}`} key={project.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 cursor-pointer group hover:bg-slate-800 transition-all duration-300 block">
              <h3 className="text-lg font-semibold text-white group-hover:text-sky-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                <span className="font-medium text-sky-400">{project.tasksPending}</span> tasks pending
              </p>
              <div className="mt-4">
                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full
                  ${project.status === 'Completed' ? 'bg-green-500/20 text-green-400' : ''}
                  ${project.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                  ${project.status === 'Planning' ? 'bg-blue-500/20 text-blue-400' : ''}
                  ${project.status === 'On Hold' ? 'bg-gray-500/20 text-gray-400' : ''}
                `}>
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
