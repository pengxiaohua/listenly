import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('userId', '', {
    httpOnly: true,
    expires: new Date(0)
  })

  return response
}
