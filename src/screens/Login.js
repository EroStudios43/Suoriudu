import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom"



function Login() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();


  useEffect(() => {
    fetch('http://localhost:3001/users')
      .then(res => res.json())
      .then(data => {
        console.log(data);
        setUsers(data);
      });
  }, []);

  return (
    <div id="container">
      <h2>Login?</h2>

          <button className="btn btn-link text-black fs-4 text-decoration-none" onClick={e => navigate("/")}>
              Takaisin
          </button>

      <form>
        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />
        <br />
        <button type="submit">Login</button>
      </form>

      <ul>
        {users.map(user => (
          <li key={user.idcourse}>
            {user.coursename}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Login;