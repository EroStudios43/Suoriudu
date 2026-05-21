import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  const user = null; // myöhemmin  oikea auth

  return user ? <Outlet /> : <Navigate to="/login" />;
}

export default ProtectedRoute;