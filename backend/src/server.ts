import express  from 'express'
import dotenv from 'dotenv'
import {testDbConnection} from '../src/config/database'

dotenv.config()
const app = express()
const PORT = parseInt(process.env.DB_PORT || '5433')



const startServer = async () => {
await testDbConnection()
    
app.use(express.json())


app.listen(PORT, ()=> { console.log("Server is running on http://localhost:${PORT}")})
};
startServer()