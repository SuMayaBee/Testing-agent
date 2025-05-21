class MenuModifier:
    def __init__(self, menu_data=None):
        self._original_data = menu_data

        # Variables that are used outside the class
        self.converted_menu = {}
        self.category_list = []
        self.item_list = []
        self.customization_dict = {}
        
        self.__process_menu_data()
    
    def __process_menu_data(self):
        self.converted_menu = self.__convert_menu(self._original_data)
        self.item_list, self.customization_dict = self.__create_bot_curated_menu(self.converted_menu)
        self.category_list = list(self.converted_menu.keys())

    def __apply_tax(self, price):
        return round(float(price) * 1.13, 2)

    def __convert_customization_group(self, group):
        options = []
        for option in group.get("options", []):
            option_price = option.get("price", 0)
            option_name = option.get("name", "Unknown")
            options.append({"name": option_name, "price": option_price})

        return {
            "name": group.get("customerInstruction", "Unknown"),
            "price": str(group.get("price", 0)),
            "options": options,
            "required": (group.get("rules", {}).get("minSelect", 0) > 0),
            "maxSelect": group.get("rules", {}).get("maxSelect", 1)
        }

    def __create_bot_curated_menu(self, menu):
        item_list = []
        customization_dict = {}

        for category, items in menu.items():
            for item in items:
                if isinstance(item, dict):
                    name = item.get("name", "Unknown")
                    price = self.__apply_tax(item.get("price", "0.0"))
                    customizations = item.get("customizations", [])
                    
                    if customizations:
                        first_customization_name = customizations[0].get("name", "")
                        item_list.append([name, price, first_customization_name])
                        
                        customization_dict[name] = []
                        for customization in customizations:
                            custom_options = []
                            for option in customization.get("options", []):
                                if isinstance(option, dict):
                                    option_name = option.get("name", "")
                                    option_price = self.__apply_tax(option.get("price", "0.0"))
                                    if option_price == 0:
                                        custom_options.append([option_name])
                                    else:
                                        custom_options.append([option_name, option_price])
                            
                            if customization.get("maxSelect", 1) > 1:
                                customization_dict[name].append({
                                    "name": customization.get("name", ""),
                                    "options": custom_options,
                                    "required": customization.get("required", False),
                                    "maxSelect": customization.get("maxSelect")
                                })
                            else:
                                customization_dict[name].append({
                                    "name": customization.get("name", ""),
                                    "options": custom_options,
                                    "required": customization.get("required", False),
                                })
                    else:
                        item_list.append([name, price])

        return item_list, customization_dict

    def __convert_menu(self, input_json):
        output = {}

        restaurant = input_json.get("restaurant", {})
        categories = {cat["id"]: cat["name"] for cat in restaurant.get("categories", [])}
        customization_map = {
            group["id"]: group for group in restaurant.get("customizationGroups", [])
        }
        items = restaurant.get("items", [])

        for cat_name in categories.values():
            output[cat_name] = []

        for item in items:
            category_ids = item.get("categoryIds", [])

            category_id = category_ids[0] if category_ids else None
            category_name = categories.get(category_id, "Uncategorized")

            item_dict = {"name": item.get("name", "")}

            price = str(item.get("price", 0))
            if price != "0" and price != "0.0":
                item_dict["price"] = price

            customizations = item.get("customizationIds", [])
            customization_objects = []

            for cust_id in customizations:
                if cust_id in customization_map:
                    group = customization_map[cust_id]
                    converted_group = self.__convert_customization_group(group)
                    customization_objects.append(converted_group)

            if customization_objects:
                item_dict["customizations"] = customization_objects

            output[category_name].append(item_dict)

        return output