import { KeyPoint } from '../types/lecture';

// All AI calls go through our own backend, so no AI provider key ever reaches the browser.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function postJson<T>(path: string, body: unknown, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

export class KeyPointsService {
  static async extractKeyPoints(transcription: string): Promise<KeyPoint[]> {
    try {
      const { keyPoints } = await postJson<{ keyPoints: KeyPoint[] }>(
        '/ai/key-points',
        { transcription },
        'Failed to extract key points'
      );

      // Add timestamps based on word position in transcript
      return keyPoints.map(point => ({
        ...point,
        timestamp: this.findTimestampForKeyPoint(transcription, point.text)
      }));
    } catch (error) {
      console.error('Error extracting key points:', error);
      throw error;
    }
  }

  static async generateSummary(keyPoints: KeyPoint[]): Promise<string> {
    try {
      const { summary } = await postJson<{ summary: string }>(
        '/ai/summary',
        { keyPoints },
        'Failed to generate summary'
      );
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  private static findTimestampForKeyPoint(transcription: string, keyPoint: string): number {
    // Simple estimate: find where the key point starts in the transcript and assume ~2.5 words per second
    const words = transcription.split(' ');
    const keyPointWords = keyPoint.split(' ');
    const firstWord = keyPointWords[0]?.toLowerCase();
    if (!firstWord) return 0;

    const firstWordIndex = words.findIndex(word => word.toLowerCase().includes(firstWord));
    if (firstWordIndex === -1) {
      return 0; // Default to the beginning if not found
    }

    const averageWordsPerSecond = 2.5;
    return Math.floor(firstWordIndex / averageWordsPerSecond);
  }

  static async analyzeKeyPointsRelations(keyPoints: KeyPoint[]): Promise<{
    topics: string[];
    relationships: Array<{ from: number; to: number; type: string }>;
  }> {
    try {
      return await postJson(
        '/ai/relations',
        { keyPoints },
        'Failed to analyze key points relations'
      );
    } catch (error) {
      console.error('Error analyzing key points relations:', error);
      throw error;
    }
  }
}
