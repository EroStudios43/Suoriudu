import { useEffect, useState } from 'react';
import "./styles/home.css";
import "./styles/login.css";
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/useUser.js"

function Login() {
  const {user, setUser, signIn} = useUser()
  const [ loginErrors, setLoginErrors ] = useState([])
  const [ showLoginErrors, setShowLoginErrors ] = useState(false)
  const [ formErrors, setFormErrors ] = useState([])
  const [ validated, setValidated ] = useState(false)
  const navigate = useNavigate();

  // Set the "ShowLoginErrors" variable to true, and a timer to set it to false. This displays the errors to the user, and launches another timer to gradually fade the box away
  useEffect(() => {
    if (loginErrors && loginErrors.length > 0) {
      // Show login errors
      setShowLoginErrors(true)

      // Set timer to dismiss the alert automatically after 5 seconds
      const timer = setTimeout(() => {
        setShowLoginErrors(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [loginErrors])

  // The slow fade effect of the alert. Clears the loginErrors-variable to hide the box
  useEffect(()=> {
    if (!showLoginErrors && loginErrors.length > 0) {
      const timer = setTimeout(() => {
        setLoginErrors([])
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [showLoginErrors])

  const login = async () => {

    // Frontend validation for email and password, this is done to prevent unnecessary requests to the backend and to give faster feedback to the user.
    setValidated(true)
    const newErrors = {}
    setFormErrors({})

    if (!user.email) {
      newErrors.email = "Sähköposti on pakollinen kenttä"
    }

    if (!user.password) {
      newErrors.password = "Salasana on pakollinen kenttä"
    }

    if (user.password && user.password.length < 8) {
      newErrors.password = "Salasanan on oltava vähintään 8 merkkiä pitkä"
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (user.email && !emailRegex.test(user.email)) {
      newErrors.email = "Virheellinen sähköpostiosoite"
    }

    setFormErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    try {
      await signIn()
      navigate("/home")
    } catch (error) {
      const errors = error.response?.data?.errors
      const errorMessage = error.response?.data?.message

      if (errors && errors.length > 0) {
        setLoginErrors(errors)
      } else {
        alert(errorMessage || "Kirjautumisessa ilmeni ongelmia. Yritä myöhemmin uudelleen.")
      }
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
        

        <form noValidate>
          <div className="form-floating mb-3 mt-3">
            {loginErrors && loginErrors.length > 0 && (
              <div 
                className={`alert alert-danger mt-3 alert-dismissable fade ${showLoginErrors ? "show" : ""}`}
                role="alert"
              >
                <button
                  type="button"
                  className="btn-close float-end"
                  onClick={() => {
                    setLoginErrors([])
                    setShowLoginErrors(false)
                  }}
                />
                {loginErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>
          <div className="form-floating mb-3 mt-3">
            <input 
              type="text" 
              id="email" 
              name="email" 
              className={`form-control ${
                validated && formErrors.email ? "is-invalid" : ""
              }`}
              placeholder="Syötä sähköpostiosoitteesi" 
              value={user.email} 
              onChange={e => setUser({...user, email: e.target.value})} 
              required
            />
            <label for="email">Sähköposti</label>
            <div className="invalid-feedback">{formErrors.email}</div>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input 
              type="password" 
              id="password" 
              name="password" 
              className={`form-control ${
                validated && formErrors.password ? "is-invalid" : ""
              }`}
              placeholder="Syötä salasanasi" 
              value={user.password} 
              onChange={e => setUser({...user, password: e.target.value})} 
              required
            />
            <label for="password">Salasana</label>
            <div class="invalid-feedback">{formErrors.password}</div>
            <div className="invalid-feedback">
              {loginErrors.password}
            </div>
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