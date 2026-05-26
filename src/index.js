import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import {BrowserRouter, Routes, Route} from 'react-router-dom';

import UserProvider from "./context/UserProvider.js";

// screens
import WelcomePage from "./screens/welcomepage.js";
import Login from "./screens/Login.js";

import ProtectedRoute from "./components/ProtectedRoute.js";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>

          {/* PUBLIC */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<Login />} />

          {/* PROTECTED */}
          <Route element={<ProtectedRoute />}>
          </Route>

        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);


