import { NextResponse } from 'next/server';

// // // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/login';

  const response = NextResponse.redirect(url);
  response.cookies.delete('session-token');
  return response;
}
