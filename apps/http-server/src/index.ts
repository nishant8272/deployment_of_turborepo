
import express from "express";
import prisma from "@repo/db/client";

const app = express();
app.use(express.json());

app.get("/",async (req,res)=>{
   const user = await prisma.user.create({
        data:{
            name:Math.random().toString(),
            email:Math.random().toString()
        }
    })
    
    res.json({
        msg :"hii from server to nishant.",
        user :user 
    })
})

app.get("/user",async (req,res)=>{
    const user = await prisma.user.findFirst({
        where:{
            email:"john@doe.com"
        }
    })
    res.send(user)
})

app.post("/user",async (req,res)=>{
    const user = await prisma.user.create({
        data:{
            name:req.body.name,
            email:req.body.email
        }
    })
    res.json({
    Message :"User created successfully",
    user
})
})

app.listen(3002,()=>{
    console.log("server started")
})
