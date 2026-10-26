import {query}  from "../config/database";
import bcrypt from "bcryptjs";
import {type user} from "../types/types";

//Find user by email
export const findUserByEmail = async (email: string):Promise<user | null> =>{

    const {rows}=await query("SELECT *FROM users WERE email =$1",[email]);
    return rows[0] || null ;
};

export const createUser = async (

  email: string,
  password: string
): Promise<user> => {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  //Saves the user into the database with the hashed passwprd
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2)
     RETURNING id,email`, //Returns all the columns of the saved user
    [ email, password_hash]
  );

  return rows[0];
};