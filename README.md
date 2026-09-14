# What this project includes

## Project goal
Build a web-based system for:
  - Weekly assignments
  - Exam monitoring
  - Cheating detection

## Team
  - Ronja - Developer
  - Ella - Developer

## Tech Stack
  - Frontend
  - Backend
  - Database
  - AI

## How to Run

### `npm i`
  Install the dependencies for the project.

### `npm start`

  Runs the app in the development mode.\
  Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

  The page will reload when you make changes.\
  You may also see any lint errors in the console.

### `npm run build`

  Builds the app for production to the `build` folder.\
  It correctly bundles React in production mode and optimizes the build for the best performance.

  The build is minified and the filenames include the hashes.\
  Your app is ready to be deployed!

  See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `node backend/server.js`
  
  Runs the backend.
  Must be restarted if changes are made to the backend folder.

### Database

  The database words with MySQL, and you can set up your own server whichever way you need to.
  A local development database can run with XAMPP, for example.
  Get the contents of the database from the create_tables.sql file, and bring the corresponding table creation queries into the chosen application.

### .env
  Create an .env file to the ROOT FOLDER of the project. The values are the following:

  DB_HOST=
  DB_PORT=
  DB_USER=
  DB_PASSWORD=
  DB_NAME=
  REACT_APP_API_URL = 
  JWT_SECRET_KEY = 
  Ai_API_KEY=
  GENERATE_SOURCEMAP=

## Current status
  - Phase: Customer review pending
  - What's working: User registration and login, teacher and student functionalities
  - What's next: Customer review, possible additions or modifications to implemented functionalities, language settings'

## Key features
  - [✓] Weekly assignments
  - [✓] Exam mode
  - [✓] Gaze tracking
  - [✓] Tab tracking
  - [✓] Teacher AI assistant
  - [✓] Programming exercises
  - [✓] Teacher dashboard
  - [✓] Student dashboard
  - [✓] Commenting and questions for teachers and students
  - [✓] Easy way to see student progress for teachers
  - [✓] Automatic closing times for student's exercises
  - [✓] Automatic return of exam when time ends
  - [✓] Sanitization and validations of user inputs
  - [✓] Light - Dark mode
  - [✓] Profile picture
  - [✓] Responsive UI
