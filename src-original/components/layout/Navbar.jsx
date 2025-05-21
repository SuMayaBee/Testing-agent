import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useState } from 'react';
import { 
  HomeIcon, 
  ClipboardDocumentIcon as ClipboardIcon, 
  ChartBarIcon, 
  AdjustmentsHorizontalIcon as AdjustmentsIcon,
  ChevronDownIcon, 
  ArrowRightOnRectangleIcon as LogoutIcon, 
  Bars3Icon as MenuIcon, 
  XMarkIcon as XIcon 
} from '@heroicons/react/24/outline';

function Navbar({ children }) {
  const { isAuthenticated, currentUser, signOut } = useAuth();
  const { organizations, currentOrganizationUsername, setCurrentOrganizationUsername } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOrganizationChange = (org) => {
    setCurrentOrganizationUsername(org);
    setIsOrgDropdownOpen(false);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-secondary-200">
        <div className="flex items-center px-4 py-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Testing Agent</h1>
              <p className="text-xs text-secondary-500">by Yobo</p>
            </div>
          </div>
        </div>
        
        {/* Organization selector */}
        {isAuthenticated && organizations && organizations.length > 0 && (
          <div className="relative px-4 py-3 border-b border-secondary-200">
            <button 
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md hover:bg-secondary-100"
            >
              <span className="font-medium truncate">
                {currentOrganizationUsername || 'Select Organization'}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-secondary-500" />
            </button>
            
            {isOrgDropdownOpen && (
              <div className="absolute left-4 right-4 mt-1 bg-white border border-secondary-200 rounded-md shadow-lg z-10">
                {organizations.map((org) => (
                  <button
                    key={org}
                    onClick={() => handleOrganizationChange(org)}
                    className={`w-full text-left px-4 py-2 hover:bg-secondary-100 ${
                      org === currentOrganizationUsername ? 'bg-secondary-100 font-medium' : ''
                    }`}
                  >
                    {org}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Nav items */}
        {isAuthenticated && (
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link to="/" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <HomeIcon className="w-5 h-5 mr-3 text-secondary-500" />
              Home
            </Link>
            
            <Link to="/tasks" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <ClipboardIcon className="w-5 h-5 mr-3 text-secondary-500" />
              Tasks
            </Link>
            
            <Link to="/metrics" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <ChartBarIcon className="w-5 h-5 mr-3 text-secondary-500" />
              Metrics
            </Link>
            
            <Link to="/tests" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <AdjustmentsIcon className="w-5 h-5 mr-3 text-secondary-500" />
              Tests
            </Link>
            
            <Link to="/simulations" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <svg className="w-5 h-5 mr-3 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Simulations
            </Link>
            
            <Link to="/comparisons" className="flex items-center px-4 py-2 text-secondary-900 rounded-md hover:bg-secondary-100">
              <svg className="w-5 h-5 mr-3 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Comparisons
            </Link>
          </nav>
        )}
        
        {/* User profile */}
        {isAuthenticated && currentUser && (
          <div className="border-t border-secondary-200 p-4">
            <div className="flex items-center">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-10 h-10 rounded-full mr-3"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                  <span className="text-primary-700 font-medium">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-xs text-secondary-500 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
            
            <button 
              onClick={signOut} 
              className="mt-3 w-full flex items-center justify-center px-4 py-2 text-sm text-secondary-700 rounded-md border border-secondary-200 hover:bg-secondary-100"
            >
              <LogoutIcon className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        )}
      </div>
      
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="bg-primary-600 rounded-lg p-1.5">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h1 className="text-lg font-bold">Testing Agent</h1>
          </div>
          
          <button onClick={toggleMenu} className="p-2">
            {isMenuOpen ? (
              <XIcon className="w-6 h-6 text-secondary-800" />
            ) : (
              <MenuIcon className="w-6 h-6 text-secondary-800" />
            )}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="bg-white border-t border-secondary-200 px-2 py-3">
            {isAuthenticated && organizations && organizations.length > 0 && (
              <div className="px-4 py-2 mb-2">
                <label className="block text-xs font-medium text-secondary-500 mb-1">
                  Organization
                </label>
                <select 
                  value={currentOrganizationUsername || ''} 
                  onChange={(e) => setCurrentOrganizationUsername(e.target.value)}
                  className="w-full p-2 border border-secondary-200 rounded-md"
                >
                  {organizations.map((org) => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>
            )}
            
            {isAuthenticated && (
              <>
                <Link to="/" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Home
                </Link>
                <Link to="/tasks" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Tasks
                </Link>
                <Link to="/metrics" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Metrics
                </Link>
                <Link to="/tests" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Tests
                </Link>
                <Link to="/simulations" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Simulations
                </Link>
                <Link to="/comparisons" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                  Comparisons
                </Link>
                
                {currentUser && (
                  <div className="mt-3 pt-3 border-t border-secondary-200">
                    <div className="px-4 py-2 flex items-center">
                      {currentUser?.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt={currentUser.displayName || 'User'} 
                          className="w-8 h-8 rounded-full mr-3"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                          <span className="text-primary-700 font-medium">
                            {currentUser.displayName?.charAt(0) || 'U'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{currentUser.displayName}</p>
                        <p className="text-xs text-secondary-500">{currentUser.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={signOut} 
                      className="mt-2 px-4 py-2 w-full text-left text-secondary-700 hover:bg-secondary-100 rounded-md"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
            
            {!isAuthenticated && (
              <Link to="/login" className="block px-4 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md">
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <div className="pt-16 md:pt-0">
          {isAuthenticated ? (
            <main className="p-6">
              {children}
            </main>
          ) : (
            <main className="p-6">
              {children}
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar; 