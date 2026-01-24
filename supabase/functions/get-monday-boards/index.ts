import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONDAY_API_KEY = Deno.env.get('MONDAY_API_KEY');
    
    if (!MONDAY_API_KEY) {
      console.error('MONDAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Monday.com API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query to get boards with their groups
    const query = `
      query {
        boards(limit: 50) {
          id
          name
          groups {
            id
            title
          }
        }
      }
    `;

    console.log('Fetching Monday.com boards...');

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_KEY,
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Monday.com API errors:', data.errors);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch boards', details: data.errors }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${data.data?.boards?.length || 0} boards`);

    return new Response(
      JSON.stringify({ boards: data.data?.boards || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-monday-boards function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
