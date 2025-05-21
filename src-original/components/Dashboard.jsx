import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  ClipboardDocumentIcon as ClipboardIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon as AdjustmentsIcon,
  PlayIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { currentOrganizationInfo } = useApp();

  const features = [
    {
      title: 'Tasks',
      description: 'Create and manage testing tasks',
      icon: <ClipboardIcon className="w-8 h-8 text-primary-600" />,
      path: '/tasks',
      color: 'bg-primary-50',
    },
    {
      title: 'Metrics',
      description: 'Define how tests are evaluated',
      icon: <ChartBarIcon className="w-8 h-8 text-indigo-600" />,
      path: '/metrics',
      color: 'bg-indigo-50',
    },
    {
      title: 'Tests',
      description: 'Combine tasks and metrics into tests',
      icon: <AdjustmentsIcon className="w-8 h-8 text-emerald-600" />,
      path: '/tests',
      color: 'bg-emerald-50',
    },
    {
      title: 'Simulations',
      description: 'Run tests and view results',
      icon: <PlayIcon className="w-8 h-8 text-amber-600" />,
      path: '/simulations',
      color: 'bg-amber-50',
    },
    {
      title: 'Comparisons',
      description: 'Compare results across versions',
      icon: <ScaleIcon className="w-8 h-8 text-rose-600" />,
      path: '/comparisons',
      color: 'bg-rose-50',
    },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Dashboard</h1>
        {currentOrganizationInfo ? (
          <p className="mt-2 text-secondary-600">
            Welcome to {currentOrganizationInfo.name || currentOrganizationInfo.id}
          </p>
        ) : (
          <p className="mt-2 text-secondary-600">
            Select an organization to get started
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link 
            key={feature.title}
            to={feature.path}
            className="block group"
          >
            <div className="h-full flex flex-col border border-secondary-200 rounded-lg shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:border-secondary-300">
              <div className={`${feature.color} p-6`}>
                <div className="flex justify-between items-start">
                  {feature.icon}
                  <svg className="w-5 h-5 text-secondary-400 group-hover:text-secondary-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-secondary-900">{feature.title}</h3>
              </div>
              <div className="bg-white flex-1 p-5">
                <p className="text-secondary-600">{feature.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard; 