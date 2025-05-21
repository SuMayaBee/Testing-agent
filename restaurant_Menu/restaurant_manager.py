import json
import os
import pytz
import requests
from datetime import datetime, timedelta
from restaurant_Menu.menu_modifier import MenuModifier
from dotenv import load_dotenv

load_dotenv()


PHONELINE_DASHBOARD_BACKEND_BASE_URL="https://phoneline-dashboard-backend-63qdm.ondigitalocean.app"
phone_number="+19202808073"

class RestaurantHelper:
    def __init__(self, phone_number):
        self._phone_number = phone_number.strip("+")
        self._data = self.__fetch_restaurant_data()
        self._restaurant_info = self._data.get("restaurant", {})

        self._menu_modifier = MenuModifier(self._data)
        
        # Variables that are used outside the class
        self.menu = self._menu_modifier.converted_menu
        self.item_list = self._menu_modifier.item_list
        self.customization_dict = self._menu_modifier.customization_dict
        self.category_list = self._menu_modifier.category_list
        
        # Save data to folder named data in the root directory, use only for debugging
        self.__save_data()

    def __save_data(self, directory="data"):
        os.makedirs(directory, exist_ok=True)
        restaurant_name = self.__get_restaurant_name().replace(" ", "_")
        base_filename = f"{restaurant_name}"

        initial_data_path = os.path.join(directory, f"{base_filename}_data.json")
        with open(initial_data_path, "w") as f:
            json.dump(self._data, f, indent=4)

        simplified_data = {
            "category_list": self.category_list,
            "item_list": self.item_list,
            "customization_dict": self.customization_dict
        }
        
        simplified_data_path = os.path.join(directory, f"{base_filename}_simplified.json")
        with open(simplified_data_path, "w") as f:
            json.dump(simplified_data, f, indent=4)
            
        converted_menu_path = os.path.join(directory, f"{base_filename}_converted.json")
        with open(converted_menu_path, "w") as f:
            json.dump(self.menu, f, indent=4)

    def __fetch_restaurant_data(self):
        try:
            restaurant_data = requests.get(
                f"{PHONELINE_DASHBOARD_BACKEND_BASE_URL}/api/v1/restaurant/get-restaurant-info/{self._phone_number}"
            ).json()
            return restaurant_data
        except Exception as e:
            print(f"Error fetching restaurant data: {e}")
            return {}

    def __get_restaurant_name(self):
        return self._restaurant_info.get("name", "Unknown Restaurant")

    def __get_restaurant_address(self):
        return self._restaurant_info.get("address", "Address not available")

    def __get_restaurant_faqs(self):
        return self._restaurant_info.get("faqs", "No FAQs available")

    def __get_delivery_config(self):
        return self._restaurant_info.get("deliveryConfig", {})

    def __is_open(self):
        try:
            if self._restaurant_info.get("restaurantOrderStatus") == "paused":
                return False

            tz = pytz.timezone("Canada/Eastern")
            now = datetime.now(tz)
            current_day = now.strftime("%a")
            current_time = now.time()

            opening_hours = self._restaurant_info.get("openingHours", [])
            prev_day = (now - timedelta(days=1)).strftime("%a")
            last_two_days_opening_hours = [
                period for period in opening_hours
                if current_day in period.get("days", []) or prev_day in period.get("days", [])
            ]

            for period in last_two_days_opening_hours:
                # For newer data format with slots
                if "slots" in period:
                    slots = period.get("slots", [])
                    for slot in slots:
                        start_time = slot.get("startTime")
                        end_time = slot.get("endTime")
                        
                        if start_time and end_time:
                            start = datetime.strptime(start_time, "%H:%M").time()
                            end = datetime.strptime(end_time, "%H:%M").time()

                            # Handle overnight slots
                            if end < start:
                                if current_time >= start or current_time < end:
                                    return True
                            elif start <= current_time < end:
                                return True
                # For older data format
                elif "startTime" in period and "endTime" in period:
                    start = datetime.strptime(period["startTime"], "%H:%M").time()
                    end = datetime.strptime(period["endTime"], "%H:%M").time()

                    # Handle overnight hours
                    if end < start:
                        if current_time >= start or current_time < end:
                            return True
                    elif start <= current_time < end:
                        return True

            return False
        except Exception as e:
            print(f"Error checking restaurant hours: {e}")
            return False

    def __get_formatted_opening_hours(self):
        days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        try:
            hours_data = self._restaurant_info.get("openingHours", [])
            if not hours_data:
                return "Opening hours not available"

            formatted_hours = []

            for period in hours_data:
                days = period.get("days", [])
                if not days:
                    continue

                # Format days display (consecutive days are shown as ranges)
                if len(days) > 2:
                    consecutive = True
                    for i in range(1, len(days)):
                        day_idx = days_of_week.index(days[i-1])
                        next_day_idx = days_of_week.index(days[i])
                        if (next_day_idx - day_idx) % 7 != 1:
                            consecutive = False
                            break

                    days_str = f"{days[0]}-{days[-1]}" if consecutive else ", ".join(days)
                else:
                    days_str = ", ".join(days)

                # For newer data format with slots
                if "slots" in period:
                    slots = period.get("slots", [])
                    if not slots:
                        continue

                    slot_times = []
                    for slot in slots:
                        start_time = slot.get("startTime")
                        end_time = slot.get("endTime")

                        if not start_time or not end_time:
                            continue

                        try:
                            start_datetime = datetime.strptime(start_time, "%H:%M")
                            start_formatted = start_datetime.strftime("%I:%M %p")
                            end_datetime = datetime.strptime(end_time, "%H:%M")
                            end_formatted = end_datetime.strftime("%I:%M %p")
                            
                            if end_datetime < start_datetime:
                                end_formatted += " (next day)"
                                
                            slot_times.append(f"{start_formatted} - {end_formatted}")
                        except ValueError:
                            slot_times.append(f"{start_time} - {end_time}")

                    if slot_times:
                        formatted_hours.append(f"{days_str}: {', '.join(slot_times)}")

                # For older data format
                elif "startTime" in period and "endTime" in period:
                    start_time = period.get("startTime")
                    end_time = period.get("endTime")

                    if not start_time or not end_time:
                        continue

                    try:
                        start_datetime = datetime.strptime(start_time, "%H:%M")
                        start_formatted = start_datetime.strftime("%I:%M %p")
                        end_datetime = datetime.strptime(end_time, "%H:%M")
                        end_formatted = end_datetime.strftime("%I:%M %p")
                        
                        if end_datetime < start_datetime:
                            end_formatted += " (next day)"
                            
                        formatted_hours.append(f"{days_str}: {start_formatted} - {end_formatted}")
                    except ValueError:
                        formatted_hours.append(f"{days_str}: {start_time} - {end_time}")

            return str("\n".join(formatted_hours)) if formatted_hours else "Opening hours not available"

        except Exception as e:
            print(f"Error getting opening hours: {e}")
            return "Error retrieving opening hours"

    def __get_greeting_message(self):
        if not self.__is_open():
            return str(self._restaurant_info.get("greetings", {}).get("closed", "Sorry, we're currently closed."))
        else:
            return str(self._restaurant_info.get("greetings", {}).get("open", "Hey there, welcome to [$Restaurant Name], my name is Yobo!"))

    def __get_announcement(self):
        return str(self._restaurant_info.get("announcement", "").replace("&#x20;", ""))

    def __has_delivery_service(self):
        return self._restaurant_info.get("hasDeliveryService", False)

    def __get_forward_number(self):
        return self._restaurant_info.get("contacts", {}).get("forwardPhone")

    def get_restaurant_data(self):
        """
        Get all restaurant data in one dictionary.
        The keys are as follows:
        - restaurant_name
        - restaurant_id
        - restaurant_address
        - category_list
        - item_list
        - customization_dict
        - deliveryConfig
        - restaurant_faqs
        - is_open
        - opening_hours
        - has_delivery_service
        - greeting_message
        - announcement
        - forward_number
        """
        return {
            "restaurant_name": self.__get_restaurant_name(),
            "restaurant_id": self._restaurant_info.get("restaurantId", ""),
            "restaurant_address": self.__get_restaurant_address(),
            "category_list": self.category_list,
            "item_list": self.item_list,
            "customization_dict": self.customization_dict,
            "deliveryConfig": self.__get_delivery_config(),
            "restaurant_faqs": self.__get_restaurant_faqs(),
            "is_open": self.__is_open(),
            "opening_hours": self.__get_formatted_opening_hours(),
            "has_delivery_service": self.__has_delivery_service(),
            "greeting_message": self.__get_greeting_message(),
            "announcement": self.__get_announcement(),
            "forward_number": self.__get_forward_number(),
        }