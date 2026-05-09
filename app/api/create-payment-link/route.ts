import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// 1. Move the SDK client initialization INSIDE the function
export async function POST(req: Request) {
  try {
    // Check for the key here to prevent the 'authenticator' error
    const apiKey = process.env.PAYMENT_PROVIDER_API_KEY; 
    
    if (!apiKey) {
      console.error("Missing API Key in environment variables");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500 });
    }

    // 2. Initialize the client only when the request hits
    // Replace 'YourSDK' with whatever library you are using (Stripe, Square, etc.)
    const client = new YourSDK({
      apiKey: apiKey
    });

    const body = await req.json();
    // ... your logic to create the payment link ...

    return new Response(JSON.stringify({ url: "..." }), { status: 200 });
    
  } catch (error) {
    console.error("Payment Link Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create link" }), { status: 500 });
  }
}