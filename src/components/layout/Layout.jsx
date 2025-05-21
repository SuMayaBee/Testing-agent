import { useState } from 'react';
import Sidebar from './Sidebar';
import OrganizationSelector from './OrganizationSelector';
import { useAuth } from '../../context/AuthContext';

function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser } = useAuth();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">
              Testing Agent Platform
            </h1>
            
            <div className="flex items-center gap-4">
              <OrganizationSelector />
              
              <div className="flex items-center gap-3">
                {currentUser?.photoURL && (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-9 h-9 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-gray-700 font-medium">
                  {currentUser?.displayName || 'User'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout; 