import pool from "../helpers/database.js";

const getUsers = async () => {

    const [rows] = await pool.promise().query(
        "SELECT * FROM users"
    );
    return rows;
}

const createUser = async (firstname, lastname, email, hashedpassword, phone, role) => {
    const [result] = await pool.promise().query("INSERT INTO users (firstname, lastname, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)", [firstname, lastname, email, hashedpassword, phone ? phone.trim() : null, role])
    return result
}

const selectUserByEmail = async (email) => {
    const [rows] = await pool.promise().query("SELECT * FROM users WHERE email = ?", [email])
    return rows
}

const selectUserById = async (id) => {
    const [rows] = await pool.promise().query("SELECT * FROM users WHERE iduser = ?", [id])
    return rows
}

const updateUser = (email,data)=>{
    return new Promise((resolve,reject)=>{pool.query("UPDATE users SET firstname=?, lastname=?, email=?, phone=?, role=?, avatar_seed = ? WHERE email=? ",[data.firstname,data.lastname,data.email,data.phone,data.role,data.avatar_seed,email,],            
        (err,result)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(result);
                }
            }
        );

    });
};

export { getUsers, createUser, selectUserByEmail, selectUserById, updateUser }