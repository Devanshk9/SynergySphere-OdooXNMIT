import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import TaskList from './TaskList';
import TaskCreationModal from './TaskCreationModal';

// Mock data
const mockProjects = [
  { id: 1, name: 'SynergySphere UI Overhaul', description: 'A complete redesign of the main user interface to improve user experience.' },
  { id: 2, name: 'Odoo Integration Module', description: 'Developing a module to integrate SynergySphere with the Odoo ERP system.' },
  { id: 3, name: 'Backend API Refactoring', description: 'Refactoring the v1 API to improve performance and scalability for v2.' },
  { id: 4, name: 'Mobile App Development', description: 'Building the native iOS and Android applications.' },
  { id: 5, name: 'Marketing Website Launch', description: 'Creating a new marketing website to attract customers.' },
];

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const ProjectDetail = () => {
  const { projectId } = useParams();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  // Find the project from mock data. In a real app, you'd fetch this from an API.
  const project = mockProjects.find(p => p.id.toString() === projectId);

  if (!project) {
    return (
      <div className="bg-slate-900 min-h-screen text-slate-100 p-8 text-center">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Link to="/dashboard" className="text-sky-400 hover:text-sky-500 mt-4 inline-block">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 min-h-screen text-slate-100 font-sans">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Project Header */}
          <header className="mb-10">
            <Link to="/dashboard" className="text-sm text-sky-400 hover:text-sky-500 mb-4 inline-block">
              &larr; All Projects
            </Link>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{project.name}</h1>
                    <p className="mt-1 text-slate-400 max-w-2xl">{project.description}</p>
                </div>
                <button 
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-4 sm:mt-0 flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-sky-900/50"
                >
                  <PlusIcon />
                  Add Task
                </button>
            </div>
          </header>

          {/* Task List */}
          <TaskList />

        </div>
      </div>
      
      {/* Task Creation Modal */}
      <TaskCreationModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
    </>
  );
};

export default ProjectDetail;
