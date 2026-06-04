import { useEffect, useState } from 'react';
import "./styles/home.css";
import "./styles/login.css";
import { useNavigate } from "react-router-dom"
import { useUser } from '../context/useUser.js';

function Register() {
  const { user, setUser, signUp } = useUser()
  const navigate = useNavigate();

  // Setting the default role to student when registering, this can be changed by admin later, or here in code for testing purposes
  useEffect(() => {
    setUser({...user, role: "student"})
    console.log(user)
  }, [])

  const registerUser = async () => {
    try {
      await signUp()
      navigate("/login")
    } catch(error) {
      const errorMessage = error.response.data.message || error;
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
            <h2>Rekisteröidy</h2>
          </div>
          <div className="col-3"></div>
        </div>
        

        <form>
          <div className="form-floating mb-3 mt-3">
            <input type="text" id="firstname" name="firstname" className="form-control" placeholder="Syötä etunimesi" value={user.firstname} onChange={e => setUser({...user, firstname: e.target.value})}/>
            <label for="firstname">Etunimi</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="text" id="lastname" name="lastname" className="form-control" placeholder="Syötä sukunimesi" value={user.lastname} onChange={e => setUser({...user, lastname: e.target.value})}/>
            <label for="lastname">Sukunimi</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="text" id="email" name="email" className="form-control" placeholder="Syötä sähköpostiosoitteesi" value={user.email} onChange={e => setUser({...user, email: e.target.value})}/>
            <label for="email">Sähköposti</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="text" id="phone" name="phone" className="form-control" placeholder="Syötä puhelinnumero" value={user.phone} onChange={e => setUser({...user, phone: e.target.value})}/>
            <label for="phone">Puhelinnumero</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="password" id="password" name="password" className="form-control" placeholder="Syötä salasanasi" value={user.password} onChange={e => setUser({...user, password: e.target.value})}/>
            <label for="password">Salasana</label>
          </div>
          <div className="form-floating mb-3 mt-3">
            <input type="password" id="passwordcheck" name="passwordcheck" className="form-control" placeholder="Syötä salasanasi uudelleen" value={user.passwordCheck} onChange={e => setUser({...user, passwordCheck: e.target.value})}/>
            <label for="passwordcheck">Syötä salasana uudelleen</label>
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