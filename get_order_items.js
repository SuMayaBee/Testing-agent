/**
 * JavaScript version of the get_order_items.py file
 * Updated to use dynamic restaurant data instead of loading from JSON
 */

/**
 * Class for generating restaurant menu data dynamically
 */
class RestaurantDataGenerator {
  constructor(phoneNumber = null) {
    this._phoneNumber = phoneNumber;
    this.restaurantData = this._generateRestaurantData();
  }

  /**
   * Generate sample restaurant data
   * @returns {Object} The restaurant data
   */
  _generateRestaurantData() {
    // Use phone number to simulate different restaurants
    const restaurantType = this._getRestaurantTypeFromPhone();
    
    // Choose restaurant data based on phone number
    switch (restaurantType) {
      case 'indian':
        return this._getIndianRestaurantData();
      case 'italian':
        return this._getItalianRestaurantData();
      case 'chinese':
        return this._getChineseRestaurantData();
      default:
        return this._getIndianRestaurantData(); // Default
    }
  }

  /**
   * Get restaurant type based on the last digit of phone number
   * @returns {string} Type of restaurant
   */
  _getRestaurantTypeFromPhone() {
    if (!this._phoneNumber) return 'indian';
    
    // Extract last digit of phone number
    const lastDigit = this._phoneNumber.toString().slice(-1);
    
    if (['0', '1', '2', '3'].includes(lastDigit)) {
      return 'indian';
    } else if (['4', '5', '6'].includes(lastDigit)) {
      return 'italian';
    } else {
      return 'chinese';
    }
  }

  /**
   * Generate Indian restaurant data
   * @returns {Object} Restaurant data
   */
  _getIndianRestaurantData() {
    // Create the item list: [name, price, customization_name?]
    const itemList = [
      ["Tandoori Momo", 10.99, "Veg or Non Veg"],
      ["Soya Malai Chaap-Must Try", 12.99, "Extra Malai"],
      ["Butter Chicken", 14.99, "Spice Level"],
      ["Paneer Tikka", 11.99],
      ["Chicken Biryani", 15.99, "Spice Level"]
    ];

    // Create the customization dictionary
    const customizationDict = {
      "Tandoori Momo": [
        {
          name: "Veg or Non Veg",
          required: true,
          options: [
            ["Veg", 0],
            ["Non Veg", 1.12]
          ]
        },
        {
          name: "Quantity",
          required: false,
          options: [
            ["Regular (6 pcs)"],
            ["Large (10 pcs)", 5.00]
          ]
        }
      ],
      "Soya Malai Chaap-Must Try": [
        {
          name: "Extra Malai",
          required: false,
          options: [
            ["No Extra Malai"],
            ["Extra Malai (more creamy)", 1.12]
          ]
        },
        {
          name: "Spice Level",
          required: false,
          options: [
            ["Mild"],
            ["Medium"],
            ["Hot", 0.50]
          ]
        }
      ],
      "Butter Chicken": [
        {
          name: "Spice Level",
          required: false,
          options: [
            ["Mild"],
            ["Medium"],
            ["Hot", 0.50]
          ]
        }
      ],
      "Chicken Biryani": [
        {
          name: "Spice Level",
          required: true,
          options: [
            ["Mild"],
            ["Medium"],
            ["Hot", 0.50]
          ]
        },
        {
          name: "Add-ons",
          required: false,
          options: [
            ["None"],
            ["Extra Raita", 1.00],
            ["Extra Gravy", 1.50]
          ]
        }
      ]
    };

    // Create category list
    const categoryList = ["Appetizers", "Main Course", "Rice & Bread", "Desserts"];

    return {
      restaurant_name: "Curry Delights",
      restaurant_id: "curry123",
      restaurant_address: "123 Flavor Street, Tasteville",
      phone_number: this._phoneNumber || "+19202808073",
      category_list: categoryList,
      item_list: itemList,
      customization_dict: customizationDict
    };
  }

  /**
   * Generate Italian restaurant data
   * @returns {Object} Restaurant data
   */
  _getItalianRestaurantData() {
    // Create the item list: [name, price, customization_name?]
    const itemList = [
      ["Margherita Pizza", 12.99, "Size"],
      ["Spaghetti Carbonara", 14.99, "Add-ons"],
      ["Chicken Alfredo", 16.99, "Pasta Type"],
      ["Garlic Bread", 5.99],
      ["Tiramisu", 7.99]
    ];

    // Create the customization dictionary
    const customizationDict = {
      "Margherita Pizza": [
        {
          name: "Size",
          required: true,
          options: [
            ["Small", 0],
            ["Medium", 3.00],
            ["Large", 5.00]
          ]
        },
        {
          name: "Crust Type",
          required: false,
          options: [
            ["Regular"],
            ["Thin", 0],
            ["Stuffed", 2.50]
          ]
        }
      ],
      "Spaghetti Carbonara": [
        {
          name: "Add-ons",
          required: false,
          options: [
            ["None"],
            ["Extra Cheese", 1.50],
            ["Extra Bacon", 2.00],
            ["Extra Mushrooms", 1.00]
          ]
        }
      ],
      "Chicken Alfredo": [
        {
          name: "Pasta Type",
          required: true,
          options: [
            ["Fettuccine"],
            ["Penne"],
            ["Spaghetti"]
          ]
        },
        {
          name: "Extras",
          required: false,
          options: [
            ["None"],
            ["Extra Chicken", 2.50],
            ["Extra Sauce", 1.00],
            ["Extra Cheese", 1.50]
          ]
        }
      ]
    };

    // Create category list
    const categoryList = ["Appetizers", "Pizza", "Pasta", "Desserts"];

    return {
      restaurant_name: "Bella Italia",
      restaurant_id: "bella123",
      restaurant_address: "456 Pasta Lane, Pizzaville",
      phone_number: this._phoneNumber || "+19204567890",
      category_list: categoryList,
      item_list: itemList,
      customization_dict: customizationDict
    };
  }

  /**
   * Generate Chinese restaurant data
   * @returns {Object} Restaurant data
   */
  _getChineseRestaurantData() {
    // Create the item list: [name, price, customization_name?]
    const itemList = [
      ["Kung Pao Chicken", 13.99, "Spice Level"],
      ["Vegetable Fried Rice", 10.99, "Protein Add-on"],
      ["Beef with Broccoli", 15.99],
      ["Spring Rolls", 6.99, "Quantity"],
      ["Sweet and Sour Pork", 14.99]
    ];

    // Create the customization dictionary
    const customizationDict = {
      "Kung Pao Chicken": [
        {
          name: "Spice Level",
          required: true,
          options: [
            ["Mild"],
            ["Medium"],
            ["Hot", 0],
            ["Extra Hot", 0.50]
          ]
        },
        {
          name: "Rice Option",
          required: false,
          options: [
            ["No Rice"],
            ["White Rice", 2.00],
            ["Fried Rice", 3.50]
          ]
        }
      ],
      "Vegetable Fried Rice": [
        {
          name: "Protein Add-on",
          required: false,
          options: [
            ["None"],
            ["Chicken", 2.50],
            ["Shrimp", 3.50],
            ["Beef", 3.00]
          ]
        }
      ],
      "Spring Rolls": [
        {
          name: "Quantity",
          required: true,
          options: [
            ["2 pieces"],
            ["4 pieces", 4.00],
            ["6 pieces", 8.00]
          ]
        }
      ]
    };

    // Create category list
    const categoryList = ["Appetizers", "Rice & Noodles", "Main Dishes", "Chef's Specials"];

    return {
      restaurant_name: "Golden Dragon",
      restaurant_id: "dragon123",
      restaurant_address: "789 Wok Way, Noodletown",
      phone_number: this._phoneNumber || "+19207891234",
      category_list: categoryList,
      item_list: itemList,
      customization_dict: customizationDict
    };
  }

  /**
   * Get the generated restaurant data
   * @returns {Object} The restaurant data
   */
  getRestaurantData() {
    return this.restaurantData;
  }
}

/**
 * Get restaurant data dynamically based on phone number
 * @param {string} phoneNumber - The phone number to use for getting restaurant data
 * @returns {Object} The restaurant data
 */
function getRestaurantData(phoneNumber = null) {
  const generator = new RestaurantDataGenerator(phoneNumber);
  return generator.getRestaurantData();
}

/**
 * Find details about a specific menu item.
 * @param {Object} data - The restaurant data.
 * @param {string} itemName - The name of the menu item to find.
 * @returns {Object|null} The item details, or null if not found.
 */
function findItemDetails(data, itemName) {
  // Search in the item_list
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
}

/**
 * Calculate the final price of an item with its customizations.
 * @param {Object} itemDetails - The details of the menu item.
 * @param {Object} selectedOptions - The selected customization options.
 * @returns {number|null} The calculated price, or null if item details are invalid.
 */
function calculateItemPrice(itemDetails, selectedOptions) {
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
}

/**
 * Format and print details about a menu item and its customizations.
 * @param {Object} itemDetails - The details of the menu item.
 * @param {Object} selectedOptions - The selected customization options.
 * @returns {string} Formatted string with item details.
 */
function formatItemDetails(itemDetails, selectedOptions = null) {
  if (!itemDetails) {
    console.log("Item not found in menu.");
    return "Item not found in menu.";
  }
  
  let output = [];
  
  output.push(`\n${"=".repeat(50)}`);
  output.push(`ITEM: ${itemDetails.name}`);
  output.push(`Base Price: $${itemDetails.base_price.toFixed(2)}`);
  
  if (itemDetails.customizations && itemDetails.customizations.length > 0) {
    output.push("\nAvailable Customizations:");
    itemDetails.customizations.forEach((customization, i) => {
      const required = customization.required ? "Required" : "Optional";
      output.push(`${i + 1}. ${customization.name} (${required}):`);
      
      customization.options.forEach((option, j) => {
        if (option.length > 1) { // Has price
          output.push(`   ${j + 1}. ${option[0]} (+$${option[1].toFixed(2)})`);
        } else {
          output.push(`   ${j + 1}. ${option[0]}`);
        }
      });
    });
  }
  
  // If selected options are provided, calculate and show final price
  if (selectedOptions) {
    output.push("\nSelected Options:");
    for (const [customizationName, optionName] of Object.entries(selectedOptions)) {
      output.push(`- ${customizationName}: ${optionName}`);
    }
    
    const finalPrice = calculateItemPrice(itemDetails, selectedOptions);
    output.push(`\nFinal Price: $${finalPrice.toFixed(2)}`);
  }
  
  output.push(`${"=".repeat(50)}`);
  
  const result = output.join("\n");
  console.log(result);
  return result;
}

/**
 * Display all menu items for a restaurant
 * @param {Object} restaurantData - The restaurant data
 */
function displayAllMenuItems(restaurantData) {
  console.log(`\n===== MENU ITEMS FOR ${restaurantData.restaurant_name.toUpperCase()} =====`);
  console.log(`Phone: ${restaurantData.phone_number}`);
  console.log(`Address: ${restaurantData.restaurant_address}`);
  console.log(`\nCategories: ${restaurantData.category_list.join(', ')}`);
  
  console.log("\n----- AVAILABLE ITEMS -----");
  restaurantData.item_list.forEach(item => {
    console.log(`• ${item[0]} - $${item[1].toFixed(2)}`);
  });
}

/**
 * Display all customization options for a specific item
 * @param {Object} restaurantData - The restaurant data
 * @param {string} itemName - The name of the item to show customizations for
 */
function displayItemCustomizations(restaurantData, itemName) {
  const itemDetails = findItemDetails(restaurantData, itemName);
  
  if (!itemDetails) {
    console.log(`Item "${itemName}" not found in the menu.`);
    return;
  }
  
  formatItemDetails(itemDetails);
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    phoneNumber: null,
    itemName: null,
    command: 'menu'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && i + 1 < args.length) {
      result.phoneNumber = args[i + 1];
      i++;
    } else if (args[i] === '--item' && i + 1 < args.length) {
      result.itemName = args[i + 1];
      result.command = 'item';
      i++;
    } else if (args[i] === '--interactive') {
      result.command = 'interactive';
    }
  }
  
  return result;
}

/**
 * Run interactive mode using readline
 * @param {Object} restaurantData - The restaurant data
 */
function runInteractiveMode(restaurantData) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(`\n===== INTERACTIVE MODE FOR ${restaurantData.restaurant_name.toUpperCase()} =====`);
  console.log("Enter a menu item name to see details, or 'exit' to quit.");
  
  rl.question("> ", function askForItem(itemName) {
    if (itemName.toLowerCase() === 'exit') {
      console.log("\nThank you for using the restaurant menu explorer!");
      rl.close();
      return;
    } else if (itemName.toLowerCase() === 'menu') {
      displayAllMenuItems(restaurantData);
    } else {
      displayItemCustomizations(restaurantData, itemName);
    }
    
    console.log("\nEnter another menu item name, 'menu' to see all items, or 'exit' to quit.");
    rl.question("> ", askForItem);
  });
}

/**
 * Prompt for phone number and create direct input interface
 */
function promptForInputs() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log("\n===== RESTAURANT MENU EXPLORER =====");
  
  // First ask for phone number
  rl.question("Enter phone number (or press Enter for default): ", (phoneNumber) => {
    // Use default if empty
    const phone = phoneNumber.trim() || null;
    const restaurantData = getRestaurantData(phone);
    
    console.log(`\nWelcome to ${restaurantData.restaurant_name}!`);
    displayAllMenuItems(restaurantData);
    
    // Function to handle ordering process
    function orderProcess() {
      rl.question("\nEnter an item name to order (or 'exit' to quit): ", (itemName) => {
        if (itemName.toLowerCase() === 'exit') {
          console.log("\nThank you for using the restaurant menu explorer!");
          rl.close();
          return;
        }
        
        const itemDetails = findItemDetails(restaurantData, itemName);
        
        if (!itemDetails) {
          console.log(`Item "${itemName}" not found in the menu.`);
          orderProcess();
          return;
        }
        
        // Display item details
        formatItemDetails(itemDetails);
        
        // If there are customizations, ask for them
        if (itemDetails.customizations && itemDetails.customizations.length > 0) {
          const selectedOptions = {};
          
          // Function to prompt for customization options
          function promptForCustomization(index) {
            if (index >= itemDetails.customizations.length) {
              // All customizations done, show final price
              const finalPrice = calculateItemPrice(itemDetails, selectedOptions);
              console.log(`\nYou ordered: ${itemDetails.name}`);
              for (const [name, option] of Object.entries(selectedOptions)) {
                console.log(`- ${name}: ${option}`);
              }
              console.log(`Final Price: $${finalPrice.toFixed(2)}`);
              
              // Ask for another order
              orderProcess();
              return;
            }
            
            const customization = itemDetails.customizations[index];
            console.log(`\n${customization.name} options:`);
            
            customization.options.forEach((option, i) => {
              if (option.length > 1) { // Has price
                console.log(`${i + 1}. ${option[0]} (+$${option[1].toFixed(2)})`);
              } else {
                console.log(`${i + 1}. ${option[0]}`);
              }
            });
            
            const promptText = customization.required ? 
              "Enter option number (required): " : 
              "Enter option number (or press Enter to skip): ";
            
            rl.question(promptText, (optionInput) => {
              if (!optionInput && !customization.required) {
                // Skip optional customization
                promptForCustomization(index + 1);
                return;
              }
              
              const optionNumber = parseInt(optionInput) - 1;
              
              if (isNaN(optionNumber) || optionNumber < 0 || optionNumber >= customization.options.length) {
                console.log("Invalid option number. Please try again.");
                promptForCustomization(index);
                return;
              }
              
              // Save selected option
              selectedOptions[customization.name] = customization.options[optionNumber][0];
              promptForCustomization(index + 1);
            });
          }
          
          // Start prompting for customizations
          promptForCustomization(0);
        } else {
          // No customizations, show price and continue
          const finalPrice = calculateItemPrice(itemDetails, {});
          console.log(`\nYou ordered: ${itemDetails.name}`);
          console.log(`Price: $${finalPrice.toFixed(2)}`);
          
          // Ask for another order
          orderProcess();
        }
      });
    }
    
    // Start the ordering process
    orderProcess();
  });
}

/**
 * Main function to demonstrate usage
 */
function main() {
  // Check if any command line arguments were passed
  if (process.argv.length > 2) {
    // Use the original argument parsing logic
    const args = parseArgs();
    
    // Get restaurant data based on phone number
    const restaurantData = getRestaurantData(args.phoneNumber);
    
    if (args.command === 'interactive') {
      // Run in interactive mode
      runInteractiveMode(restaurantData);
    } else if (args.command === 'item' && args.itemName) {
      // Display specific item
      displayItemCustomizations(restaurantData, args.itemName);
    } else {
      // Display all menu items
      console.log("\n===== RESTAURANT MENU EXPLORER =====");
      displayAllMenuItems(restaurantData);
      
      // Show examples
      if (!args.phoneNumber) {
        console.log("\n===== ITEM DETAILS EXAMPLES =====");
        
        // 1. Tandoori Momo with Non Veg option (for Indian restaurant)
        const tandooriMomo = findItemDetails(restaurantData, "Tandoori Momo");
        if (tandooriMomo) {
          const tandooriMomoOptions = {"Veg or Non Veg": "Non Veg"};
          formatItemDetails(tandooriMomo, tandooriMomoOptions);
        }
        
        // 2. Soya Malai Chaap-Must Try with Extra Malai option (for Indian restaurant)
        const soyaMalaiChaap = findItemDetails(restaurantData, "Soya Malai Chaap-Must Try");
        if (soyaMalaiChaap) {
          const soyaMalaiChaapOptions = {"Extra Malai": "Extra Malai (more creamy)"};
          formatItemDetails(soyaMalaiChaap, soyaMalaiChaapOptions);
        }
      }
    }
    
    if (args.command !== 'interactive') {
      console.log("\nTip: Run with --interactive for interactive mode.");
      console.log("     Run with --phone <number> to specify a restaurant.");
      console.log("     Run with --item \"Item Name\" to see details for a specific item.");
      console.log("\nThank you for using the restaurant menu explorer!");
    }
  } else {
    // No arguments provided, run in prompt mode
    promptForInputs();
  }
}

// Export functions and classes for module usage
module.exports = {
  RestaurantDataGenerator,
  getRestaurantData,
  findItemDetails,
  calculateItemPrice,
  formatItemDetails,
  displayAllMenuItems,
  displayItemCustomizations
};

// Run the main function if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
} 