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
import TestQuestions from './screens/TestQuestions.js';
import TaskResults from './screens/TaskResults.js';
import ExamLobby from './screens/ExamLobby.js';
import TaskEvaluation from "./screens/TaskEvaluation.js";
import WeeksExercises from "./screens/WeeksExercises.js";
import WavePagesLayout from './screens/WavePagesLayout.js';
import WeekOverview from './screens/WeekOverview.js';

import ProtectedRoute from "./components/ProtectedRoute.js";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>

          {/* PUBLIC */}
          
          {/* 
          Wave pattern background pages.
          The elements inside do not need the body class div, since it's included in the parent layout
          */}
          <Route element={<WavePagesLayout />}>
            <Route path="/" element={<WelcomePage/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
          </Route>
          
          {/* PROTECTED */}
          <Route element={<ProtectedRoute />}>

            <Route path="/home" element={<Home/>} />
            <Route path="/profile" element={<Profile/>} />
            <Route path="/CreateTask" element={<CreateTask/>} />
            <Route path="/CreateExam" element={<CreateExam/>} />
            <Route path="/CreateCourse" element={<CreateCourse/>} />
            <Route path="/CoursePage/:courseId" element={<CoursePage/>} />
            <Route path="/TaskOverview" element={<TaskOverview/>} />
            <Route path="/TestOverview" element={<TestOverview/>} />
            <Route path="/TaskResults/:idexercise" element={<TaskResults/>} />
            <Route path="/TaskQuestions/:idexercise" element={<TaskQuestions/>} />
            <Route path="/TaskEvaluation" element={<TaskEvaluation/>} />
            <Route path="/TestQuestions/:idexercise" element={<TestQuestions/>} />
            <Route path="/ExamLobby/:idexercise" element={<ExamLobby />} />
            <Route path="/WeekOverview" element={<WeekOverview/>} />
            <Route path="/WeeksExercises/:idweek" element={<WeeksExercises />} />
          </Route>

        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);


