import { useEffect } from 'react';

/**
 * A custom hook to set the document title
 * @param {string} title - The title to set for the document
 */
export const useDocumentTitle = (title) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    
    // Cleanup function to reset the title when component unmounts
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}; 