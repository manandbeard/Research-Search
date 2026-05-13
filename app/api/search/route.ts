import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query, year, venue, author, tags } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Build the query string
    let searchQuery = query;
    if (author) searchQuery += ` ${author}`;
    if (tags) searchQuery += ` ${tags}`;

    // 1. Fetch papers from Semantic Scholar
    let searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=10&fields=title,authors,year,abstract,url,citationCount,isOpenAccess,openAccessPdf,venue,journal`;
    
    if (year) {
       searchUrl += `&year=${encodeURIComponent(year)}`;
    }
    if (venue) {
       searchUrl += `&venue=${encodeURIComponent(venue)}`;
    }

    const response = await fetch(searchUrl, {
        headers: {
            // Include a user agent politely if possible
            'User-Agent': 'Research Search Engine (AI-Studio Sandbox)'
        }
    });

    if (!response.ok) {
        throw new Error(`Semantic Scholar API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const papers = data.data || [];

    return NextResponse.json({ papers });

  } catch (error: any) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
