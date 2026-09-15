import React, {useState, useEffect} from "react";
import "./styles/profile.css";
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/useUser.js";
import axios from "axios";

import { useTheme } from "../context/ThemeContext.js";

const url = process.env.REACT_APP_API_URL;

export default function Profile() {
  const navigate = useNavigate();
  const {user, setUser} = useUser()
  const { isDarkMode, toggleTheme } = useTheme();

  const normalizeRole = (role) => {
    const normalizedRole = String(role || "").trim().toLowerCase();

    if (normalizedRole === "teacher" || normalizedRole === "opettaja") {
      return "teacher";
    }

    if (normalizedRole === "student" || normalizedRole === "oppilas") {
      return "student";
    }

    return normalizedRole;
  };

  const getRoleLabel = (role) => {
    switch (normalizeRole(role)) {
      case "teacher":
        return "Opettaja";
      case "student":
        return "Oppilas";
      default:
        return role || "-";
    }
  };

  const [avatarSvg, setAvatarSvg] = useState("");
  const initialSeed = user.avatar_seed || "default";

  const [editMode, setEditMode] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
      firstname: user.firstname,
      lastname: user.lastname,
      role: normalizeRole(user.role),
      email: user.email,
      phone: user.phone || "",
      avatar_seed: initialSeed
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]:value}))
  };

  const generateNewAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setFormData(prev => ({ ...prev, avatar_seed: randomSeed }));
    setEditMode("avatar");
  };


  const saveProfile = async () => {
    try{
        setSaving(true);
        const payload = {
            ...formData,
            role: normalizeRole(formData.role)
        };

        console.log("SENDING:", payload);

        const res = await axios.put(url + "/users/profile", payload,
            {headers:{Authorization: `Bearer `+ user.access_token }}
        );
        console.log("SUCCESS:", res.data);
        alert("Tiedot päivitetty.");

        const updatedUser = {
            ...user,
            ...payload
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

  
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        // Parametrit: animationVariant=medium, animationProbability=100
        const dicebearUrl = `https://api.dicebear.com/10.x/planets/svg?seed=${encodeURIComponent(
          formData.avatar_seed
        )}&animationVariant=fast&animationProbability=100`;

        const res = await axios.get(dicebearUrl);
        setAvatarSvg(res.data);
      } catch (err) {
        console.error("Virhe ladattaessa avatar-kuvaa:", err);
      }
    };

    fetchAvatar();
  }, [formData.avatar_seed]);



  return (
    <div className={`profile-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="profile-header">
        

        <div className="settings-title">
          <i className="fa-solid fa-gear"></i>
          <span>Asetukset</span>
        </div>

        <div className="profile-picture" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          {avatarSvg ? (
            <div 
              style={{ width: "200%", height: "auto", borderRadius: "50%", overflow: "hidden" }}
              dangerouslySetInnerHTML={{ __html: avatarSvg }} 
            />
          ) : (
            <div style={{ width: "90px", height: "90px" }}>Ladataan...</div>
          )}
          <button 
            type="button" 
            onClick={generateNewAvatar}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
            title="Vaihda profiilikuva"
          >
            <i className="fa-solid fa-arrows-rotate"></i> Vaihda kuva
          </button>
        </div>


        <div className="settings-right">
          <p>Vaihda teema</p>
          <div className={`sky ${isDarkMode ? "night" : "light"}`} onClick={toggleTheme}>
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
              <option value="teacher">Opettaja</option>
              <option value="student">Oppilas</option>
            </select>
          ) : (
          <span>{getRoleLabel(formData.role)}</span>
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

      <button className="back-btn" onClick={e => navigate("/home")}>
                Takaisin
        </button>

            

    </div>
  );
}
