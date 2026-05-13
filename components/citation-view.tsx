'use client';

import { useState } from 'react';
import { Quote, Copy, Check, ChevronDown } from 'lucide-react';
import { generateCitation } from '@/lib/citations';

interface CitationViewProps {
  paper: any;
}

export function CitationView({ paper }: CitationViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, format: 'APA' | 'MLA' | 'Chicago') => {
    e.preventDefault();
    e.stopPropagation();
    const citation = generateCitation(paper, format);
    navigator.clipboard.writeText(citation);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="relative mt-2">
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-[10px] uppercase tracking-wider font-semibold bg-neutral-100/80 hover:bg-neutral-200 text-neutral-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
      >
        <Quote className="w-3 h-3" />
        Cite
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute z-50 right-0 mt-1 w-64 bg-white border border-black/10 shadow-lg rounded-xl p-3 flex flex-col gap-3"
        >
          {(['APA', 'MLA', 'Chicago'] as const).map(format => {
            const citationInfo = generateCitation(paper, format);
            return (
              <div key={format} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">{format}</span>
                  <button 
                    onClick={(e) => handleCopy(e, format)}
                    className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition-colors"
                    title={`Copy ${format} citation`}
                  >
                    {copiedFormat === format ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 leading-tight bg-neutral-50 p-2 rounded line-clamp-3">
                  {citationInfo}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
