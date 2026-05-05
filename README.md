CaloRight is a calorie tracking web application ran using XAMPP and React. It supports features such as creating and signing into accounts, setting daily calorie goals, adding/deleting foods from the current day's meal count, tracking calories from input food, scanning valid barcodes to track calories and macronutrients, searching for foods with the help of web API's.
--------------------------------------------------------------------------------------------------------------------------------
Installation:
===============================================================================================================================
[Prerequisites]:
- Node.js (version 18+)

- XAMPP (Apache + MySQL)

- Composer

- A free USDA FoodData Central API key
---------------------------------------------------------------------------------------------------------------------------------
[Database Setup]:
- Open XAMPP and start Apache and MySQL
- Open phpMyAdmin (http://localhost/phpmyadmin)
- Import CaloSQLVersion2.sql into it (CaloRight->CaloRight2->CaloSQLVersion2.sql)
---------------------------------------------------------------------------------------------------------------------------------
[Backend]:
1. Open XAMPP Control Panel and click "Explorer" on the right-hand side.
2. Copy the Front-End-V2/backend/ folder into your XAMPP htdocts directory and rename it to "CaloServer", then copy the file path of "CaloServer" by right-clicking and selecting "Copy as path"
3. (Don't do this step unless you get an error where the website can't connect to the database) Open up a file called "db.php" and type in your MySQL password in the apostrophe's where it says "$pass = '';"
4. Open up command prompt and type "cd 'path-to-CaloServer'" (replace 'path-to-CaloServer' with the path you copied before, and remove the apostrophes). Run that command
5. Type "composer install" into command prompt and run it. If you get an error, that probably means you haven't installed composer beforehand.
6. Set your USDA API key as an environment variable:
   - Windows (in command prompt, keep the quotation marks): setx USDA_API_KEY "your_key_here" (then restart XAMPP)
   - Mac/Linux: Add [export USDA_API_KEY="your_key_here"] to your shell profile (remove the brackets).
---------------------------------------------------------------------------------------------------------------------------------
[Running React]:
Copy the path to the "Front-End-V2" folder, and type the following into a terminal and run it one line at a time:

      cd 'path_to_Front-End-V2'
      npm install
      npm run dev
- The app will be available at http://localhost:5173

---------------------------------------------------------------------------------------------------------------------------------
[Additional Notes]:
- The backend runs on http://localhost/CaloServer/
- Frontend and backend must both be running at the same time
- The data/folder inside CaloServer/ is created automatically, do not delete it
---------------------------------------------------------------------------------------------------------------------------------

[Contributors]:
- Frontend: Van Lawn
- Main Backend: Jacob Klassen
- SQL/Minor Backend: Joshua Heath
