'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, BookOpen, User as UserIcon, Calendar, ExternalLink, Loader2, ArrowRight, LogIn, Save, History, LogOut, Filter, Quote, Copy, Check, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/components/auth-provider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { generateCitation } from '@/lib/citations';
import { GoogleGenAI } from '@google/genai';

import { CitationView } from '@/components/citation-view';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

interface Paper {
  paperId: string;
  title: string;
  authors: { name: string }[];
  year: number;
  abstract: string;
  url: string;
  citationCount: number;
  isOpenAccess: boolean;
  openAccessPdf?: { url: string; status: string };
}

interface SearchResponse {
  synthesis: string;
  papers: Paper[];
}

export default function SearchView() {
  const { user, signInIdp, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          year: yearFilter,
          venue: venueFilter,
          author: authorFilter,
          tags: tagsFilter
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch research. Please try again.');
      }

      const json = await res.json();
      const papers = json.papers || [];

      // Initially set papers with empty synthesis
      setResults({ synthesis: "", papers });
      
      const papersWithAbstracts = papers.filter((p: any) => p.abstract);

      if (papersWithAbstracts.length > 0) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
          if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
              throw new Error("Missing Gemini API Key. Please configure GEMINI_API_KEY in the Secrets menu.");
          }

          const contextLines = papersWithAbstracts.slice(0, 10).map((p: any, index: number) => {
            return `[Source ${index + 1}] Title: ${p.title}\nAuthors: ${p.authors?.map((a:any) => a.name).join(', ')}\nYear: ${p.year}\nAbstract: ${p.abstract}\n`;
          }).join('\n');

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

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              temperature: 0.2
            }
          });

          const synthesis = response.text || "I was unable to summarize the results.";

          setResults({ synthesis, papers });

          if (user && synthesis) {
            setDoc(doc(collection(db, 'users', user.uid, 'history')), {
              query,
              synthesis,
              createdAt: serverTimestamp()
            }).catch(e => console.error("History save failed", e));
          }
        } catch (genErr: any) {
          console.error("Synthesis failed", genErr);
          setResults({ 
            synthesis: `I found ${papers.length} papers, but I couldn't generate a summary: ${genErr.message}`, 
            papers 
          });
        }
      } else {
        setResults({ 
          synthesis: "I found some papers, but none had abstracts detailed enough to summarize.", 
          papers 
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-neutral-900 font-sans selection:bg-[#5A5A40] selection:text-white pb-24">
      {/* Navigation / Header */}
      <AnimatePresence>
        {hasSearched && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 bg-[#F5F5F0]/80 backdrop-blur-md border-b border-black/10 py-4 px-6 md:px-12 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                setHasSearched(false);
                setQuery('');
                setResults(null);
            }}>
              <BookOpen className="w-6 h-6 text-[#5A5A40]" />
              <span className="font-bold text-xl tracking-tight font-serif text-[#5A5A40]">Sooth.fy Replica</span>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-2xl mx-8 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a research question..."
                className="w-full bg-white border border-neutral-200 rounded-full py-2.5 pl-5 pr-20 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 rounded-full transition-colors ${showFilters ? 'bg-neutral-100 text-[#5A5A40]' : 'text-neutral-400 hover:bg-neutral-50'}`}
                  title="Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSearch}
                  className="p-1.5 bg-[#5A5A40] text-white rounded-full hover:bg-[#4a4a35] transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Header Floating Filters Panel */}
              <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-12 left-0 w-full bg-white border border-black/10 shadow-xl rounded-xl p-4 z-50 grid grid-cols-2 gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500 uppercase">Year</label>
                        <input type="text" placeholder="e.g. 2020-2023" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} onKeyDown={handleKeyDown} className="text-sm bg-neutral-50 border border-neutral-200 rounded-md px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500 uppercase">Author</label>
                        <input type="text" placeholder="e.g. Andrew Ng" value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} onKeyDown={handleKeyDown} className="text-sm bg-neutral-50 border border-neutral-200 rounded-md px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500 uppercase">Venue</label>
                        <input type="text" placeholder="e.g. Nature" value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} onKeyDown={handleKeyDown} className="text-sm bg-neutral-50 border border-neutral-200 rounded-md px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500 uppercase">Tags</label>
                        <input type="text" placeholder="e.g. deep learning" value={tagsFilter} onChange={(e) => setTagsFilter(e.target.value)} onKeyDown={handleKeyDown} className="text-sm bg-neutral-50 border border-neutral-200 rounded-md px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30" />
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                 <div className="flex items-center gap-3">
                   <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600 font-medium bg-neutral-200/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-neutral-200 transition-colors">
                      <History className="w-4 h-4" />
                      <span>History</span>
                   </div>
                   <button onClick={signOut} className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                     Sign out
                   </button>
                 </div>
              ) : (
                <button
                  onClick={signInIdp}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-full hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main className={`max-w-5xl mx-auto px-6 md:px-12 transition-all duration-700 ease-in-out ${hasSearched ? 'pt-12' : 'pt-[30vh]'}`}>
        
        {/* Initial Hero Search State */}
        <AnimatePresence mode="wait">
          {!hasSearched && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center mt-8 relative"
            >
              {/* Login Button in top right of hero state */}
              <div className="absolute -top-24 right-0 flex items-center gap-3">
                 {user ? (
                   <>
                     <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600 font-medium bg-neutral-200/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-neutral-200 transition-colors border border-black/5">
                        <History className="w-4 h-4" />
                        <span>History</span>
                     </div>
                     <button onClick={signOut} className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">Sign out</button>
                   </>
                 ) : (
                   <button onClick={signInIdp} className="flex items-center gap-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-full hover:bg-neutral-50 transition-colors shadow-sm">
                     <LogIn className="w-4 h-4" /> Sign In
                   </button>
                 )}
              </div>

              <div className="flex items-center gap-3 mb-6">
                 <BookOpen className="w-10 h-10 text-[#5A5A40]" />
                 <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#5A5A40]">Sooth.fy Replica</h1>
              </div>
              <p className="text-neutral-500 mb-10 text-lg max-w-lg">
                Search millions of academic papers, synthesize findings, 
                and accelerate your research.
              </p>

              <div className="w-full max-w-2xl relative shadow-xl rounded-2xl bg-white flex flex-col p-2 focus-within:ring-2 focus-within:ring-[#5A5A40]/30 transition-all border border-black/5">
                <div className="flex items-center w-full">
                  <Search className="w-6 h-6 text-neutral-400 ml-4 mr-2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Which intervention is most effective for adolescent depression?"
                    className="flex-1 bg-transparent border-none py-4 text-lg focus:outline-none text-neutral-800 placeholder:text-neutral-400"
                  />
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-xl mr-2 transition-colors ${showFilters ? 'bg-neutral-100 text-[#5A5A40]' : 'text-neutral-400 hover:bg-neutral-50'}`}
                    title="Filters"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={!query.trim()}
                    className="bg-[#5A5A40] hover:bg-[#4a4a35] disabled:opacity-50 disabled:hover:bg-[#5A5A40] text-white px-6 py-4 rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Research</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Filters Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-black/5 mt-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase">Year</label>
                          <input 
                            type="text"
                            placeholder="e.g. 2020-2023"
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase">Author</label>
                          <input 
                            type="text"
                            placeholder="e.g. Andrew Ng"
                            value={authorFilter}
                            onChange={(e) => setAuthorFilter(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase">Venue/Journal</label>
                          <input 
                            type="text"
                            placeholder="e.g. Nature"
                            value={venueFilter}
                            onChange={(e) => setVenueFilter(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase">Tags/Keywords</label>
                          <input 
                            type="text"
                            placeholder="e.g. deep learning"
                            value={tagsFilter}
                            onChange={(e) => setTagsFilter(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/30"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 mt-8 flex-wrap justify-center">
                 <button onClick={() => setQuery('Impact of microplastics on human health')} className="text-sm bg-neutral-200/50 hover:bg-neutral-200 px-4 py-2 rounded-full text-neutral-600 transition-colors">Impact of microplastics on human health</button>
                 <button onClick={() => setQuery('Does sleep quality affect academic performance?')} className="text-sm bg-neutral-200/50 hover:bg-neutral-200 px-4 py-2 rounded-full text-neutral-600 transition-colors">Does sleep quality affect academic...</button>
              </div>
            </motion.div>
          )}

          {/* Results State */}
          {hasSearched && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              {/* Mobile Search Bar (Only visible on small screens when searched) */}
              <div className="md:hidden flex mb-8 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a research question..."
                  className="w-full bg-white border border-neutral-200 rounded-full py-3 pl-5 pr-12 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30"
                />
                <button 
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#5A5A40] text-white rounded-full"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-[#5A5A40] animate-spin" />
                    <Sparkles className="w-4 h-4 text-orange-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="text-center">
                     <h3 className="text-lg font-serif font-medium text-[#5A5A40]">Scanning literature...</h3>
                     <p className="text-neutral-500 text-sm mt-1">Reading abstracts and synthesizing findings.</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
                  <p>{error}</p>
                  <button onClick={handleSearch} className="mt-4 px-4 py-2 bg-red-100 rounded-full text-sm font-medium hover:bg-red-200 transition-colors">Try again</button>
                </div>
              ) : results ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Left Column: AI Synthesis */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5">
                      <div className="flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        <h2 className="font-serif text-2xl font-medium text-neutral-800">Research Synthesis</h2>
                      </div>
                      <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-medium prose-a:text-[#5A5A40] prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {results.synthesis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Source Papers */}
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-serif text-lg font-medium text-neutral-800 px-2 flex items-center gap-2">
                       <BookOpen className="w-4 h-4 text-neutral-400" />
                       Analyzed Sources ({results.papers?.length || 0})
                    </h3>
                    <div className="flex flex-col gap-4">
                      {results.papers?.map((paper, index) => (
                        <div 
                          key={paper.paperId} 
                          onClick={() => window.open(paper.url, '_blank')}
                          className="block bg-white p-5 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow group relative overflow-visible cursor-pointer"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-[#5A5A40]/20 group-hover:bg-[#5A5A40] transition-colors rounded-l-2xl" />
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="inline-flex items-center justify-center bg-[#5A5A40]/10 text-[#5A5A40] font-mono text-xs font-bold w-6 h-6 rounded-full shrink-0">
                                {index + 1}
                            </span>
                            <a 
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-neutral-900 line-clamp-2 text-sm flex-1 group-hover:text-[#5A5A40] transition-colors"
                            >
                              {paper.title}
                            </a>
                          </div>
                          
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 mt-3 pl-8">
                            {paper.authors?.length > 0 && (
                              <span className="flex items-center gap-1 max-w-full truncate">
                                <UserIcon className="w-3 h-3" />
                                <span className="truncate">{paper.authors.map(a => a.name).join(', ')}</span>
                              </span>
                            )}
                            {paper.year && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {paper.year}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-4 pl-8 flex items-center justify-between relative z-10 w-full overflow-visible">
                            <div className="flex flex-wrap items-center gap-2">
                              {paper.isOpenAccess && paper.openAccessPdf?.url && (
                                <span className="text-[10px] uppercase tracking-wider font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">
                                  PDF Available
                                </span>
                              )}
                              <span className="text-[10px] uppercase tracking-wider font-semibold bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                {paper.citationCount || 0} Citations
                              </span>
                              <CitationView paper={paper} />
                            </div>
                            <div className="flex items-center gap-2">
                               {user && (
                                  <button onClick={async (e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     try {
                                        const encodedId = encodeURIComponent(paper.paperId);
                                        const saveRef = doc(db, 'users', user.uid, 'saved_papers', encodedId);
                                        await setDoc(saveRef, {
                                           paperId: paper.paperId,
                                           title: paper.title || 'Untitled',
                                           authors: paper.authors?.map((a: any) => a.name) || [],
                                           year: paper.year || 0,
                                           abstract: paper.abstract || '',
                                           url: paper.url || '',
                                           createdAt: serverTimestamp()
                                        });
                                        alert('Saved!');
                                     } catch(err: any) {
                                        console.error("Failed to save paper", err);
                                        alert('Error saving paper: ' + err.message);
                                     }
                                  }} className="p-1.5 rounded bg-neutral-100 hover:bg-[#5A5A40] text-neutral-400 hover:text-white transition-colors">
                                     <Save className="w-3.5 h-3.5" />
                                  </button>
                               )}
                               <ExternalLink className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!results.papers || results.papers.length === 0) && (
                        <div className="text-center p-6 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-500 text-sm">
                           No academic sources could be found for this query.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
