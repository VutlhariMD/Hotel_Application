import {query}  from "../config/database"
import bcryt from "bcryptjs"
import {type user} from "../types/types"

//Find user by email
export const findUserByEmail = async (email: string):Promise<user | null> =>{

    const {rows}=await query("SELECT *FROM users WERE email =$1",[email]);
    return rows[0] || null ;
}