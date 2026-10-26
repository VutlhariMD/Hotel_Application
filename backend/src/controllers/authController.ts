import {Request, Response} from "express"
import * as userService from '../services.ts/userServices'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { user } from "../types/types";

export const register = async (req: Request,res: Response) => {
    const {email,password} = req.body
    if(!email || !password){
        return res.status(400).json({message: "Enail and password are required"})

    }
    try{
        const existingUser= await userService.findUserByEmail(email)
        if(existingUser){
            return res.status(400).json({message: " Email is already in use"})
        }
        const user= await userService.createUser(email,password);
    res.status(201).json({message : " User registered successfully", userId: user.id})
    }catch(error){
     res.status(500).json({message: "Error registering the user"})
    }

};

export const login =async (req: Request, res: Response)=>{
    const {email,password} = req.body;
     if(!email || !password){
        return res.status(400).json({message: "Enail and password are required"});
    }
    try{
        const user= await userService.findUserByEmail(email)
        if(!user){
            return res.status(400).json({message : "Invalid credentials"})
        }
        const isMatch = await bcrypt.compare(password,user.password_hash)
        if (!isMatch){
            return res.status(400).json({message: " Invlaid password"})
        }
        const payload = {userId: user.id, email: user.email}
        const token =jwt.sign(payload,process.env.JWT_SECRET!,{expiresIn: '1h'})

    }catch(error){

    }
}