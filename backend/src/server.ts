import express  from 'express'
import dotenv from 'dotenv'
//import { testDbConnection } from './database';



dotenv.config()


const app= express()
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// Test the connection with explicit parameter types
pool.connect((err: Error, client: PoolClient, release: (release?: any) => void) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database!');
  release();
});


const PORT =process.env.PORT || 5000;



const startServer = async ()=>{

app.use(express.json())
//testDbConnection()
app.listen(PORT, ()=> {console.log(`Server is running on http:localhost:${PORT}`)})
}
startServer()