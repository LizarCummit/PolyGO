import { NextResponse } from 'next/server';

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to the backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Log the response status and headers for debugging
    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    // Try to parse the response as JSON
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
        console.log('Backend response data:', data);
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
        const textContent = await response.text();
        console.error('Raw response content:', textContent);
        return NextResponse.json(
          { message: 'Server returned invalid JSON response' },
          { status: 500 }
        );
      }
    } else {
      // Log the actual response for debugging
      const textContent = await response.text();
      console.error('Non-JSON response from backend:', textContent);
      console.error('Content-Type received:', contentType);
      return NextResponse.json(
        { message: 'Server returned non-JSON response' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Server error occurred' },
        { status: response.status }
      );
    }

    // Return the response with the same status code
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 