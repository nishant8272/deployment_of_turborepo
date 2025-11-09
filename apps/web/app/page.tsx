import React from 'react'
import prisma from '@repo/db'

export default  async function home() {
  const users  = await prisma.user.findFirst()
  return (
    <div>
      <h1> this the next app </h1>
      <br></br>
      <h2>name :</h2>
      {users?.name}
      <h2>
        Welcome to Next.js!
      </h2>
      <br> </br>
      <h1>
      email :</h1>
      {users?.email}
    </div>
  )
}
