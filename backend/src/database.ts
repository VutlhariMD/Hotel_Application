import   {Pool} from 'pg'
import dotenv from 'dotenv'

//load the environment variables
dotenv.config()

//
const  pool = new Pool(
    {
        user: process.env.DB_USER,
        host:process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.PASSWORD,
        port : parseInt(process.env.PORT || '5432'),
    });
    //Allow us to run queries from anywhere in the application
    //txt is the sql 
    //An array of values that will be inserted in the query
export const query=(text: string, param?: any[])=>pool.query(text,param)    
//2 Check if the database connection is achieved

// export const testDbConnection = async () =>{
//     try{ 
//         const client = await pool.connect()
//         console.log('Database connection successful');
//         client.release()

//     }catch(error){
//          console.error("Unable to connect to the database: ", error);
//          process.exit(1);
//     }
// }