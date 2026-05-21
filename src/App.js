import './App.css';
import { useEffect, useState } from 'react';

function App() {

  const [users, setUsers] = useState([]);

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

      <h2>Kokelas</h2>

      <form>
        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />
        <br />
        <button type="submit">Login</button>
      </form>

      <ul>

        {users.map(user => (
          <li key={user.id}>
            {user.nimi}
          </li>
        ))}

      </ul>

    </div>
  );
}

export default App;