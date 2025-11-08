import { WebSocketServer } from "ws";
import prisma from "@repo/db";
const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", async(ws) => {
   await prisma.user.create({
        data:{
            name:Math.random().toString(),
            email:Math.random().toString()
        }
    })
    ws.send("Hello! Message From Server!!");

});