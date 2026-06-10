import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { jwtDecode } from "jwt-decode"

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token)
    return exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function ProtectedRoute() {
  const { user } = useUser()

  return isTokenValid(user.access_token) ? <Outlet /> : <Navigate to="/login" />;
}

export default ProtectedRoute;