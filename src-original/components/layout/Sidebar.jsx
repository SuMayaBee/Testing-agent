import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Icons (we'll use Heroicons style icons)
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TasksIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const MetricsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TestsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const SimulationsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ComparisonsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

function Sidebar({ collapsed, setCollapsed }) {
  const { signOut, currentUser } = useAuth();
  
  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
            TA
          </div>
          {!collapsed && (
            <span className="ml-3 text-lg font-semibold text-gray-800">Testing Agent</span>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-700"
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          <li>
            <NavLink to="/" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`} end>
              <HomeIcon />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/tasks" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <TasksIcon />
              {!collapsed && <span>Tasks</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/metrics" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <MetricsIcon />
              {!collapsed && <span>Metrics</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/tests" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <TestsIcon />
              {!collapsed && <span>Tests</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/simulations" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <SimulationsIcon />
              {!collapsed && <span>Simulations</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/comparisons" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ComparisonsIcon />
              {!collapsed && <span>Comparisons</span>}
            </NavLink>
          </li>
        </ul>
      </nav>
      
      <div className="border-t border-gray-200 p-4">
        {!collapsed ? (
          <div className="flex items-center">
            {currentUser?.photoURL && (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'User profile'} 
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">
                {currentUser?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentUser?.email || ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            {currentUser?.photoURL && (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'User profile'} 
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        )}
        
        <button 
          onClick={signOut}
          className={`mt-4 flex items-center text-gray-700 hover:text-red-600 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogoutIcon />
          {!collapsed && <span className="ml-3">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar; 