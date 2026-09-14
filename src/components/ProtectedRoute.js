import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { jwtDecode } from "jwt-decode"

function ProtectedRoute() {
  const { user, signOut } = useUser()
  const [ expired, setExpired ] = useState(false)

  useEffect(() => {
    // If there's no access token, set expired variable to false and log out
    if (!user?.access_token) {
      setExpired(true)
      return
    }

    // See if the token is expired so we can reroute the user to the login page
    try {
      const { exp } = jwtDecode(user.access_token)
      const timeUntilExpiration = exp * 1000 - Date.now()

      if (timeUntilExpiration <= 0) {
        setExpired(true)
        return
      }
      // Timer for making sure the user is rerouted if the token wasn't expired yet
      const timer = setTimeout(() => {
        setExpired(true)
      }, timeUntilExpiration)

      return () => clearTimeout(timer)

    } catch (e){
      setExpired(true)
    }
  }, [user?.access_token])

  useEffect(() => {
    if (expired && user) {
      signOut()
    }
  }, [expired])

  // If the token is expired, log out, navigate to login and remove the stack history
  if (expired) {
    return <Navigate to="/login"/>
  }

  return <Outlet />;
}

export default ProtectedRoute;