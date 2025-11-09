import React from 'react'
import prisma from '@repo/db/client';

export default  async function home() {
  const users  = await prisma.user.findFirst()
  return (
    <div>
      {users?.name}
      <h2>
        Welcome to Next.js!
      </h2>
      {users?.email}
    </div>
  )
}

