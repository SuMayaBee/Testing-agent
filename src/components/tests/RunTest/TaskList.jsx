import React from 'react';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { STATUSES } from './constants';

function TaskList({ tasksInFlow }) {
  return (
    <div className="mb-6">
      <h3 className="font-medium mb-3">Tasks in Flow</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {tasksInFlow.map((task) => (
          <div key={task.task_id} className="border border-secondary-200 rounded-lg p-3">
            <div className="flex items-center">
              {task.status === STATUSES.PENDING ? (
                <ClockIcon className="w-5 h-5 text-secondary-500 mr-2" />
              ) : task.status === STATUSES.RUNNING ? (
                <div className="w-5 h-5 mr-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-b-transparent border-primary-600"></div>
                </div>
              ) : task.status === STATUSES.COMPLETED ? (
                <CheckCircleIcon className="w-5 h-5 text-success-500 mr-2" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-danger-500 mr-2" />
              )}
              <h4 className="font-medium">{task.task_name}</h4>
            </div>
            <div className={`
              mt-2 px-2 py-1 rounded text-xs font-medium w-fit
              ${task.status === STATUSES.PENDING ? 'bg-secondary-100 text-secondary-800' : 
                task.status === STATUSES.RUNNING ? 'bg-yellow-100 text-yellow-800' : 
                task.status === STATUSES.COMPLETED ? 'bg-green-100 text-green-800' : 
                'bg-red-100 text-red-800'}
            `}>
              {task.status === STATUSES.PENDING ? 'Pending' : 
               task.status === STATUSES.RUNNING ? 'Running' : 
               task.status === STATUSES.COMPLETED ? 'Completed' : 
               'Failed'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskList; 