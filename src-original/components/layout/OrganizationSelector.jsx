import { useApp } from '../../context/AppContext';

function OrganizationSelector() {
  const { organizations, currentOrganizationUsername, setCurrentOrganizationUsername } = useApp();
  
  if (!organizations || organizations.length === 0) {
    return null;
  }
  
  return (
    <div className="relative">
      <select
        value={currentOrganizationUsername || ''}
        onChange={(e) => setCurrentOrganizationUsername(e.target.value)}
        className="appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {organizations.map((org) => (
          <option key={org} value={org}>
            {org}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
}

export default OrganizationSelector; 