import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { testsAPI, tasksAPI, metricsAPI } from '../../lib/api';

// Add these step colors
const STEP_COLORS = {
  greeting: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  phoneConfirmation: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  deliveryMethod: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500' },
  orderItems: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500' },
  customizationPriceCheck: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  orderRecap: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-500' },
  wrapup: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-500' }
};

function CreateTest() {
  const navigate = useNavigate();
  const { currentOrganizationUsername } = useApp();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    target_phone_numbers: [''],
    tasks: [],
    metrics: [],
    customerName: 'Sumaiya',
    promptSteps: [
      { id: 'greeting', label: '1 - Greeting / Name / Intent', enabled: false },
      { id: 'phoneConfirmation', label: '2 - Phone-Number Confirmation', enabled: false },
      { id: 'deliveryMethod', label: '3 - Delivery Method', enabled: false },
      { id: 'orderItems', label: '4 - Ordering Items', enabled: false },
      { id: 'customizationPriceCheck', label: '5 - Customization-Price Check', enabled: false },
      { id: 'orderRecap', label: '6 - Order Recap & Confirmation', enabled: false },
      { id: 'wrapup', label: '7 - Wrap-up', enabled: false }
    ],
    deliveryOptions: {
      method: 'pickup', // pickup or delivery
      address: '105 Main Street, Toronto, Ontario, Canada, MK5 2K7'
    },
    orderItems: []
  });
  
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [taskSpecificMetricsMap, setTaskSpecificMetricsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingResources, setLoadingResources] = useState(true);
  
  // Add new state for restaurant data handling
  const [restaurantData, setRestaurantData] = useState(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [menuItemDetails, setMenuItemDetails] = useState(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState({});
  const [currentItemInstructions, setCurrentItemInstructions] = useState('');
  const [loadingRestaurantData, setLoadingRestaurantData] = useState(false);
  
  // Add new state for restaurant phone
  const [restaurantPhoneNumber, setRestaurantPhoneNumber] = useState('');
  
  // Update the custom step creation state
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [showAddStepForm, setShowAddStepForm] = useState(false);
  
  // Add restaurant data functions
  const RESTAURANT_API_BASE_URL = 'https://phoneline-dashboard-backend-63qdm.ondigitalocean.app/api';
  
  // Add new state for manual item entry
  const [manualItemMode, setManualItemMode] = useState(false);
  const [manualItem, setManualItem] = useState({
    name: '',
    customizations: '',
    instructions: ''
  });
  
  // Add function to process restaurant data
  function processRestaurantData(restaurantData) {
    // Extract categories
    const categories = restaurantData.categories || [];
    const categoryList = categories.map(cat => cat.name || cat);
    
    // Process the customization groups
    const customizationGroups = {}; 
    
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
      
      const hasCustomizations = (item.customizationIds && item.customizationIds.length > 0) || 
                               (item.customizations && item.customizations.length > 0);
      
      if (hasCustomizations) {
        if (item.customizationIds && item.customizationIds.length > 0) {
          const firstCustomizationId = item.customizationIds[0];
          const firstGroup = customizationGroups[firstCustomizationId];
          let firstCustomizationName = "Customization";
          
          if (firstGroup) {
            firstCustomizationName = firstGroup.name || 
                                    firstGroup.customerInstruction || 
                                    "Customization";
          }
          
          itemList.push([itemName, itemPrice, firstCustomizationName]);
          
          customizationDict[itemName] = [];
          
          item.customizationIds.forEach(custId => {
            const group = customizationGroups[custId];
            
            if (group) {
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
              
              const rules = group.rules || {};
              const isRequired = (rules.minSelect || 0) > 0;
              
              if (options.length > 0) {
                customizationDict[itemName].push({
                  name: group.name || group.customerInstruction || "Customization",
                  options: options,
                  required: isRequired
                });
              }
            }
          });
        } else if (item.customizations && item.customizations.length > 0) {
          const firstCustomization = item.customizations[0];
          const firstCustomizationName = firstCustomization.name || "Customization";
          
          itemList.push([itemName, itemPrice, firstCustomizationName]);
          
          customizationDict[itemName] = [];
          
          item.customizations.forEach(customization => {
            const options = [];
            
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
        itemList.push([itemName, itemPrice]);
      }
    });
    
    let restaurantName = restaurantData.name || 'Restaurant';
    
    const greeting = restaurantData.greetings?.open || '';
    const nameMatch = greeting.match(/calling ([^!]+)!/);
    if (nameMatch && nameMatch[1]) {
      restaurantName = nameMatch[1].trim();
    }
    
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

  function applyTax(price) {
    return Math.round(parseFloat(price || 0) * 1.13 * 100) / 100;
  }

  // Update getRestaurantData to use the processing function
  const getRestaurantData = async () => {
    if (!restaurantPhoneNumber.trim()) {
      setError('Please enter a restaurant phone number');
      return;
    }

    try {
      setLoadingRestaurantData(true);
      const formattedPhone = restaurantPhoneNumber.replace(/\D/g, '');
      
      const response = await fetch(`${RESTAURANT_API_BASE_URL}/v1/restaurant/get-restaurant-info/${formattedPhone}`);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant data');
      }
      const data = await response.json();
      
      if (data && data.restaurant) {
        const processedData = processRestaurantData(data.restaurant);
        setRestaurantData(processedData);
        setSelectedMenuItem('');
        setMenuItemDetails(null);
        setSelectedCustomizations({});
      } else {
        throw new Error('Invalid restaurant data format');
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      setError('Failed to fetch restaurant data. Please check the phone number and try again.');
    } finally {
      setLoadingRestaurantData(false);
    }
  };

  // Add function to find item details
  const findItemDetails = (itemName) => {
    if (!restaurantData || !restaurantData.item_list || !restaurantData.customization_dict) {
      return null;
    }
    
    let itemDetails = null;
    let basePrice = null;
    
    for (const item of restaurantData.item_list) {
      if (item[0] === itemName) {
        itemDetails = item;
        basePrice = item[1];
        break;
      }
    }
    
    if (!itemDetails) {
      return null;
    }
    
    const customizations = restaurantData.customization_dict[itemName] || [];
    
    return {
      name: itemName,
      base_price: basePrice,
      customizations: customizations
    };
  };

  // Update the menu item selection handler
  const handleMenuItemSelect = (itemName) => {
    setSelectedMenuItem(itemName);
    const details = findItemDetails(itemName);
    setMenuItemDetails(details);
    setSelectedCustomizations({});
  };
  
  // Add function to handle adding items to order
  const addItemToOrder = () => {
    if (!selectedMenuItem || !menuItemDetails) return;

    const newItem = {
      name: selectedMenuItem,
      customizations: Object.entries(selectedCustomizations)
        .map(([name, value]) => `${name}: ${value}`)
        .join(', '),
      instructions: currentItemInstructions
    };

    setFormData(prev => ({
      ...prev,
      orderItems: [...prev.orderItems, newItem]
    }));

    // Reset current item inputs
    setSelectedMenuItem('');
    setMenuItemDetails(null);
    setSelectedCustomizations({});
    setCurrentItemInstructions('');
  };

  // Add function to handle manual item entry
  const addManualItemToOrder = () => {
    if (!manualItem.name.trim()) return;

    const newItem = {
      name: manualItem.name.trim(),
      customizations: manualItem.customizations.trim(),
      instructions: manualItem.instructions.trim()
    };

    setFormData(prev => ({
      ...prev,
      orderItems: [...prev.orderItems, newItem]
    }));

    // Reset manual item inputs
    setManualItem({
      name: '',
      customizations: '',
      instructions: ''
    });
  };

  // Handle manual item input changes
  const handleManualItemChange = (field, value) => {
    setManualItem(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add function to remove item from order
  const removeOrderItem = (index) => {
    setFormData(prev => ({
      ...prev,
      orderItems: prev.orderItems.filter((_, i) => i !== index)
    }));
  };
  
  // Fetch available tasks and metrics
  useEffect(() => {
    async function fetchResources() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoadingResources(true);
        const [tasks, metrics] = await Promise.all([
          tasksAPI.getTasks(currentOrganizationUsername),
          metricsAPI.getMetrics(currentOrganizationUsername)
        ]);
        console.log("All metrics from backend")
        console.log(metrics)
        setAvailableTasks(tasks);
        setAvailableMetrics(metrics);
        
        // No longer auto-selecting generic metrics
        // Let users manually select all metrics
        
        // Create a map of task-specific metrics for each task
        const taskMetricsMap = {};
        
        // For each task, fetch its task-specific metrics
        await Promise.all(
          tasks.map(async (task) => {
            try {
              const taskSpecificMetrics = await metricsAPI.getTaskSpecificMetrics(
                currentOrganizationUsername, 
                task.id
              );
              
              if (taskSpecificMetrics && taskSpecificMetrics.length > 0) {
                taskMetricsMap[task.id] = taskSpecificMetrics.map(metric => metric.id);
              } else {
                taskMetricsMap[task.id] = [];
              }
            } catch (err) {
              console.error(`Error fetching task-specific metrics for task ${task.id}:`, err);
              taskMetricsMap[task.id] = [];
            }
          })
        );
        
        setTaskSpecificMetricsMap(taskMetricsMap);
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Failed to load tasks and metrics. Please try again.');
      } finally {
        setLoadingResources(false);
      }
    }
    
    fetchResources();
  }, [currentOrganizationUsername]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePhoneNumberChange = (index, value) => {
    const updatedPhoneNumbers = [...formData.target_phone_numbers];
    updatedPhoneNumbers[index] = value;
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: updatedPhoneNumbers
    }));
  };
  
  const addPhoneNumber = () => {
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: [...prev.target_phone_numbers, '']
    }));
  };
  
  const removePhoneNumber = (index) => {
    const updatedPhoneNumbers = [...formData.target_phone_numbers];
    updatedPhoneNumbers.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: updatedPhoneNumbers
    }));
  };
  
  const handleTaskSelection = (e) => {
    const taskId = e.target.value;
    const isChecked = e.target.checked;
    
    setFormData(prev => {
      let updatedTasks = isChecked 
        ? [...prev.tasks, taskId]
        : prev.tasks.filter(id => id !== taskId);
      
      return {
        ...prev,
        tasks: updatedTasks
        // No longer automatically adding task-specific metrics
      };
    });
  };
  
  const handleMetricSelection = (e) => {
    const metricId = e.target.value;
    const isChecked = e.target.checked;
    
    setFormData(prev => {
      const updatedMetrics = isChecked
        ? [...prev.metrics, metricId]
        : prev.metrics.filter(id => id !== metricId);
      
      return {
        ...prev,
        metrics: updatedMetrics
      };
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentOrganizationUsername) {
      setError('Please select an organization first');
      return;
    }
    
    // Validate form data
    if (!formData.name.trim()) {
      setError('Test name is required');
      return;
    }
    
    if (!formData.system_prompt.trim()) {
      setError('System prompt is required');
      return;
    }
    
    // Filter out empty phone numbers
    const phoneNumbers = formData.target_phone_numbers.filter(num => num.trim());
    if (phoneNumbers.length === 0) {
      setError('At least one target phone number is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Clean up formData for submission
      const testData = {
        ...formData,
        target_phone_numbers: phoneNumbers,
      };
      
      console.log('Creating test with data:', testData);
      
      const createdTest = await testsAPI.createTest(
        currentOrganizationUsername,
        currentUser.email,
        testData
      );
      
      console.log('Test created:', createdTest);
      
      // Navigate to the test detail page
      navigate(`/tests/${createdTest.id}`);
    } catch (err) {
      console.error('Error creating test:', err);
      setError(err.message || 'Failed to create test. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get associated task names for a metric
  const getAssociatedTaskNames = (metricId) => {
    // Find tasks that have this metric in their task-specific metrics list
    const associatedTaskIds = Object.entries(taskSpecificMetricsMap)
      .filter(([_, metricIds]) => metricIds.includes(metricId))
      .map(([taskId]) => taskId);

    if (associatedTaskIds.length === 0) {
      return "Task-specific metric";
    }

    // Get task names from the IDs
    const taskNames = associatedTaskIds.map(taskId => {
      const task = availableTasks.find(t => t.id === taskId);
      return task ? task.name : "Unknown task";
    });

    // Format the display
    if (taskNames.length === 1) {
      return `Associated with: ${taskNames[0]}`;
    } else if (taskNames.length === 2) {
      return `Associated with: ${taskNames.join(" and ")}`;
    } else {
      return `Associated with ${taskNames.length} tasks`;
    }
  };
  
  // Check if any task associated with this metric is selected
  const isMetricTaskSelected = (metricId) => {
    // Find tasks that have this metric in their task-specific metrics
    const associatedTaskIds = Object.entries(taskSpecificMetricsMap)
      .filter(([_, metricIds]) => metricIds.includes(metricId))
      .map(([taskId]) => taskId);
    
    // Check if any of these tasks are selected
    return associatedTaskIds.some(taskId => formData.tasks.includes(taskId));
  };
  
  // New drag state
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  
  // Replace handleDragEnd with these simpler drag functions
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setDraggedItemIndex(index);
    
    // Add a class to indicate dragging
    setTimeout(() => {
      document.getElementById(`step-row-${index}`).classList.add('opacity-50');
    }, 0);
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
    return false;
  };
  
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    
    // Get the source index
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex === targetIndex) {
      // Remove dragging class if dropped at same place
      document.getElementById(`step-row-${sourceIndex}`).classList.remove('opacity-50');
      setDraggedItemIndex(null);
      return;
    }
    
    // Move the item in the array
    const items = [...formData.promptSteps];
    const [movedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, movedItem);
    
    // Update the step numbers
    const updatedItems = items.map((item, index) => {
      return {
        ...item,
        label: `${index + 1} - ${item.label.split(' - ')[1]}`
      };
    });
    
    // Update state
    setFormData(prev => ({
      ...prev,
      promptSteps: updatedItems
    }));
    
    // Remove dragging class
    setDraggedItemIndex(null);
  };
  
  const handleDragEnd = (e) => {
    // Clean up any lingering opacity classes
    if (draggedItemIndex !== null) {
      const element = document.getElementById(`step-row-${draggedItemIndex}`);
      if (element) element.classList.remove('opacity-50');
      setDraggedItemIndex(null);
    }
  };
  
  // Toggle step enabled/disabled
  const toggleStepEnabled = (index) => {
    const updatedSteps = [...formData.promptSteps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      enabled: !updatedSteps[index].enabled
    };
    
    setFormData(prev => ({
      ...prev,
      promptSteps: updatedSteps
    }));
  };
  
  // Update the function to add a new custom step
  const addCustomStep = () => {
    if (!newStepName.trim()) return;
    
    const newStep = {
      id: `custom_${Date.now()}`, // Generate unique ID
      label: `${formData.promptSteps.length + 1} - ${newStepName.trim()}`,
      description: newStepDescription.trim() || `Instructions for ${newStepName.trim()}`,
      enabled: true,
      isCustom: true // Flag to identify custom steps
    };
    
    // Add the new step to the promptSteps array
    const updatedSteps = [...formData.promptSteps, newStep];
    
    setFormData(prev => ({
      ...prev,
      promptSteps: updatedSteps
    }));
    
    // Clear the input fields
    setNewStepName('');
    setNewStepDescription('');
    setShowAddStepForm(false);
  };
  
  // Function to remove a step (for custom steps)
  const removeStep = (index) => {
    const updatedSteps = [...formData.promptSteps];
    updatedSteps.splice(index, 1);
    
    // Update the step numbers
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      label: `${i + 1} - ${step.label.split(' - ')[1]}`
    }));
    
    setFormData(prev => ({
      ...prev,
      promptSteps: renumberedSteps
    }));
  };
  
  // Update generateDynamicPrompt to use the fixed prompt structure
  const generateDynamicPrompt = () => {
    const numItems = formData.orderItems.length || 2; // Default to 2 if no items specified
    const customerName = formData.customerName || 'Sumaiya';
    const deliveryMethod = formData.deliveryOptions.method === 'pickup' ? 'Pickup, please.' : 'Delivery, it is.';
    
    // Debug logging
    console.log('generateDynamicPrompt called');
    console.log('formData.orderItems:', formData.orderItems);
    console.log('numItems:', numItems);
    
    let prompt = `System Prompt
Customer Order Script – Two-Item Customization Test 🍕

Role & Purpose:

You are "Customer Test C21," an AI caller stress-testing the restaurant's phone-order workflow.

Goal:
Order ${numItems} menu item${numItems > 1 ? 's' : ''}, each with a customization, and ensure the agent follows the required steps:

Asks for your name.

Confirms pickup or delivery.

Quotes the price of each customization only after confirming the order.

Provides subtotal, tax, and any fees after confirming the order, without rushing, interruptions, or premature price mentions.

General Rules:
Tone:
Speak naturally and conversationally. Do not sound robotic or overly formal. You should sound like a real person placing a normal order.

Response Time:
Respond immediately after the agent finishes speaking.
No delays or hesitation. You should reply as soon as the agent finishes talking—do not leave any awkward pauses.

Interaction Flow:
No Interruptions:
Do not interrupt the agent. Always wait for the agent to finish speaking before you respond.

You must wait for them to fully acknowledge your response before moving to the next part of the order.

Concise Answers:
Answer only what is asked. Keep your responses short, direct, and to the point.
Do not add extra information unless explicitly asked for it by the agent. Only answer the specific question they ask.

Pause Naturally:
At the end of your sentence, make a natural pause and wait for the agent to respond.
Do not rush to continue talking. If you speak over the agent, it disrupts the flow.

Wait for the agent to acknowledge each response before continuing.

No Volunteering Information:
Never offer extra details or information unless the agent specifically asks for it.
Do not share anything that isn't directly requested. This is essential to avoid confusion and ensure that the agent handles the conversation properly.

Interrupting the Agent:
If the agent talks over you, stop immediately. Wait for them to finish their sentence, and then repeat your last sentence.
Do not continue talking if the agent is still speaking. It's important to respect the flow of the conversation.

Pricing Details:
Do not mention or ask for any pricing during the order placement.
Do not talk about the cost of customizations during the order process.
After confirming the order, if there are additional costs for customizations, the agent will tell you at that point.
Only after the order is confirmed should you inquire about additional charges. Never talk about prices before the order confirmation.

Scripted Interaction:

Greeting / Name / Intent:
If the agent asks for your name:
You: "I'm ${customerName}."

If the agent does not ask for your name:
You: "I'd like to place an order."

Pause before proceeding to the next step.

Delivery Method:
Agent asks for pickup or delivery:
You: "${deliveryMethod}"

Pause after responding and wait for the agent to confirm before moving to the next step.

Ordering ${numItems} Item${numItems > 1 ? 's' : ''}:
`;

    // Add dynamic order items
    if (formData.orderItems.length > 0) {
      console.log('Adding dynamic order items:', formData.orderItems.length);
      formData.orderItems.forEach((item, index) => {
        const stepLetter = String.fromCharCode(65 + index); // A, B, C, etc.
        const isFirst = index === 0;
        
        // Format customizations more naturally
        let customizationText = '';
        if (item.customizations) {
          // Split customizations and format them naturally
          const customizations = item.customizations.split(', ').filter(Boolean);
          const formattedCustomizations = customizations.map(customization => {
            const [category, choice] = customization.split(': ');
            
            // Remove "Choose your" and similar phrases, make it more natural
            const cleanCategory = category
              .replace(/Choose your /gi, '')
              .replace(/Choice of /gi, '')
              .replace(/Choice\?/gi, '')
              .replace(/Legendary /gi, '')
              .trim()
              .toLowerCase();
            
            // Format as "I want [choice] [category]"
            return `I want ${choice} ${cleanCategory}`;
          });
          
          if (formattedCustomizations.length > 0) {
            customizationText = `. ${formattedCustomizations.join(', ')}`;
          }
        }
        
        const instructionText = item.instructions ? ` ${item.instructions}` : '';
        
        console.log(`Adding item ${index + 1}:`, item);
        
        prompt += `
3${stepLetter}. ${isFirst ? 'First' : index === 1 ? 'Second' : `Item ${index + 1}`} Item${!isFirst ? ' (Only after the agent acknowledges the previous item)' : ''}:
You: "${isFirst ? 'I\'ll have' : 'And I\'ll have'} the ${item.name}${customizationText}${instructionText}"

Wait for the agent to acknowledge and confirm the ${isFirst ? 'first' : index === 1 ? 'second' : `${index + 1}${getOrdinalSuffix(index + 1)}`} item before moving ${index < formData.orderItems.length - 1 ? 'to the next item' : 'on'}.
`;
      });
    } else {
      console.log('Using default items');
      // Default items if none specified
          prompt += `
3A. First Item:
You: "I'll have the Soya Chaap."

Wait for the agent to acknowledge and confirm the first item before moving to the next item.

3B. Second Item (Only after the agent acknowledges the first item):
You: "And I'll have the French Fries. I want Medium size?"

Wait for the agent to acknowledge and confirm the second item before moving on.
`;
    }

          prompt += `
Order Recap & Confirmation:
Agent gives a recap of items, confirming your order.
Wait for the agent to finish presenting the order, subtotal, tax, and any fees.

Once the agent finishes the recap and confirms the order:
You: "Sounds good—please confirm the order."

Pause after this, waiting for the agent to confirm and finalize the order before asking for prices.

Customization-Price Check (Highest Priority):
Only after the agent confirms the order:
You: "Sorry, could you tell me how much each of the customizations costs?"

Wait for the agent to quote the prices of the customizations, one by one. After each price is quoted:
You: "Okay."

Pause after each price quote.

Wrap-up:
Agent provides the pickup/delivery ETA:
You: "Perfect, thanks! See you then."

Hang up.

Key Compliance Test:
Critical Rule: Do not confirm the order until all customization prices have been clearly stated.
If the agent provides a total or asks for confirmation before quoting the customization prices, you must request those prices first.`;

    console.log('Generated prompt length:', prompt.length);
    return prompt;
  };
  
  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  };
  
  // Add the handleCustomizationChange function
  const handleCustomizationChange = (customizationName, optionValue) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [customizationName]: optionValue
    }));
  };
  
  // Add helper function to format customizations in a natural way
  const formatCustomizationsForPrompt = (customizationsStr) => {
    if (!customizationsStr) return '';
    
    // Split the customizations string into individual selections
    const selections = customizationsStr.split(', ').filter(Boolean);
    if (selections.length === 0) return '';

    // Format each selection in a more natural way
    const formattedSelections = selections.map(selection => {
      const [category, choice] = selection.split(': ');
      
      // Remove common suffixes and prefixes that make it sound mechanical
      const cleanCategory = category
        .replace('Choice?', '')
        .replace('Choice of', '')
        .replace('Legendary', '')
        .trim();
        
      return `with ${choice} ${cleanCategory.toLowerCase()}`;
    });

    // Join multiple customizations in a natural way
    if (formattedSelections.length === 1) {
      return ` ${formattedSelections[0]}`;
    } else if (formattedSelections.length === 2) {
      return ` ${formattedSelections[0]} and ${formattedSelections[1]}`;
    } else {
      const lastSelection = formattedSelections.pop();
      return ` ${formattedSelections.join(', ')}, and ${lastSelection}`;
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Create Test</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to create a test.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Test</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
        <div className="mb-6">
          <label htmlFor="name" className="block mb-1 font-medium">
            Test Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter test name"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="customerName" className="block mb-1 font-medium">
            Customer Name
          </label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter customer name"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block mb-1 font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe the purpose of this test"
            rows="3"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="system_prompt" className="block mb-1 font-medium">
            System Prompt
          </label>
          <div className="flex justify-between items-center mb-1">
            <textarea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="The system prompt that will guide the testing agent's behavior"
              rows="5"
              required
            />
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-800"
              onClick={() => {
                const dynamicPrompt = generateDynamicPrompt();
                setFormData(prev => ({
                  ...prev,
                  system_prompt: dynamicPrompt
                }));
              }}
            >
              Preview Dynamic Prompt
            </button>
          </div>
          <div className="mt-1 text-sm text-secondary-600">
            This is the prompt that guides how the testing agent will behave when calling the phone agent.
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Configure Test Steps</h3>
            <button
              type="button"
              onClick={() => setShowAddStepForm(!showAddStepForm)}
              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {showAddStepForm ? 'Cancel' : 'Create Custom Step'}
            </button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-3">
            <div className="flex items-start">
              <div className="text-blue-500 mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">Drag and Drop Instructions:</p>
                <ol className="text-sm text-blue-600 list-decimal ml-5">
                  <li>Check the box to enable a step</li>
                  <li>Drag the entire row to reorder steps</li>
                  <li>Each step will be automatically renumbered</li>
                  <li>Add custom steps with descriptions using the form</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* Enhanced custom step input form */}
          {showAddStepForm && (
            <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-md">
              <h4 className="font-medium text-teal-800 mb-2">Create Custom Step</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="newStepName" className="block text-sm font-medium text-teal-800 mb-1">
                    Step Name
                  </label>
                  <input
                    id="newStepName"
                    type="text"
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    placeholder="Enter step name (e.g., Menu Substitution)"
                    className="w-full px-3 py-2 border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="newStepDescription" className="block text-sm font-medium text-teal-800 mb-1">
                    Step Description
                  </label>
                  <textarea
                    id="newStepDescription"
                    value={newStepDescription}
                    onChange={(e) => setNewStepDescription(e.target.value)}
                    placeholder="Enter detailed instructions for this step (e.g., Ask to substitute an ingredient in your order)"
                    rows="3"
                    className="w-full px-3 py-2 border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addCustomStep}
                    disabled={!newStepName.trim()}
                    className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 disabled:opacity-50"
                  >
                    Add Step
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="border border-secondary-200 rounded-md p-4 bg-white">
            {formData.promptSteps.map((step, index) => {
              // For custom steps, use a different color scheme
              const colors = step.isCustom 
                ? { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: 'text-teal-500' }
                : STEP_COLORS[step.id];
                
              return (
                <div
                  id={`step-row-${index}`}
                  key={step.id}
                  className={`mb-3 rounded-md ${step.enabled ? colors.bg : 'bg-gray-50'} 
                    border-2 ${step.enabled ? colors.border : 'border-gray-200'} 
                    transition-all duration-150 shadow-sm hover:shadow
                    ${draggedItemIndex === index ? 'opacity-50' : 'opacity-100'}`}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ cursor: 'grab' }}
                >
                  <div className="flex flex-col p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          id={`step-${step.id}`}
                          checked={step.enabled}
                          onChange={(e) => {
                            e.stopPropagation(); // Prevent drag when clicking checkbox
                            toggleStepEnabled(index);
                          }}
                          className="mr-3 h-5 w-5 cursor-pointer"
                          onClick={(e) => e.stopPropagation()} // Prevent drag when clicking checkbox
                        />
                        <label 
                          htmlFor={`step-${step.id}`} 
                          className={`select-none font-medium ${step.enabled ? colors.text : 'text-gray-500'}`}
                          onClick={(e) => {
                            e.preventDefault(); // Prevent checkbox from being toggled when dragging
                            e.stopPropagation(); // Stop event from bubbling up
                            toggleStepEnabled(index); // Toggle the checkbox manually
                          }}
                        >
                          {step.label}
                          {step.isCustom && <span className="ml-2 text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">Custom</span>}
                        </label>
                      </div>
                      <div className="flex items-center">
                        {/* Show delete button for custom steps */}
                        {step.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStep(index);
                            }}
                            className="mr-2 text-red-500 hover:text-red-700"
                            title="Remove step"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <div 
                          className={`flex items-center justify-center rounded-md p-2 
                            ${step.enabled ? colors.bg : 'bg-gray-100'} 
                            border ${step.enabled ? colors.border : 'border-gray-200'}`}
                          title="Drag to reorder"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${step.enabled ? colors.icon : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Show description if available */}
                    {step.description && (
                      <div className={`mt-2 ml-8 text-sm ${step.enabled ? step.isCustom ? 'text-teal-600' : 'text-secondary-600' : 'text-gray-500'}`}>
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Method Configuration */}
        {formData.promptSteps.some(step => step.id === 'deliveryMethod' && step.enabled) && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Delivery Method Configuration</h3>
            <div className="border border-secondary-200 rounded-md p-4">
              <div className="flex items-center space-x-4 mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="pickup"
                    checked={formData.deliveryOptions.method === 'pickup'}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      deliveryOptions: {
                        ...prev.deliveryOptions,
                        method: 'pickup'
                      }
                    }))}
                    className="mr-2"
                  />
                  <span>Pickup</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="delivery"
                    checked={formData.deliveryOptions.method === 'delivery'}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      deliveryOptions: {
                        ...prev.deliveryOptions,
                        method: 'delivery'
                      }
                    }))}
                    className="mr-2"
                  />
                  <span>Delivery</span>
                </label>
              </div>
              
              {formData.deliveryOptions.method === 'delivery' && (
                <div className="mt-4">
                  <label className="block mb-1 font-medium">
                    Delivery Address
                  </label>
                  <textarea
                    value={formData.deliveryOptions.address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deliveryOptions: {
                        ...prev.deliveryOptions,
                        address: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter delivery address"
                    rows="2"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items Configuration */}
        {formData.promptSteps.some(step => step.id === 'orderItems' && step.enabled) && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Order Items Configuration</h3>
            <div className="border border-secondary-200 rounded-md p-4">
              
              {/* Mode Toggle */}
              <div className="mb-4">
                <div className="flex items-center space-x-4 mb-3">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={!manualItemMode}
                      onChange={() => setManualItemMode(false)}
                      className="mr-2"
                    />
                    <span>Use Restaurant Menu</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={manualItemMode}
                      onChange={() => setManualItemMode(true)}
                      className="mr-2"
                    />
                    <span>Add Items Manually</span>
                  </label>
                </div>
                <p className="text-sm text-secondary-600">
                  {manualItemMode 
                    ? "Manually enter item names and customizations without fetching restaurant data."
                    : "Fetch restaurant menu data to select items with accurate customizations and pricing."
                  }
                </p>
              </div>

              {/* Restaurant Phone Number Input - only show in restaurant menu mode */}
              {!manualItemMode && (
                <div className="mb-4">
                  <label className="block mb-1">Restaurant Phone Number</label>
                  <div className="flex space-x-2">
                    <input
                      type="tel"
                      value={restaurantPhoneNumber}
                      onChange={(e) => setRestaurantPhoneNumber(e.target.value)}
                      className="form-control flex-1"
                      placeholder="Enter restaurant phone number"
                    />
                    <button
                      type="button"
                      onClick={getRestaurantData}
                      disabled={loadingRestaurantData || !restaurantPhoneNumber.trim()}
                      className="btn btn-secondary"
                    >
                      {loadingRestaurantData ? 'Loading...' : 'Get Menu'}
                    </button>
                  </div>
                  <p className="text-xs text-secondary-600 mt-1">
                    Hint: Last digit determines restaurant type - 0-3: Indian, 4-6: Italian, 7-9: Chinese
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loadingRestaurantData && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              )}

              {/* Restaurant Info - only show in restaurant menu mode */}
              {!manualItemMode && restaurantData && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <h4 className="font-medium">{restaurantData.restaurant_name}</h4>
                  <p className="text-sm">{restaurantData.restaurant_address}</p>
                  <p className="text-sm">Phone: {restaurantData.phone_number}</p>
                </div>
              )}

              {/* Display current order items */}
              {formData.orderItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Current Order Items</h4>
                  <div className="space-y-3">
                    {formData.orderItems.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{item.name}</h5>
                            {item.customizations && (
                              <p className="text-sm text-secondary-600">
                                Customizations: {item.customizations}
                              </p>
                            )}
                            {item.instructions && (
                              <p className="text-sm text-secondary-600">
                                Instructions: {item.instructions}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new item section */}
              <div className="bg-white p-3 rounded border">
                {manualItemMode ? (
                  // Manual Item Entry Form
                  <>
                    <h4 className="font-medium mb-2">Add Item Manually</h4>
                    
                    <div className="mb-3">
                      <label className="block mb-1">Item Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={manualItem.name}
                        onChange={(e) => handleManualItemChange('name', e.target.value)}
                        className="form-control w-full"
                        placeholder="e.g., Margherita Pizza, Chicken Tikka Masala, etc."
                      />
                    </div>

                    <div className="mb-3">
                      <label className="block mb-1">Customizations</label>
                      <textarea
                        value={manualItem.customizations}
                        onChange={(e) => handleManualItemChange('customizations', e.target.value)}
                        className="form-control w-full"
                        rows="2"
                        placeholder="e.g., Extra cheese, Medium spice level, No onions, etc."
                      />
                      <p className="text-xs text-secondary-600 mt-1">
                        Enter any customizations or modifications for this item
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="block mb-1">Special Instructions</label>
                      <textarea
                        value={manualItem.instructions}
                        onChange={(e) => handleManualItemChange('instructions', e.target.value)}
                        className="form-control w-full"
                        rows="2"
                        placeholder="e.g., Please make it extra crispy, Cut into 8 slices, etc."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addManualItemToOrder}
                      disabled={!manualItem.name.trim()}
                      className="btn btn-secondary w-full"
                    >
                      Add Item to Order
                    </button>
                  </>
                ) : (
                  // Restaurant Menu Item Selection (existing code)
                  <>
                    <h4 className="font-medium mb-2">Add Menu Item</h4>
                    
                    {/* Menu Item Selection */}
                    <div className="mb-3">
                      <label className="block mb-1">Select Menu Item</label>
                      <select 
                        value={selectedMenuItem}
                        onChange={(e) => handleMenuItemSelect(e.target.value)}
                        className="form-control w-full"
                      >
                        <option value="">-- Select an item --</option>
                        {restaurantData?.item_list?.map((item, index) => (
                          <option key={index} value={item[0]}>
                            {item[0]} - ${item[1].toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Customizations */}
                    {menuItemDetails?.customizations && menuItemDetails.customizations.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium mb-2">Customizations</h5>
                        {menuItemDetails.customizations.map((customization, index) => (
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
                              {customization.options.map((option, optIndex) => (
                                <option key={optIndex} value={option[0]}>
                                  {option[0]} {option.length > 1 ? `(+$${option[1].toFixed(2)})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Item Instructions */}
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

                    {/* Add Item Button */}
                    <button
                      type="button"
                      onClick={addItemToOrder}
                      disabled={!selectedMenuItem}
                      className="btn btn-secondary w-full"
                    >
                      Add Item to Order
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <label className="block mb-1 font-medium">
            Target Phone Numbers
          </label>
          <div className="space-y-3">
            {formData.target_phone_numbers.map((number, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter phone number"
                />
                {formData.target_phone_numbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhoneNumber(index)}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoneNumber}
              className="btn btn-secondary btn-sm"
            >
              Add Another Phone Number
            </button>
          </div>
          <div className="mt-1 text-sm text-secondary-600">
            Add multiple phone numbers to compare different versions of your phone agent.
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium mb-3">Select Tasks</h3>
            {loadingResources ? (
              <div className="text-secondary-600">Loading tasks...</div>
            ) : availableTasks.length === 0 ? (
              <div className="text-secondary-600">No tasks available. Create tasks first.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-secondary-300 rounded-md p-3">
                {availableTasks.map(task => (
                  <div key={task.id} className="mb-2">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        value={task.id}
                        checked={formData.tasks.includes(task.id)}
                        onChange={handleTaskSelection}
                        className="mt-1"
                      />
                      <div className="ml-2">
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-secondary-600 line-clamp-2">
                          {task.description}
                        </div>
                        {taskSpecificMetricsMap[task.id]?.length > 0 && (
                          <div className="text-xs text-primary-700 mt-1">
                            Has {taskSpecificMetricsMap[task.id].length} task-specific {taskSpecificMetricsMap[task.id].length === 1 ? 'metric' : 'metrics'}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Select Metrics</h3>
            {loadingResources ? (
              <div className="text-secondary-600">Loading metrics...</div>
            ) : availableMetrics.length === 0 ? (
              <div className="text-secondary-600">No metrics available. Create metrics first.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-secondary-300 rounded-md p-3">
                {availableMetrics.map(metric => (
                  <div key={metric.id} className="mb-2">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        value={metric.id}
                        checked={formData.metrics.includes(metric.id)}
                        onChange={handleMetricSelection}
                        className="mt-1"
                      />
                      <div className="ml-2">
                        <div className="font-medium">{metric.name}</div>
                        <div className="text-sm text-secondary-600 line-clamp-2">
                          {metric.description}
                        </div>
                        <div className={`text-xs rounded px-2 py-0.5 inline-block mt-1 ${
                          metric.type === 'task-specific' 
                            ? 'bg-primary-100 text-primary-800' 
                            : 'bg-secondary-100 text-secondary-800'
                        }`}>
                          {metric.type === 'task-specific' ? 'Task-specific' : 'Generic'}
                        </div>
                        {metric.type === 'task-specific' && (
                          <div className="text-xs mt-1">
                            <span className={isMetricTaskSelected(metric.id) ? 
                              "text-green-700" : 
                              "text-primary-700"
                            }>
                              {getAssociatedTaskNames(metric.id)}
                              {isMetricTaskSelected(metric.id) && " ✓"}
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-sm text-secondary-600">
              Select both generic metrics and task-specific metrics to include in your test. 
              Task-specific metrics are designed to evaluate specific testing scenarios and will 
              be most effective when used with their associated tasks.
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/tests')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Test'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTest; 




