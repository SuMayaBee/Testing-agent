import json

def load_restaurant_data(file_path="restaurant_data_full.json"):
    """Load restaurant data from the JSON file."""
    with open(file_path, 'r') as file:
        return json.load(file)

def find_item_details(data, item_name):
    """Find details about a specific menu item."""
    # Search in the item_list
    item_details = None
    base_price = None
    
    for item in data["item_list"]:
        if item[0] == item_name:
            item_details = item
            base_price = item[1]
            break
    
    if not item_details:
        return None
    
    # Get customization options if they exist
    customizations = data["customization_dict"].get(item_name, [])
    
    return {
        "name": item_name,
        "base_price": base_price,
        "customizations": customizations
    }

def calculate_item_price(item_details, selected_options):
    """Calculate the final price of an item with its customizations."""
    if not item_details:
        return None
    
    total_price = item_details["base_price"]
    
    # Add customization prices
    for customization in item_details["customizations"]:
        customization_name = customization["name"]
        if customization_name in selected_options:
            selected_option = selected_options[customization_name]
            
            for option in customization["options"]:
                option_name = option[0]
                if option_name == selected_option:
                    # Add price if it exists (option[1])
                    if len(option) > 1:
                        total_price += option[1]
                    break
    
    return round(total_price, 2)

def print_item_details(item_details, selected_options=None):
    """Print details about a menu item and its customizations."""
    if not item_details:
        print("Item not found in menu.")
        return
    
    print(f"\n{'='*50}")
    print(f"ITEM: {item_details['name']}")
    print(f"Base Price: ${item_details['base_price']}")
    
    if item_details["customizations"]:
        print("\nAvailable Customizations:")
        for i, customization in enumerate(item_details["customizations"], 1):
            required = "Required" if customization.get("required", False) else "Optional"
            print(f"{i}. {customization['name']} ({required}):")
            
            for j, option in enumerate(customization["options"], 1):
                if len(option) > 1:  # Has price
                    print(f"   {j}. {option[0]} (+${option[1]})")
                else:
                    print(f"   {j}. {option[0]}")
    
    # If selected options are provided, calculate and show final price
    if selected_options:
        print("\nSelected Options:")
        for customization_name, option_name in selected_options.items():
            print(f"- {customization_name}: {option_name}")
        
        final_price = calculate_item_price(item_details, selected_options)
        print(f"\nFinal Price: ${final_price}")
    
    print(f"{'='*50}")

if __name__ == "__main__":
    # Load restaurant data
    restaurant_data = load_restaurant_data()
    
    # Example of items from the conversation
    print("\n===== ITEMS FROM THE CONVERSATION =====")
    
    # 1. Tandoori Momo with Non Veg option
    tandoori_momo = find_item_details(restaurant_data, "Tandoori Momo")
    tandoori_momo_options = {"Veg or Non Veg": "Non Veg"}
    print_item_details(tandoori_momo, tandoori_momo_options)
    
    # 2. Soya Malai Chaap-Must Try with Extra Malai option
    soya_malai_chaap = find_item_details(restaurant_data, "Soya Malai Chaap-Must Try")
    soya_malai_chaap_options = {"Extra Malai": "Extra Malai (more creamy)"}
    print_item_details(soya_malai_chaap, soya_malai_chaap_options)
    
    # Show order summary like in the conversation
    # print("\n===== ORDER SUMMARY =====")
    # tandoori_momo_price = calculate_item_price(tandoori_momo, tandoori_momo_options)
    # soya_malai_chaap_price = calculate_item_price(soya_malai_chaap, soya_malai_chaap_options)
    
    # print(f"• Tandoori Momo (Non Veg) — ${tandoori_momo['base_price']} + $1.12 = ${tandoori_momo_price}")
    # print(f"• Soya Malai Chaap-Must Try (Extra Malai) — ${soya_malai_chaap['base_price']} + $1.12 = ${soya_malai_chaap_price}")
    # print(f"\nTotal: ${tandoori_momo_price + soya_malai_chaap_price:.2f}")
    
    # # Interactive mode to search for other items
    # print("\n===== SEARCH FOR OTHER ITEMS =====")
    # search_more = input("Would you like to search for another menu item? (y/n): ")
    
    # while search_more.lower() == 'y':
    #     item_name = input("Enter item name to search: ")
    #     item_details = find_item_details(restaurant_data, item_name)
        
    #     if item_details:
    #         print_item_details(item_details)
            
    #         # Ask if they want to see it with customizations
    #         add_custom = input("Would you like to add customizations? (y/n): ")
    #         if add_custom.lower() == 'y':
    #             selected_options = {}
                
    #             for customization in item_details["customizations"]:
    #                 print(f"\nFor {customization['name']}:")
                    
    #                 for i, option in enumerate(customization["options"], 1):
    #                     if len(option) > 1:  # Has price
    #                         print(f"   {i}. {option[0]} (+${option[1]})")
    #                     else:
    #                         print(f"   {i}. {option[0]}")
                    
    #                 choice = input(f"Select option number (or press Enter to skip): ")
    #                 if choice.strip() and choice.isdigit():
    #                     option_idx = int(choice) - 1
    #                     if 0 <= option_idx < len(customization["options"]):
    #                         selected_options[customization["name"]] = customization["options"][option_idx][0]
                
    #             print_item_details(item_details, selected_options)
    #     else:
    #         print(f"Item '{item_name}' not found in the menu.")
        
    #     search_more = input("\nWould you like to search for another item? (y/n): ")
    
    print("Thank you for using the restaurant menu explorer!") 