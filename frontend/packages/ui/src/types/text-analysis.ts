export interface TextAnalysisResult {
  id: string;
  timestamp: string;
  analysis: {
    wordCount: number;
    charCount: number;
    mostFrequentWord: string | null;
    sentimentScore: number;
  };
}
