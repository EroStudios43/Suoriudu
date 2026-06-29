import React, {useState} from "react";
import "./styles/profile.css";
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/useUser.js";
import axios from "axios";

const url = process.env.REACT_APP_API_URL;

export default function Profile() {
  const navigate = useNavigate();
  const {user, setUser} = useUser()

  const [darkMode, setDarkMode] = useState(false);

  const [editMode, setEditMode] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      email: user.email,
      phone: user.phone || ""
  });

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]:value}))
  };

  const saveProfile = async () => {
    try{
        setSaving(true);
        console.log("SENDING:", formData);

        const res = await axios.put(url + "/users/profile",formData,
            {headers:{Authorization: `Bearer `+ user.access_token }}
        );
        console.log("SUCCESS:", res.data);
        alert("Tiedot päivitetty.");

        const updatedUser = {
            ...user,
            ...formData
        };

        setUser(updatedUser);
        sessionStorage.setItem("user", JSON.stringify(updatedUser));  
        setEditMode(null)
    }catch(err){
        alert("Talletuksessa ongelma")
        console.log("SAVE ERROR:", err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };
  



  return (
    <div className="profile-container">
      <div className="profile-header">
        

        <div className="settings-title">
          <i className="fa-solid fa-gear"></i>
          <span>Asetukset</span>
        </div>

        <div className="profile-picture">
          <i className="fa-solid fa-circle-user profilepic-icon"></i>
          <i className="fa-regular fa-pen-to-square edit-profile-icon"></i>
        </div>

        <div className="settings-right">
          <p>Vaihda teema</p>
          <div className={`sky ${darkMode ? "night" : "light"}`} onClick={() => setDarkMode(!darkMode)}>
            <div className="sun">
              <div className="rays" />
            </div>
            <div className="moon">
              <span className="crater c1" />
              <span className="crater c2" />
              <span className="crater c3" />
              <span className="crater c4" />
              <span className="crater c5" />
              <span className="crater c6" />
              <span className="crater c7" />
              <span className="crater c8" />
              <span className="crater c9" />
              <span className="crater c10" />
              <span className="crater c11" />
              <span className="crater c12" />
              <span className="crater c13" />
              <span className="crater c14" />

            </div>
            <div className="stars">
              <span className="star star-1"/>
              <span className="star star-2"/>
              <span className="star star-3"/>
              <span className="star star-4"/>
              <span className="star star-5"/>
            </div>
          </div>

          <div className="languages">
            🇫🇮 🇬🇧
          </div>

          <button className="password-btn">
            Salasanan vaihto
          </button>
        </div>


      </div>
            
            
      <div className="profile-info">

        <div className="info-item" onClick={() => setEditMode("firstname")}>
          <i className="fa-regular fa-pen-to-square"></i>
          {editMode === "firstname" ? (
            <div className="input-group">
              <input name="firstname" value={formData.firstname} onChange={handleChange}/>
              <input name="lastname" value={formData.lastname} onChange={handleChange}/>
            </div>
          ) : (
            <span>{formData.firstname} {formData.lastname}</span>
          )}
        </div>


        <div className="info-item" onClick={() => setEditMode("role")}>
          <i className="fa-regular fa-pen-to-square"></i>
          {editMode === "role" ? (
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Opettaja">Opettaja</option>
              <option value="Oppilas">Oppilas</option>
            </select>
          ) : (
          <span>{formData.role}</span>
          )}
        </div>

        <div className="info-item" onClick={() => setEditMode("email")}>
          <i className="fa-regular fa-pen-to-square"></i>
          {editMode === "email" ? (
            <input type="email" name="email" value={formData.email} onChange={handleChange}/>
          ) : (
            <span>Sähköposti: {formData.email}</span>
          )}
        </div>

        <div className="info-item" onClick={() => setEditMode("phone")}>
          <i className="fa-regular fa-pen-to-square"></i>
          {editMode === "phone" ? (
            <input name="phone" value={formData.phone} onChange={handleChange}/>
          ) : (
            <span>Puhelin: {formData.phone || "-"}</span>
          )}
        </div>

      </div>
      {editMode &&
        <button className="save-btn" onClick={saveProfile}>
          {saving ? "Tallennetaan..." : "Tallenna"}
        </button>
      }

      <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/home")}>
                Takaisin
        </button>

            

    </div>
  );
}
