import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
      },
    })
  }

  const res = NextResponse.json({ success: true })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  res.headers.set('Surrogate-Control', 'no-store')
  return res
}
