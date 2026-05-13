import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return NextResponse.json(
      { error: 'Missing Gemini API Key. Please configure GEMINI_API_KEY in the Secrets menu.' },
      { status: 500 }
    );
  }

  try {
    const { query, papers } = await req.json();

    if (!query || !Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json({ error: 'query and papers are required' }, { status: 400 });
    }

    const papersWithAbstracts = papers.filter((p: { abstract?: string }) => p.abstract);
    if (papersWithAbstracts.length === 0) {
      return NextResponse.json({
        synthesis: 'I found some papers, but none had abstracts detailed enough to summarize.',
      });
    }

    const contextLines = papersWithAbstracts
      .slice(0, 10)
      .map(
        (p: { title: string; authors?: { name: string }[]; year?: number; abstract: string }, index: number) =>
          `[Source ${index + 1}] Title: ${p.title}\nAuthors: ${p.authors?.map((a) => a.name).join(', ')}\nYear: ${p.year}\nAbstract: ${p.abstract}\n`
      )
      .join('\n');

    const prompt = `You are an expert academic research assistant.
A student has asked: "${query}"

Based ONLY on the provided research papers below, write a clear synthesis that answers the student's question.

Guidelines:
- Start with a direct answer.
- USE citations like [1], [2] at the end of sentences.
- Use markdown for structure.
- If the papers don't answer it, say so.

Context:
${contextLines}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.2 },
    });

    const synthesis = response.text || 'I was unable to summarize the results.';
    return NextResponse.json({ synthesis });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error in synthesize API:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
