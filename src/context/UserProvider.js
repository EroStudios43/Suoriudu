import { createContext, useState } from "react"
import { UseLocation } from "react-router-dom"
import { UserContext } from "./UserContext.js"
import axios from "axios"

const url = process.env.REACT_APP_API_URL

export default function UserProvider({ children }) {
  const userFromSessionStorage = sessionStorage.getItem("user")
  const [user, setUser] = useState(userFromSessionStorage ? JSON.parse(userFromSessionStorage) : ({id: "", firstname: "", lastname: "", email: "", role: "", phone: "", password: "", passwordCheck: "", access_token: "", oldPassword: ""}))

  const signUp = async () => {
    try {
      console.log(user)

      await axios.post(url + "/users/register", user)
      await signIn()
    } catch (error) {
      setUser(prev => ({...prev, id: "", email: "", firstname: "", lastname: "", password: "", phone: "", passwordCheck: "", access_token: "", oldPassword: ""}))
      throw error
    }
  }

  const signIn = async () => {
    try {
      const response = await axios.post(url + "/users/login", user)
      const token = readAuthorizationHeader(response)
      const userData = { id: response.data.id, email: response.data.email, firstname: response.data.firstname, lastname: response.data.lastname, role: response.data.role, phone: response.data.phone, access_token: token, password: "", passwordCheck: "", oldPassword: "" }
      setUser(userData)
      sessionStorage.setItem("user", JSON.stringify(userData))
    } catch (error) {
      setUser(({id: "", email: "", firstname: "", lastname: "", password: "", role: "", phone: "", passwordCheck: "", access_token: "", oldPassword: ""}))
      throw error
    }
  }

  const updateToken = (response) => {
      const token = readAuthorizationHeader(response)
      if (!token) return

      // Old function caused looping when updating token. Preventing looping here
      if (token === user?.access_token) return

      // Set token here if it actually changed
      const newUser = {...user, access_token: token}
      setUser(newUser)
      sessionStorage.setItem("user", JSON.stringify(newUser))
  }

  const readAuthorizationHeader = (response) => {
      if (response.headers["authorization"] &&
          response.headers["authorization"].split(" ")[0] === "Bearer") {
          return response.headers["authorization"].split(" ")[1]
      }
  }

  const signOut = () => {
    sessionStorage.clear()
    localStorage.clear();
    setUser({id: "", firstname: "", lastname: "", email: "", password: "", role: "", phone: "", passwordCheck: "", access_token: "", oldPassword: ""})
  }

  return (
    <UserContext.Provider value={{user, setUser, signUp, signIn, signOut, updateToken}}>
      {children}
    </UserContext.Provider>
  );
}
