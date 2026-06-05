import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUser.js";

export default function ProtectedRoute() {
  const { user } = useUser();
  return user?.access_token ? <Outlet /> : <Navigate to="/login" />;
}

