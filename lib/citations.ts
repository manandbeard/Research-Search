export function generateCitation(paper: any, format: 'APA' | 'MLA' | 'Chicago') {
  const authors = paper.authors || [];
  const year = paper.year || 'n.d.';
  const title = paper.title || 'Untitled';
  const journal = paper.journal?.name || paper.venue || 'Unknown Journal';
  const volume = paper.journal?.volume ? `${paper.journal.volume}` : '';
  const pages = paper.journal?.pages ? `${paper.journal.pages}` : '';

  let citation = '';

  const formatAuthorsAPA = (authors: any[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return `${authors[0].name}.`;
    if (authors.length === 2) return `${authors[0].name}, & ${authors[1].name}.`;
    if (authors.length > 2 && authors.length <= 20) {
       const initialAuthors = authors.slice(0, authors.length - 1).map(a => a.name).join(', ');
       return `${initialAuthors}, & ${authors[authors.length - 1].name}.`;
    }
    if (authors.length > 20) {
       const initialAuthors = authors.slice(0, 19).map(a => a.name).join(', ');
       return `${initialAuthors}, ... ${authors[authors.length - 1].name}.`;
    }
    return '';
  };

  const formatAuthorsMLA = (authors: any[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return `${authors[0].name}.`;
    if (authors.length === 2) return `${authors[0].name}, and ${authors[1].name}.`;
    return `${authors[0].name}, et al.`;
  };

  const formatAuthorsChicago = (authors: any[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return `${authors[0].name}.`;
    if (authors.length > 1 && authors.length <= 10) {
      return authors.map(a => a.name).join(', ') + '.';
    }
    return `${authors[0].name}, et al.`;
  };

  switch (format) {
    case 'APA':
      citation = `${formatAuthorsAPA(authors)} (${year}). ${title}. ${journal}${volume ? `, ${volume}` : ''}${pages ? `, ${pages}` : ''}.`;
      break;
    case 'MLA':
      citation = `${formatAuthorsMLA(authors)} "${title}." ${journal}${volume ? `, vol. ${volume}` : ''}, ${year}${pages ? `, pp. ${pages}` : ''}.`;
      break;
    case 'Chicago':
      citation = `${formatAuthorsChicago(authors)} "${title}." ${journal} ${volume} (${year})${pages ? `: ${pages}` : ''}.`;
      break;
  }

  return citation;
}
