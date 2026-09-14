import { useEffect, useState } from 'react';
import "./styles/home.css";
import "./styles/login.css";
import { useNavigate } from "react-router-dom"
import { useUser } from '../context/useUser.js';

function Register() {
  const { user, setUser, signUp } = useUser()
  const [ signUpErrors, setSignUpErrors ] = useState({})
  const [ showSignUpErrors, setShowSignUpErrors ] = useState(false)
  const [ formErrors, setFormErrors ] = useState([])
  const [ validated, setValidated ] = useState(false)
  const navigate = useNavigate();

  // Setting the default role to student when registering, this can be changed by admin later, or here in code for testing purposes
  useEffect(() => {
    setUser({...user, role: "student"})
  }, [])

  // Set the "showSignUpErrors" variable to true, and a timer to set it to false. This displays the errors to the user, and launches another timer to gradually fade the box away
  useEffect(() => {
    // Show sign up errors
    setShowSignUpErrors(true)

    // Set timer to dismiss the alert automatically after 5 seconds
    const timer = setTimeout(()=> {
      setShowSignUpErrors(false)
    }, 5000)

    return () => clearTimeout(timer);
  }, [signUpErrors])

  // The slow fade effect of the alert. Clears the signUpErrors-variable to hide the box
  useEffect(()=> {
    if (!showSignUpErrors && Object.keys(signUpErrors).length > 0) {
      const timer = setTimeout(() => {
        setSignUpErrors([])
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [showSignUpErrors])

  const registerUser = async () => {

    // Frontend validation, this is done to prevent unnecessary requests to the backend and to give faster feedback to the user.
    setValidated(true)
    const newErrors = {}

    if (!user.email) {
      newErrors.email = "Sähköposti on pakollinen kenttä"
    }

    if (!user.firstname) {
      newErrors.firstname = "Etunimi on pakollinen kenttä"
    }

    if (!user.lastname) {
      newErrors.lastname = "Sukunimi on pakollinen kenttä"
    }

    if (!user.password) {
      newErrors.password = "Salasana on pakollinen kenttä"
    }

    if (!user.passwordCheck) {
      newErrors.passwordCheck = "Salasanan tarkistus on pakollinen kenttä"
    }

    if (!newErrors.passwordCheck && user.password !== user.passwordCheck) {
      newErrors.passwordCheck = "Salasana ja salasanan tarkistus eivät täsmää"
    }

    if (user.password && (user.password.length < 8 || !/[A-Z]/.test(user.password) || !/\d/.test(user.password))) {
      newErrors.password = "Salasanan on oltava vähintään 8 merkkiä pitkä, sekä sisältää ainakin yksi suuri kirjain ja numero."
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (user.email && !emailRegex.test(user.email)) {
      newErrors.email = "Virheellinen sähköpostiosoite"
    }

    if (user.phone && !/^\+\d{7,15}$/.test(user.phone.trim())) {
      newErrors.phone = "Virheellinen puhelinnumero. Käytäthän kansainvälistä muotoa (+358401234567)"
    }

    setFormErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    try {
      await signUp()
      navigate("/home")
    } catch(error) {
      const errors = error.response?.data?.errors
      const errorMessage = error.response?.data?.message

      if (errors && Object.keys(errors).length > 0) {
        setSignUpErrors(errors)
      } else {
        alert(errorMessage || "Rekisteröitymisessä ilmeni ongelmia. Yritä myöhemmin uudelleen.")
      }
    }
  }

  return (
    <div className="container container-fluid d-flex flex-column justify-content-center align-items-center">  
      <div className="container-lg login-container p-5 my-5 rounded-4">
        <div className="row">
          <div className="col-3 text-start">
            <button className="btn btn-link text-black fs-5 text-decoration-none" onClick={e => navigate("/")}>
                Takaisin
            </button>
          </div>
          <div className="col-6">
            <h2>Rekisteröidy</h2>
          </div>
          <div className="col-3"></div>
        </div>
        

        <form noValidate>
          <div className="form-floating mb-3 mt-3">
            {signUpErrors && Object.keys(signUpErrors).length > 0 && (
              <div 
                className={`alert alert-danger mt-3 alert-dismissable fade ${showSignUpErrors ? "show" : ""}`}
                role="alert"
              >
                <button
                  type="button"
                  className="btn-close float-end"
                  onClick={() => {
                    setSignUpErrors({})
                    setShowSignUpErrors(false)
                  }}
                />
                {Object.values(signUpErrors).map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>
          <div className="form-floating mb-3 mt-3">
            <input 
              type="text" 
              id="firstname" 
              name="firstname" 
              className={`form-control ${
                validated && formErrors.firstname ? "is-invalid" : ""
              }`}
              placeholder="Syötä etunimesi" 
              value={user.firstname} 
              onChange={e => setUser({...user, firstname: e.target.value})}
              required
            />
            <label for="firstname">Etunimi</label>
            <div className="invalid-feedback">{formErrors.firstname}</div>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input 
              type="text" 
              id="lastname" 
              name="lastname" 
              className={`form-control ${
                validated && formErrors.lastname ? "is-invalid" : ""
              }`}
              placeholder="Syötä sukunimesi" 
              value={user.lastname} 
              onChange={e => setUser({...user, lastname: e.target.value})}
              required
            />
            <label for="lastname">Sukunimi</label>
            <div className="invalid-feedback">{formErrors.lastname}</div>
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
              type="text" 
              id="phone" 
              name="phone" 
              className={`form-control ${
                validated && formErrors.phone ? "is-invalid" : ""
              }`}
              placeholder="Syötä puhelinnumero" 
              value={user.phone} 
              onChange={e => setUser({...user, phone: e.target.value})}
            />
            <label for="phone">Puhelinnumero</label>
            <div className="invalid-feedback">{formErrors.phone}</div>
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
            <div className="invalid-feedback">{formErrors.password}</div>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input 
              type="password" 
              id="passwordcheck" 
              name="passwordcheck" 
              className={`form-control ${
                validated && formErrors.passwordCheck ? "is-invalid" : ""
              }`}
              placeholder="Syötä salasanasi uudelleen" 
              value={user.passwordCheck} 
              onChange={e => setUser({...user, passwordCheck: e.target.value})}
              required
            />
            <label for="passwordcheck">Syötä salasana uudelleen</label>
            <div className="invalid-feedback">{formErrors.passwordCheck}</div>
          </div>
          <br />
          <div className="d-grid gap-2">
           <button type="button" className="btn btn-dark" id="registerButton" onClick={registerUser}>Rekisteröidy</button>
          </div>
        </form>
      </div>
      <button className="btn btn-link text-black text-decoration-none" onClick={e => navigate("/login")}>
        <a className="link-light link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Onko sinulla jo tili? Kirjaudu sisään täältä!</a>
      </button>
    </div>
  );
}

export default Register;