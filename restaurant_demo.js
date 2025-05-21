/**
 * Node.js example of using the restaurant_menu.js module
 */

// Import the restaurant menu module
const restaurantMenu = require('./restaurant_menu');

// Get the restaurant data
console.log("Creating restaurant helper...");
const restaurantHelper = new restaurantMenu.RestaurantHelper("+19202808073");
const restaurantData = restaurantHelper.getRestaurantData();

console.log(`\nRestaurant: ${restaurantData.restaurant_name}`);
console.log(`Address: ${restaurantData.restaurant_address}`);
console.log(`\nCategories available: ${restaurantData.category_list.join(', ')}`);

// Display all menu items
console.log("\n===== MENU ITEMS =====");
restaurantData.item_list.forEach(item => {
  console.log(`• ${item[0]} - $${item[1].toFixed(2)}`);
});

// Interactive mode to explore menu items
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayItem(itemName) {
  const itemDetails = restaurantMenu.findItemDetails(restaurantData, itemName);
  if (!itemDetails) {
    console.log(`\nItem '${itemName}' not found in the menu.`);
    return false;
  }
  
  restaurantMenu.formatItemDetails(itemDetails);
  return true;
}

function promptForCustomizations(itemDetails) {
  if (!itemDetails || !itemDetails.customizations || itemDetails.customizations.length === 0) {
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    console.log("\nWould you like to add customizations? (y/n)");
    rl.question("> ", (answer) => {
      if (answer.toLowerCase() !== 'y') {
        resolve(null);
        return;
      }
      
      const selectedOptions = {};
      let currentIndex = 0;
      
      const processNextCustomization = () => {
        if (currentIndex >= itemDetails.customizations.length) {
          resolve(selectedOptions);
          return;
        }
        
        const customization = itemDetails.customizations[currentIndex];
        console.log(`\nFor ${customization.name}:`);
        
        customization.options.forEach((option, i) => {
          if (option.length > 1) { // Has price
            console.log(`   ${i + 1}. ${option[0]} (+$${option[1].toFixed(2)})`);
          } else {
            console.log(`   ${i + 1}. ${option[0]}`);
          }
        });
        
        const promptText = customization.required ? 
          "Select option number: " : 
          "Select option number (or press Enter to skip): ";
        
        rl.question(promptText, (choice) => {
          if (choice.trim() && !isNaN(parseInt(choice))) {
            const optionIdx = parseInt(choice) - 1;
            if (optionIdx >= 0 && optionIdx < customization.options.length) {
              selectedOptions[customization.name] = customization.options[optionIdx][0];
            }
          } else if (customization.required) {
            console.log("This customization is required. Please select an option.");
            // Ask again for this customization
            currentIndex--;
          }
          
          currentIndex++;
          processNextCustomization();
        });
      };
      
      processNextCustomization();
    });
  });
}

function interactiveMode() {
  console.log("\n===== INTERACTIVE MODE =====");
  console.log("Enter a menu item name to see details, or 'exit' to quit.");
  
  rl.question("> ", async function askForItem(itemName) {
    if (itemName.toLowerCase() === 'exit') {
      console.log("\nThank you for using the restaurant menu explorer!");
      rl.close();
      return;
    }
    
    const itemDetails = restaurantMenu.findItemDetails(restaurantData, itemName);
    if (itemDetails) {
      restaurantMenu.formatItemDetails(itemDetails);
      
      // Ask for customizations
      const selectedOptions = await promptForCustomizations(itemDetails);
      if (selectedOptions && Object.keys(selectedOptions).length > 0) {
        restaurantMenu.formatItemDetails(itemDetails, selectedOptions);
      }
    } else {
      console.log(`\nItem '${itemName}' not found in the menu.`);
    }
    
    console.log("\nEnter another menu item name, or 'exit' to quit.");
    rl.question("> ", askForItem);
  });
}

// Demonstrate specific examples first
console.log("\n===== ITEM EXAMPLES =====");

// Example 1: Tandoori Momo with Non Veg option
const tandooriMomo = restaurantMenu.findItemDetails(restaurantData, "Tandoori Momo");
const tandooriMomoOptions = {"Veg or Non Veg": "Non Veg"};
restaurantMenu.formatItemDetails(tandooriMomo, tandooriMomoOptions);

// Example 2: Soya Malai Chaap-Must Try with Extra Malai option
const soyaMalaiChaap = restaurantMenu.findItemDetails(restaurantData, "Soya Malai Chaap-Must Try");
const soyaMalaiChaapOptions = {"Extra Malai": "Extra Malai (more creamy)"};
restaurantMenu.formatItemDetails(soyaMalaiChaap, soyaMalaiChaapOptions);

// Start interactive mode
interactiveMode(); 