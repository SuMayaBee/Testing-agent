import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { metricsAPI, tasksAPI } from '../../lib/api';

// Restaurant data API endpoints 
const RESTAURANT_API_BASE_URL = 'https://phoneline-dashboard-backend-63qdm.ondigitalocean.app/api';

// Restaurant data functions using API calls
const restaurantFunctions = {
  getRestaurantData: async (phoneNumber) => {
    try {
      // Format phone number by removing any non-digit characters
      const formattedPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
      if (!formattedPhone) {
        throw new Error('Valid phone number is required');
      }
      
      // Use the correct endpoint format
      const response = await fetch(`${RESTAURANT_API_BASE_URL}/v1/restaurant/get-restaurant-info/${formattedPhone}`);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant data');
      }
      
      const data = await response.json();
      
      // Log the raw API response to help debug
      console.log("Raw API response:", data);
      
      if (data && data.restaurant) {
        // Process the restaurant data into the format we need
        const processedData = processRestaurantData(data.restaurant);
        
        // Fallback to hardcoded data for testing only if the customization dict is empty
        if (Object.keys(processedData.customization_dict).length === 0) {
          console.warn("No customization data found in API response. This could indicate an issue with data processing.");
        }
        
        return processedData;
      }
      
      throw new Error('Invalid restaurant data format');
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      throw error;
    }
  },
  
  findItemDetails: async (data, itemName) => {
    try {
      if (!data || !data.item_list || !data.customization_dict) {
        throw new Error('Invalid restaurant data');
      }
      
      // Find the item in the item_list
      let itemDetails = null;
      let basePrice = null;
      
      for (const item of data.item_list) {
        if (item[0] === itemName) {
          itemDetails = item;
          basePrice = item[1];
          break;
        }
      }
      
      if (!itemDetails) {
        return null;
      }
      
      // Get customization options if they exist
      const customizations = data.customization_dict[itemName] || [];
      
      return {
        name: itemName,
        base_price: basePrice,
        customizations: customizations
      };
    } catch (error) {
      console.error('Error finding item details:', error);
      throw error;
    }
  },
  
  calculateItemPrice: async (itemDetails, selectedOptions) => {
    try {
      if (!itemDetails) {
        return null;
      }
      
      let totalPrice = itemDetails.base_price;
      
      // Add customization prices
      for (const customization of itemDetails.customizations) {
        const customizationName = customization.name;
        if (customizationName in selectedOptions) {
          const selectedOption = selectedOptions[customizationName];
          
          for (const option of customization.options) {
            const optionName = option[0];
            if (optionName === selectedOption) {
              // Add price if it exists (option[1])
              if (option.length > 1) {
                totalPrice += option[1];
              }
              break;
            }
          }
        }
      }
      
      return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating price:', error);
      throw error;
    }
  }
};

/**
 * Process restaurant data from API to format needed by the component
 * Following the approach from the Python get_order_items.py file to match restaurant_data_full.json format
 */
function processRestaurantData(restaurantData) {
  // Extract categories
  const categories = restaurantData.categories || [];
  const categoryList = categories.map(cat => cat.name || cat);
  
  // Process the customization groups - handle different possible structures
  const customizationGroups = {}; 
  
  // Handle different possible structures for customization groups
  if (restaurantData.customizationGroups) {
    restaurantData.customizationGroups.forEach(group => {
      customizationGroups[group.id] = group;
    });
  }
  
  // Process items and their customizations
  const itemList = [];
  const customizationDict = {};
  
  // Process menu items
  const items = restaurantData.items || [];
  items.forEach(item => {
    const itemName = item.name;
    const itemPrice = applyTax(item.price || 0);
    
    // Check for customization IDs (API format) or direct customizations
    const hasCustomizations = (item.customizationIds && item.customizationIds.length > 0) || 
                             (item.customizations && item.customizations.length > 0);
    
    if (hasCustomizations) {
      // First handle API format with customizationIds
      if (item.customizationIds && item.customizationIds.length > 0) {
        // Get first customization name for the item list entry
        const firstCustomizationId = item.customizationIds[0];
        const firstGroup = customizationGroups[firstCustomizationId];
        let firstCustomizationName = "Customization";
        
        if (firstGroup) {
          firstCustomizationName = firstGroup.name || 
                                  firstGroup.customerInstruction || 
                                  "Customization";
        }
        
        // Add item to item_list with customization reference
        itemList.push([itemName, itemPrice, firstCustomizationName]);
        
        // Process customizations for this item
        customizationDict[itemName] = [];
        
        item.customizationIds.forEach(custId => {
          const group = customizationGroups[custId];
          
          if (group) {
            // Get options from the customization group
            const options = [];
            const groupOptions = group.options || [];
            
            groupOptions.forEach(option => {
              const optionName = option.name;
              const optionPrice = applyTax(option.price || 0);
              
              if (optionPrice > 0) {
                options.push([optionName, optionPrice]);
              } else {
                options.push([optionName]);
              }
            });
            
            // Get required status
            const rules = group.rules || {};
            const isRequired = (rules.minSelect || 0) > 0;
            
            // Add to customization dictionary
            if (options.length > 0) {
              customizationDict[itemName].push({
                name: group.name || group.customerInstruction || "Customization",
                options: options,
                required: isRequired
              });
            }
          }
        });
      }
      // Or handle direct customizations structure
      else if (item.customizations && item.customizations.length > 0) {
        // Get first customization name for item_list
        const firstCustomization = item.customizations[0];
        const firstCustomizationName = firstCustomization.name || "Customization";
        
        // Add to item_list
        itemList.push([itemName, itemPrice, firstCustomizationName]);
        
        // Process customizations
        customizationDict[itemName] = [];
        
        item.customizations.forEach(customization => {
          const options = [];
          
          // Process options for this customization
          const customizationOptions = customization.options || [];
          customizationOptions.forEach(option => {
            const optionName = option.name;
            const optionPrice = applyTax(option.price || 0);
            
            if (optionPrice > 0) {
              options.push([optionName, optionPrice]);
            } else {
              options.push([optionName]);
            }
          });
          
          // Add to customization dictionary
          if (options.length > 0) {
            customizationDict[itemName].push({
              name: customization.name || "Customization",
              options: options,
              required: customization.required || false
            });
          }
        });
      }
    } else {
      // No customizations
      itemList.push([itemName, itemPrice]);
    }
  });
  
  // Format restaurant name
  let restaurantName = restaurantData.name || 'Restaurant';
  
  // Try to get from greeting if available
  const greeting = restaurantData.greetings?.open || '';
  const nameMatch = greeting.match(/calling ([^!]+)!/);
  if (nameMatch && nameMatch[1]) {
    restaurantName = nameMatch[1].trim();
  }
  
  // Create final restaurant data structure matching expected format
  return {
    restaurant_name: restaurantName,
    restaurant_id: restaurantData.restaurantId || '',
    restaurant_address: restaurantData.address || '',
    phone_number: restaurantData.phonelineNumber || '',
    category_list: categoryList,
    item_list: itemList,
    customization_dict: customizationDict
  };
}

/**
 * Apply tax to a price (similar to Python implementation)
 */
function applyTax(price) {
  return Math.round(parseFloat(price || 0) * 1.13 * 100) / 100;
}

function CreateMetric() {
  const location = useLocation();
  const initialTask = location.state?.taskId;
  const initialType = location.state?.initialType || 'generic';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: initialType,
    evaluation_parameters: {},
    associated_tasks: initialTask ? [initialTask] : [],
    includes_restaurant_data: false
  });
  const [paramKey, setParamKey] = useState('');
  const [paramValue, setParamValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Restaurant data states
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [restaurantPhoneNumber, setRestaurantPhoneNumber] = useState('');
  const [restaurantData, setRestaurantData] = useState(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [menuItemDetails, setMenuItemDetails] = useState(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState({});
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // New state for multiple items
  const [restaurantOrderItems, setRestaurantOrderItems] = useState([]);
  const [currentItemInstructions, setCurrentItemInstructions] = useState('');
  const [restaurantMetricDescription, setRestaurantMetricDescription] = useState('');
  const [loadingRestaurantData, setLoadingRestaurantData] = useState(false);
  
  const { currentOrganizationUsername } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentOrganizationUsername) {
      fetchTasks();
    }
  }, [currentOrganizationUsername]);

  const fetchTasks = async () => {
    try {
      setTasksLoading(true);
      const tasks = await tasksAPI.getTasks(currentOrganizationUsername);
      setAvailableTasks(tasks);
      
      if (initialTask && formData.associated_tasks.includes(initialTask)) {
        const selectedTask = tasks.find(task => task.id === initialTask);
        if (selectedTask) {
          setFormData(prev => ({
            ...prev,
            name: prev.name || `${selectedTask.name} - Metric`
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskSelection = (taskId) => {
    setFormData(prev => {
      if (prev.associated_tasks.includes(taskId)) {
        return {
          ...prev,
          associated_tasks: prev.associated_tasks.filter(id => id !== taskId)
        };
      } else {
        return {
          ...prev,
          associated_tasks: [...prev.associated_tasks, taskId]
        };
      }
    });
  };

  const addParameter = () => {
    if (!paramKey.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      evaluation_parameters: {
        ...prev.evaluation_parameters,
        [paramKey]: paramValue
      }
    }));
    
    setParamKey('');
    setParamValue('');
  };

  const removeParameter = (key) => {
    setFormData(prev => {
      const newParams = { ...prev.evaluation_parameters };
      delete newParams[key];
      return {
        ...prev,
        evaluation_parameters: newParams
      };
    });
  };
  
  const handleRestaurantToggle = () => {
    setFormData(prev => ({
      ...prev,
      includes_restaurant_data: !prev.includes_restaurant_data
    }));
    setShowRestaurantForm(!showRestaurantForm);
  };

  // Fetch restaurant data based on phone number
  const fetchRestaurantData = async () => {
    if (!restaurantPhoneNumber.trim()) return;
    
    try {
      setLoadingRestaurantData(true);
      const data = await restaurantFunctions.getRestaurantData(restaurantPhoneNumber);
      
      console.log("Raw Restaurant Data:", data);
      console.log("Processed customization_dict:", data.customization_dict);
      
      setRestaurantData(data);
      setSelectedMenuItem('');
      setMenuItemDetails(null);
      setSelectedCustomizations({});
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      setError('Failed to fetch restaurant data. Please check the phone number and try again.');
    } finally {
      setLoadingRestaurantData(false);
    }
  };

  // Get details for a specific menu item
  const getMenuItemDetails = async () => {
    if (!restaurantData || !selectedMenuItem) return;
    
    try {
      setLoadingRestaurantData(true);
      const itemDetails = await restaurantFunctions.findItemDetails(restaurantData, selectedMenuItem);
      
      console.log("Selected Menu Item:", selectedMenuItem);
      console.log("Item Details:", itemDetails);
      
      setMenuItemDetails(itemDetails);
      setSelectedCustomizations({});
    } catch (error) {
      console.error('Error getting menu item details:', error);
      setError('Failed to get menu item details.');
    } finally {
      setLoadingRestaurantData(false);
    }
  };

  // Handle customization selection
  const handleCustomizationChange = (customizationName, optionValue) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [customizationName]: optionValue
    }));
  };

  // Add current item to order list
  const addItemToOrder = async () => {
    if (!restaurantData || !menuItemDetails) return;
    
    try {
      setLoadingRestaurantData(true);
      // Calculate price with selected customizations
      const finalPrice = await restaurantFunctions.calculateItemPrice(menuItemDetails, selectedCustomizations);
      
      // Calculate customization additional cost
      const basePrice = menuItemDetails.base_price;
      const customizationPrice = finalPrice - basePrice;
      
      // Add to order items list
      const orderItem = {
        restaurant: restaurantData.restaurant_name,
        restaurantAddress: restaurantData.restaurant_address,
        phone: restaurantData.phone_number,
        item: menuItemDetails.name,
        basePrice: basePrice,
        customizationPrice: customizationPrice,
        finalPrice: finalPrice,
        customizations: {...selectedCustomizations},
        instructions: currentItemInstructions
      };
      
      setRestaurantOrderItems(prev => [...prev, orderItem]);
      
      // Reset current item inputs
      setSelectedMenuItem('');
      setMenuItemDetails(null);
      setSelectedCustomizations({});
      setCurrentItemInstructions('');
    } catch (error) {
      console.error('Error adding item to order:', error);
      setError('Failed to calculate item price.');
    } finally {
      setLoadingRestaurantData(false);
    }
  };
  
  // Remove an item from the order
  const removeOrderItem = (index) => {
    setRestaurantOrderItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Add all restaurant data to the metric
  const addRestaurantDataToMetric = () => {
    if (!restaurantData) return;
    if (restaurantOrderItems.length === 0 && menuItemDetails) {
      // If we have current item details but haven't added it yet
      addItemToOrder();
    }
    
    if (restaurantOrderItems.length === 0) {
      setError('Please add at least one menu item to the order');
      return;
    }
    
    // Create description text for all restaurant data
    const restaurantDescription = `
Restaurant: ${restaurantData.restaurant_name}
Phone: ${restaurantData.phone_number}
Address: ${restaurantData.restaurant_address}

Items:
${restaurantOrderItems.map((item, index) => `
${index + 1}. ${item.item}
   Base Price: $${item.basePrice.toFixed(2)}
   ${item.customizationPrice > 0 ? `Customization Price: +$${item.customizationPrice.toFixed(2)}` : ''}
   Total Price: $${item.finalPrice.toFixed(2)}
   Customizations: ${Object.entries(item.customizations).map(([name, value]) => `${name}: ${value}`).join(', ')}
   ${item.instructions ? `Instructions: ${item.instructions}` : ''}
`).join('')}

Order Total: $${restaurantOrderItems.reduce((sum, item) => sum + item.finalPrice, 0).toFixed(2)}

${additionalInstructions ? `Additional Order Instructions: ${additionalInstructions}` : ''}
`.trim();

    setRestaurantMetricDescription(restaurantDescription);
    
    // Add restaurant data to form
    setFormData(prev => ({
      ...prev,
      evaluation_parameters: {
        ...prev.evaluation_parameters,
        restaurant_name: restaurantData.restaurant_name,
        restaurant_phone: restaurantData.phone_number,
        order_items: JSON.stringify(restaurantOrderItems),
        order_total: restaurantOrderItems.reduce((sum, item) => sum + item.finalPrice, 0),
        additional_instructions: additionalInstructions
      },
      description: prev.description 
        ? `${prev.description}\n\n${restaurantDescription}`
        : restaurantDescription
    }));
    
    setShowRestaurantForm(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentOrganizationUsername) {
      setError('Please select an organization first');
      return;
    }

    if (formData.type === 'task-specific' && formData.associated_tasks.length === 0) {
      setError('Task-specific metrics must be associated with at least one task');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const metricData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        evaluation_parameters: formData.evaluation_parameters,
        includes_restaurant_data: formData.includes_restaurant_data
      };
      console.log('Creating metric with data:', metricData);
      
      const createdMetric = await metricsAPI.createMetric(
        currentOrganizationUsername,
        currentUser.email,
        metricData
      );
      console.log('Metric created:', createdMetric);
      
      if (formData.type === 'task-specific' && formData.associated_tasks.length > 0) {
        console.log('This is a task-specific metric with associated tasks:', formData.associated_tasks);
        
        await Promise.all(formData.associated_tasks.map(async (taskId) => {
          console.log(`Updating task ${taskId} with the new metric`);
          const taskData = await tasksAPI.getTask(currentOrganizationUsername, taskId);
          console.log(`Current task data:`, taskData);
          console.log('Current task_specific_metrics:', taskData.task_specific_metrics);
          
          const updatedTaskData = {
            ...taskData,
            task_specific_metrics: [
              ...(taskData.task_specific_metrics || []),
              createdMetric.id
            ]
          };
          console.log('Updated task data:', updatedTaskData);
          
          return tasksAPI.updateTask(
            currentOrganizationUsername,
            taskId,
            updatedTaskData
          );
        }));
      }
      
      if (initialTask) {
        navigate(`/tasks/${initialTask}`);
      } else {
        navigate('/metrics');
      }
    } catch (err) {
      setError(err.message || 'Failed to create metric');
      console.error('Error creating metric:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container">
      <h1>Create Metric</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Metric Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="e.g., Order Completion Rate"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="form-control"
            rows="3"
            placeholder="Describe what this metric measures and how it's calculated"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Metric Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="form-control"
          >
            <option value="generic">Generic</option>
            <option value="task-specific">Task-Specific</option>
          </select>
          {formData.type === 'generic' && (
            <p className="text-xs text-gray-500 mt-1">
              Generic metrics can be applied to any test
            </p>
          )}
          {formData.type === 'task-specific' && (
            <p className="text-xs text-gray-500 mt-1">
              Task-specific metrics are designed for specific testing scenarios
            </p>
          )}
        </div>
        
        {/* Restaurant Data Integration */}
        <div className="form-group">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includes_restaurant_data"
              checked={formData.includes_restaurant_data}
              onChange={handleRestaurantToggle}
              className="mr-2"
            />
            <label htmlFor="includes_restaurant_data" className="font-medium cursor-pointer">
              Include Restaurant Details
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add restaurant menu items and customizations to this metric
          </p>
        </div>
        
        {/* Restaurant Data Form */}
        {showRestaurantForm && (
          <div className="bg-gray-50 p-4 rounded-md border mt-2 mb-4">
            <h3 className="text-lg font-medium mb-3">Restaurant Details</h3>
            
            {/* Phone Number Input */}
            <div className="mb-4">
              <label className="block mb-1">Phone Number</label>
              <div className="flex space-x-2">
                <input
                  type="tel"
                  value={restaurantPhoneNumber}
                  onChange={(e) => setRestaurantPhoneNumber(e.target.value)}
                  placeholder="e.g., +19202808073"
                  className="form-control flex-1"
                />
                <button 
                  type="button" 
                  onClick={fetchRestaurantData}
                  disabled={loadingRestaurantData}
                  className="btn btn-secondary"
                >
                  {loadingRestaurantData ? 'Loading...' : 'Lookup'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Hint: Last digit determines restaurant type - 0-3: Indian, 4-6: Italian, 7-9: Chinese
              </p>
            </div>
            
            {/* Loading indicator */}
            {loadingRestaurantData && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            )}
            
            {/* Restaurant Info */}
            {restaurantData && (
              <div className="mb-4 p-3 bg-white rounded border">
                <h4 className="font-medium">{restaurantData.restaurant_name}</h4>
                <p className="text-sm">{restaurantData.restaurant_address}</p>
                <p className="text-sm">Phone: {restaurantData.phone_number}</p>
              </div>
            )}
            
            {/* Current Order Items List */}
            {restaurantOrderItems.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Current Order Items</h4>
                <div className="border rounded-md divide-y">
                  {restaurantOrderItems.map((item, index) => (
                    <div key={index} className="p-3 bg-white">
                      <div className="flex justify-between">
                        <h5 className="font-medium">{item.item}</h5>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-sm">Base Price: ${item.basePrice.toFixed(2)}</p>
                      {item.customizationPrice > 0 && (
                        <p className="text-sm">Customization Price: +${item.customizationPrice.toFixed(2)}</p>
                      )}
                      <p className="text-sm font-medium">Total Price: ${item.finalPrice.toFixed(2)}</p>
                      {Object.keys(item.customizations).length > 0 && (
                        <div className="text-sm mt-1">
                          <p>Customizations:</p>
                          <ul className="pl-5 list-disc">
                            {Object.entries(item.customizations).map(([name, value], i) => (
                              <li key={i}>{name}: {value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.instructions && (
                        <p className="text-sm mt-1">Instructions: {item.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 p-2 rounded mt-2">
                  <p className="font-medium">Order Total: ${restaurantOrderItems.reduce((sum, item) => sum + item.finalPrice, 0).toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Add New Item Section */}
            {restaurantData && (
              <div className="mb-4 p-3 bg-white rounded border">
                <h4 className="font-medium mb-2">Add Menu Item</h4>
                
                {/* Menu Item Selection */}
                <div className="mb-3">
                  <label className="block mb-1">Select Menu Item</label>
                  <div className="flex space-x-2">
                    <select 
                      value={selectedMenuItem}
                      onChange={(e) => setSelectedMenuItem(e.target.value)}
                      className="form-control flex-1"
                    >
                      <option value="">-- Select an item --</option>
                      {restaurantData.item_list.map((item, index) => (
                        <option key={index} value={item[0]}>
                          {item[0]} - ${item[1].toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={getMenuItemDetails}
                      disabled={!selectedMenuItem}
                      className="btn btn-secondary"
                    >
                      Get Details
                    </button>
                  </div>
                </div>
                
                {/* Item Customizations */}
                {menuItemDetails && (
                  <div className="mb-3">
                    <h5 className="font-medium mb-2">Customizations</h5>
                    {menuItemDetails.customizations && menuItemDetails.customizations.length > 0 ? (
                      menuItemDetails.customizations.map((customization, index) => (
                        <div key={index} className="mb-2">
                          <label className="block mb-1">
                            {customization.name} {customization.required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={selectedCustomizations[customization.name] || ''}
                            onChange={(e) => handleCustomizationChange(customization.name, e.target.value)}
                            className="form-control w-full"
                            required={customization.required}
                          >
                            <option value="">-- Select an option --</option>
                            {customization.options && customization.options.length > 0 ? (
                              customization.options.map((option, optIndex) => (
                                <option key={optIndex} value={option[0]}>
                                  {option[0]} {option.length > 1 ? `(+$${option[1].toFixed(2)})` : ''}
                                </option>
                              ))
                            ) : (
                              <option disabled>No options available</option>
                            )}
                          </select>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">No customization options available for this item.</div>
                    )}
                  </div>
                )}
                
                {/* Item Instructions */}
                {menuItemDetails && (
                  <div className="mb-3">
                    <label className="block mb-1">Item Instructions</label>
                    <textarea
                      value={currentItemInstructions}
                      onChange={(e) => setCurrentItemInstructions(e.target.value)}
                      className="form-control w-full"
                      rows="2"
                      placeholder="Special instructions for this item..."
                    />
                  </div>
                )}
                
                {/* Add Item Button */}
                {menuItemDetails && (
                  <button
                    type="button"
                    onClick={addItemToOrder}
                    disabled={loadingRestaurantData}
                    className="btn btn-secondary w-full"
                  >
                    {loadingRestaurantData ? 'Processing...' : 'Add Item to Order'}
                  </button>
                )}
              </div>
            )}
            
            {/* Additional Order Instructions */}
            {restaurantData && (
              <div className="mb-4">
                <label className="block mb-1">Additional Order Instructions</label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="form-control w-full"
                  rows="3"
                  placeholder="Add any special instructions for the entire order..."
                />
              </div>
            )}
            
            {/* Add to Metric Button */}
            {restaurantData && (restaurantOrderItems.length > 0 || menuItemDetails) && (
              <button
                type="button"
                onClick={addRestaurantDataToMetric}
                className="btn btn-primary w-full"
              >
                Add Order to Metric
              </button>
            )}
          </div>
        )}
        
        {/* Restaurant Data Preview */}
        {formData.includes_restaurant_data && restaurantMetricDescription && !showRestaurantForm && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium mb-2">Restaurant Order Added</h3>
              <button
                type="button"
                onClick={() => setShowRestaurantForm(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
              {restaurantMetricDescription}
            </pre>
          </div>
        )}
        
        {formData.type === 'task-specific' && (
          <div className="form-group">
            <label>Associated Tasks</label>
            <p className="text-xs text-gray-500 mb-2">
              Select the tasks this metric is designed to evaluate
            </p>
            
            {tasksLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
                No tasks available. <a href="/tasks/create" className="text-blue-600 hover:underline">Create a task</a> first.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                {availableTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`p-3 flex items-start ${formData.associated_tasks.includes(task.id) ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      id={`task-${task.id}`}
                      checked={formData.associated_tasks.includes(task.id)}
                      onChange={() => handleTaskSelection(task.id)}
                      className="mt-1 mr-3"
                    />
                    <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{task.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{task.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="form-group">
          <label>Evaluation Parameters</label>
          
          {Object.keys(formData.evaluation_parameters).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Current Parameters</h4>
              <ul className="divide-y divide-gray-200 border rounded-md">
                {Object.entries(formData.evaluation_parameters).map(([key, value]) => (
                  <li key={key} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium">{key}:</span> {value.toString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Parameter name"
              value={paramKey}
              onChange={(e) => setParamKey(e.target.value)}
              className="form-control flex-1"
            />
            <input
              type="text"
              placeholder="Value"
              value={paramValue}
              onChange={(e) => setParamValue(e.target.value)}
              className="form-control flex-1"
            />
            <button
              type="button"
              onClick={addParameter}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add parameters that will be used to configure this metric's evaluation
          </p>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => initialTask ? navigate(`/tasks/${initialTask}`) : navigate('/metrics')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Metric'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateMetric; 