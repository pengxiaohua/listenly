import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const userId = cookies().get('userId')?.value
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  return NextResponse.json({ success: true })
} 