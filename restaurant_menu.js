/**
 * JavaScript implementation of restaurant menu handling
 * Inspired by the Python implementation but using direct JS data structures
 */

/**
 * Class for modifying and handling restaurant menu data
 */
class MenuModifier {
  constructor(menuData = null) {
    this._originalData = menuData;
    
    // Variables that are used outside the class
    this.convertedMenu = {};
    this.categoryList = [];
    this.itemList = [];
    this.customizationDict = {};
    
    this._processMenuData();
  }
  
  _processMenuData() {
    this.convertedMenu = this._convertMenu(this._originalData);
    const result = this._createBotCuratedMenu(this.convertedMenu);
    this.itemList = result.itemList;
    this.customizationDict = result.customizationDict;
    this.categoryList = Object.keys(this.convertedMenu);
  }
  
  _applyTax(price) {
    return Math.round(parseFloat(price) * 1.13 * 100) / 100;
  }
  
  _convertCustomizationGroup(group) {
    const options = [];
    for (const option of group.options || []) {
      const optionPrice = option.price || 0;
      const optionName = option.name || "Unknown";
      options.push({ name: optionName, price: optionPrice });
    }
    
    return {
      name: group.customerInstruction || "Unknown",
      price: String(group.price || 0),
      options: options,
      required: ((group.rules || {}).minSelect || 0) > 0,
      maxSelect: (group.rules || {}).maxSelect || 1
    };
  }
  
  _createBotCuratedMenu(menu) {
    const itemList = [];
    const customizationDict = {};
    
    for (const [category, items] of Object.entries(menu)) {
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          const name = item.name || "Unknown";
          const price = this._applyTax(item.price || "0.0");
          const customizations = item.customizations || [];
          
          if (customizations.length > 0) {
            const firstCustomizationName = customizations[0].name || "";
            itemList.push([name, price, firstCustomizationName]);
            
            customizationDict[name] = [];
            for (const customization of customizations) {
              const customOptions = [];
              for (const option of customization.options || []) {
                if (typeof option === 'object' && option !== null) {
                  const optionName = option.name || "";
                  const optionPrice = this._applyTax(option.price || "0.0");
                  if (optionPrice === 0) {
                    customOptions.push([optionName]);
                  } else {
                    customOptions.push([optionName, optionPrice]);
                  }
                }
              }
              
              if ((customization.maxSelect || 1) > 1) {
                customizationDict[name].push({
                  name: customization.name || "",
                  options: customOptions,
                  required: customization.required || false,
                  maxSelect: customization.maxSelect
                });
              } else {
                customizationDict[name].push({
                  name: customization.name || "",
                  options: customOptions,
                  required: customization.required || false
                });
              }
            }
          } else {
            itemList.push([name, price]);
          }
        }
      }
    }
    
    return { itemList, customizationDict };
  }
  
  _convertMenu(inputJson) {
    const output = {};
    
    const restaurant = inputJson.restaurant || {};
    const categories = {};
    for (const cat of restaurant.categories || []) {
      categories[cat.id] = cat.name;
    }
    
    const customizationMap = {};
    for (const group of restaurant.customizationGroups || []) {
      customizationMap[group.id] = group;
    }
    
    const items = restaurant.items || [];
    
    // Initialize categories
    for (const catName of Object.values(categories)) {
      output[catName] = [];
    }
    
    for (const item of items) {
      const categoryIds = item.categoryIds || [];
      const categoryId = categoryIds.length > 0 ? categoryIds[0] : null;
      const categoryName = categories[categoryId] || "Uncategorized";
      
      const itemDict = { name: item.name || "" };
      
      const price = String(item.price || 0);
      if (price !== "0" && price !== "0.0") {
        itemDict.price = price;
      }
      
      const customizations = item.customizationIds || [];
      const customizationObjects = [];
      
      for (const custId of customizations) {
        if (customizationMap[custId]) {
          const group = customizationMap[custId];
          const convertedGroup = this._convertCustomizationGroup(group);
          customizationObjects.push(convertedGroup);
        }
      }
      
      if (customizationObjects.length > 0) {
        itemDict.customizations = customizationObjects;
      }
      
      output[categoryName].push(itemDict);
    }
    
    return output;
  }
}

/**
 * Class for handling restaurant data and operations
 */
class RestaurantHelper {
  constructor(phoneNumber) {
    this._phoneNumber = phoneNumber.replace("+", "");
    
    // In JavaScript, we'll use dummy data instead of fetching from API
    this._data = this._getDummyRestaurantData();
    this._restaurantInfo = this._data.restaurant || {};
    
    this._menuModifier = new MenuModifier(this._data);
    
    // Variables that are used outside the class
    this.menu = this._menuModifier.convertedMenu;
    this.itemList = this._menuModifier.itemList;
    this.customizationDict = this._menuModifier.customizationDict;
    this.categoryList = this._menuModifier.categoryList;
  }
  
  _getDummyRestaurantData() {
    // Sample restaurant data structure based on the Python implementation
    return {
      restaurant: {
        name: "Curry Delights",
        restaurantId: "curry123",
        address: "123 Flavor Street, Tasteville",
        categories: [
          { id: "cat1", name: "Appetizers" },
          { id: "cat2", name: "Main Course" },
          { id: "cat3", name: "Desserts" }
        ],
        customizationGroups: [
          {
            id: "cust1",
            customerInstruction: "Veg or Non Veg",
            options: [
              { name: "Veg", price: 0 },
              { name: "Non Veg", price: 1.12 }
            ],
            rules: { minSelect: 1, maxSelect: 1 }
          },
          {
            id: "cust2",
            customerInstruction: "Quantity",
            options: [
              { name: "Regular (6 pcs)", price: 0 },
              { name: "Large (10 pcs)", price: 5.00 }
            ],
            rules: { minSelect: 0, maxSelect: 1 }
          },
          {
            id: "cust3",
            customerInstruction: "Extra Malai",
            options: [
              { name: "No Extra Malai", price: 0 },
              { name: "Extra Malai (more creamy)", price: 1.12 }
            ],
            rules: { minSelect: 0, maxSelect: 1 }
          },
          {
            id: "cust4",
            customerInstruction: "Spice Level",
            options: [
              { name: "Mild", price: 0 },
              { name: "Medium", price: 0 },
              { name: "Hot", price: 0.50 }
            ],
            rules: { minSelect: 0, maxSelect: 1 }
          }
        ],
        items: [
          {
            name: "Tandoori Momo",
            price: 10.99,
            categoryIds: ["cat1"],
            customizationIds: ["cust1", "cust2"]
          },
          {
            name: "Soya Malai Chaap-Must Try",
            price: 12.99,
            categoryIds: ["cat2"],
            customizationIds: ["cust3", "cust4"]
          },
          {
            name: "Butter Chicken",
            price: 14.99,
            categoryIds: ["cat2"],
            customizationIds: ["cust4"]
          },
          {
            name: "Paneer Tikka",
            price: 11.99,
            categoryIds: ["cat1"],
            customizationIds: []
          }
        ]
      }
    };
  }
  
  _getRestaurantName() {
    return this._restaurantInfo.name || "Unknown Restaurant";
  }
  
  _getRestaurantAddress() {
    return this._restaurantInfo.address || "Address not available";
  }
  
  getRestaurantData() {
    return {
      restaurant_name: this._getRestaurantName(),
      restaurant_id: this._restaurantInfo.restaurantId || "",
      restaurant_address: this._getRestaurantAddress(),
      category_list: this.categoryList,
      item_list: this.itemList,
      customization_dict: this.customizationDict
    };
  }
}

/**
 * Find details about a specific menu item.
 * @param {Object} data - The restaurant data with itemList and customizationDict.
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
 * Demo function to showcase the restaurant menu functionality
 */
function demo() {
  console.log("\n===== RESTAURANT MENU EXPLORER =====");
  
  // Create a restaurant helper instance
  const restaurantHelper = new RestaurantHelper("+19202808073");
  const restaurantData = restaurantHelper.getRestaurantData();
  
  console.log(`Restaurant: ${restaurantData.restaurant_name}`);
  console.log(`Address: ${restaurantData.restaurant_address}`);
  console.log(`\nCategories: ${restaurantData.category_list.join(', ')}`);
  
  console.log("\n===== MENU ITEMS =====");
  restaurantData.item_list.forEach(item => {
    console.log(`• ${item[0]} - $${item[1].toFixed(2)}`);
  });
  
  console.log("\n===== ITEM DETAILS EXAMPLES =====");
  
  // 1. Tandoori Momo with Non Veg option
  const tandooriMomo = findItemDetails(restaurantData, "Tandoori Momo");
  const tandooriMomoOptions = {"Veg or Non Veg": "Non Veg"};
  formatItemDetails(tandooriMomo, tandooriMomoOptions);
  
  // 2. Soya Malai Chaap-Must Try with Extra Malai option
  const soyaMalaiChaap = findItemDetails(restaurantData, "Soya Malai Chaap-Must Try");
  const soyaMalaiChaapOptions = {"Extra Malai": "Extra Malai (more creamy)"};
  formatItemDetails(soyaMalaiChaap, soyaMalaiChaapOptions);
  
  console.log("\nThank you for using the restaurant menu explorer!");
}

// Export the functions and classes for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RestaurantHelper,
    MenuModifier,
    findItemDetails,
    calculateItemPrice,
    formatItemDetails,
    demo
  };
}

// Run the demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  demo();
} 