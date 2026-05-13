function formatAuthorsAPA(authors: { name: string }[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length === 1) return `${authors[0].name}.`;
  if (authors.length === 2) return `${authors[0].name}, & ${authors[1].name}.`;
  if (authors.length <= 20) {
    const initial = authors.slice(0, authors.length - 1).map(a => a.name).join(', ');
    return `${initial}, & ${authors[authors.length - 1].name}.`;
  }
  const initial = authors.slice(0, 19).map(a => a.name).join(', ');
  return `${initial}, ... ${authors[authors.length - 1].name}.`;
}

function formatAuthorsMLA(authors: { name: string }[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length === 1) return `${authors[0].name}.`;
  if (authors.length === 2) return `${authors[0].name}, and ${authors[1].name}.`;
  return `${authors[0].name}, et al.`;
}

function formatAuthorsChicago(authors: { name: string }[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length === 1) return `${authors[0].name}.`;
  if (authors.length <= 10) return authors.map(a => a.name).join(', ') + '.';
  return `${authors[0].name}, et al.`;
}

export function generateCitation(paper: any, format: 'APA' | 'MLA' | 'Chicago') {
  const authors = paper.authors || [];
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal?.name || paper.venue || 'Unknown Journal';
  const volume = paper.journal?.volume ? `${paper.journal.volume}` : '';
  const pages = paper.journal?.pages ? `${paper.journal.pages}` : '';

  switch (format) {
    case 'APA':
      return `${formatAuthorsAPA(authors)} (${year}). ${title}. ${journal}${volume ? `, ${volume}` : ''}${pages ? `, ${pages}` : ''}.`;
    case 'MLA':
      return `${formatAuthorsMLA(authors)} "${title}." ${journal}${volume ? `, vol. ${volume}` : ''}, ${year}${pages ? `, pp. ${pages}` : ''}.`;
    case 'Chicago':
      return `${formatAuthorsChicago(authors)} "${title}." ${journal} ${volume} (${year})${pages ? `: ${pages}` : ''}.`;
  }
}
