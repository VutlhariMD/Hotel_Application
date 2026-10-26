import { Pool } from "pg";
import dotenv from  "dotenv"
 
dotenv.config()
//export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
/*
PORT = 3000
DATABASE_URL=postgresql://postgres:Learner0123@localhost:5433/hotel_app
*/

const pool= new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database : process.env.DB_DATABASE,
        password : process.env.DB_PASSWORD,
        port : 5433,
})

export const query = (text : string,params?: any[])=> pool.query(text,params)
export const testDbConnection = async () =>{
    try{ 
        const client = await pool.connect()
         console.log('Database connection successful');
         client.release()

    }catch(error){
         console.error("Unable to connect to the database: ", error);
         process.exit(1);
    }
}