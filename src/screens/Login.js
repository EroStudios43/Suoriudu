import { useEffect, useState } from 'react';
import "./styles/home.css";
import "./styles/login.css";
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/useUser.js"

function Login() {
  const {user, setUser, signIn} = useUser()
  const navigate = useNavigate();

  const login = async () => {
    try {
      await signIn()
      navigate("/home")
    } catch (error) {
      const errorMessage = error.response.data.message ? error.response.data.message : error
      alert(errorMessage)
    }
  }

  return (
    <div className="body">  
      <div className="container container-sm login-container p-5 my-5 rounded-4">
        <div className="row">
          <div className="col-3 text-start">
            <button className="btn btn-link text-black fs-5 text-decoration-none" onClick={e => navigate("/")}>
                Takaisin
            </button>
          </div>
          <div className="col-6">
            <h2>Kirjaudu sisään</h2>
          </div>
          <div className="col-3"></div>
        </div>
        

        <form>
          <div className="form-floating mb-3 mt-3">
            <input type="text" id="email" name="email" className="form-control" placeholder="Syötä sähköpostiosoitteesi" value={user.email} onChange={e => setUser({...user, email: e.target.value})}/>
            <label for="email">Sähköposti</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="password" id="password" name="password" className="form-control" placeholder="Syötä salasanasi" value={user.password} onChange={e => setUser({...user, password: e.target.value})}/>
            <label for="password">Salasana</label>
          </div>
          <br />
          <div className="d-grid gap-2">
           <button type="button" className="btn btn-dark" id="loginButton" onClick={login}>Kirjaudu sisään</button>
          </div>
        </form>
      </div>
      <button className="btn btn-link text-black text-decoration-none" onClick={e => navigate("/register")}>
        <a className="link-light link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Ei tiliä? Rekisteröidy täältä!</a>
      </button>
    </div>
  );
}

export default Login;