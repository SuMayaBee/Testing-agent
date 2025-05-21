import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export function AppProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganizationUsername, setCurrentOrganizationUsername] = useState(null);
  const [currentOrganizationInfo, setCurrentOrganizationInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const { currentUser } = useAuth();

  // Fetch user's organizations when user is authenticated
  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userEmail = currentUser.email;
        const userDocRef = doc(db, 'user-emails', userEmail);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOrganizations(userData.organizations || []);
          
          // If user has organizations, set the active one
          if (userData.organizations && userData.organizations.length > 0) {
            const activeOrg = userData.active_organization || userData.organizations[0];
            setCurrentOrganizationUsername(activeOrg);
          }
        } else {
          // Create user document if it doesn't exist
          const newUserData = {
            email: userEmail,
            name: currentUser.displayName,
            organizations: [],
          };
          await updateDoc(userDocRef, newUserData);
          setOrganizations([]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [currentUser]);

  // Fetch organization info when current organization changes
  useEffect(() => {
    async function fetchOrganizationData() {
      if (!currentOrganizationUsername) {
        setCurrentOrganizationInfo(null);
        return;
      }

      try {
        const orgDocRef = doc(db, 'organizations', currentOrganizationUsername);
        const orgDoc = await getDoc(orgDocRef);

        if (orgDoc.exists()) {
          setCurrentOrganizationInfo({
            id: orgDoc.id,
            ...orgDoc.data()
          });
        } else {
          setCurrentOrganizationInfo(null);
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
        setCurrentOrganizationInfo(null);
      }
    }

    fetchOrganizationData();
  }, [currentOrganizationUsername]);

  // Update user's active organization when it changes
  useEffect(() => {
    async function updateActiveOrganization() {
      if (!currentUser || !currentOrganizationUsername) return;

      try {
        const userEmail = currentUser.email;
        const userDocRef = doc(db, 'user-emails', userEmail);
        await updateDoc(userDocRef, {
          active_organization: currentOrganizationUsername
        });
      } catch (error) {
        console.error('Error updating active organization:', error);
      }
    }

    updateActiveOrganization();
  }, [currentUser, currentOrganizationUsername]);

  const value = {
    organizations,
    currentOrganizationUsername,
    setCurrentOrganizationUsername,
    currentOrganizationInfo,
    loading
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
} 