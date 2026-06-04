import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import {BrowserRouter, Routes, Route} from 'react-router-dom';

import UserProvider from "./context/UserProvider.js";

// screens
import WelcomePage from "./screens/welcomepage.js";
import Login from "./screens/Login.js";
import Register from "./screens/Register.js";
import Home from "./screens/Home.js"; 
import Profile from "./screens/Profile.js";
import CreateTask from "./screens/CreateTask.js";
import CreateExam from "./screens/CreateExam.js";
import CreateCourse from "./screens/CreateCourse.js";
import CoursePage from "./screens/CoursePage.js";
import TaskOverview from "./screens/TaskOverview.js";
import TestOverview from "./screens/TestOverview.js";
import TaskQuestions from "./screens/TaskQuestions.js";
import TaskEvaluation from "./screens/TaskEvaluation.js";

import ProtectedRoute from "./components/ProtectedRoute.js";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>

          {/* PUBLIC */}
          <Route path="/" element={<WelcomePage/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />

          <Route path="/home" element={<Home/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/CreateTask" element={<CreateTask/>} />
          <Route path="/CreateExam" element={<CreateExam/>} />
          <Route path="/CreateCourse" element={<CreateCourse/>} />
          <Route path="/CoursePage" element={<CoursePage/>} />
          <Route path="/TaskOverview" element={<TaskOverview/>} />
          <Route path="/TestOverview" element={<TestOverview/>} />
          <Route path="/TaskQuestions" element={<TaskQuestions/>} />
          <Route path="/TaskEvaluation" element={<TaskEvaluation/>} />
          {/* PROTECTED */}
          <Route element={<ProtectedRoute />}>

          </Route>

        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);


