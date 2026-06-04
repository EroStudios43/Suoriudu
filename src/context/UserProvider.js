import { createContext, useState } from "react"
import { UserContext } from "./UserContext.js"
import axios from "axios"

const url = process.env.REACT_APP_API_URL

export default function UserProvider({ children }) {
  const userFromSessionStorage = sessionStorage.getItem("user")
  const [user, setUser] = useState(userFromSessionStorage ? JSON.parse(userFromSessionStorage) : ({id: "", firstname: "", lastname: "", email: "", password: "", access_token: "", oldPassword: ""}))

  const signUp = async () => {
    try {
      console.log(user)
      await axios.post(url + "/users/register", user)
      setUser({email: "", firstname: "", lastname: "", password: ""})
    } catch (error) {
      throw error
    }
  }

  const signIn = async () => {
    try {
      const response = await axios.post(url + "/users/login", user)
      const token = readAuthorizationHeader(response)
      const userData = { id: response.data.id, email: response.data.email, firstname: response.data.firstname, lastname: response.data.lastname, access_token: token }
      setUser(userData)
      sessionStorage.setItem("user", JSON.stringify(userData))
    } catch (error) {
      setUser({email: "", firstname: "", lastname: "", password: ""})
      throw error
    }
  }

  const updateToken = (response) => {
      const token = readAuthorizationHeader(response)
      const newUser = {...user, access_token: token}
      setUser(newUser)
      sessionStorage.setItem("user", JSON.stringify(newUser))
  }

  const readAuthorizationHeader = (response) => {
      if (response.headers.get("authorization") &&
          response.headers.get("authorization").split(" ")[0] === "Bearer") {
          return response.headers.get("authorization").split(" ")[1]
      }
  }

  const signOut = () => {
    sessionStorage.clear()
    setUser({id: "", firstname: "", lastname: "", email: "", password: "", access_token: ""})
  }

  return (
    <UserContext.Provider value={{user, setUser, signUp, signIn, signOut, updateToken}}>
      {children}
    </UserContext.Provider>
  );
}
