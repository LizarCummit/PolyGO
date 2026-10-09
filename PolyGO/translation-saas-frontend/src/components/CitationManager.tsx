import { useState } from 'react';

interface Citation {
  type: string;
  text: string;
  url: string;
  authors?: string;
  year?: string;
  title?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
}

type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'vancouver';

interface Props {
  citations: Citation[];
  onUpdate: (citations: Citation[]) => void;
}

export default function CitationManager({ citations, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCitations, setEditedCitations] = useState<Citation[]>(citations);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa');

  const handleAddCitation = () => {
    setEditedCitations([
      ...editedCitations,
      { type: 'article', text: '', url: '' }
    ]);
  };

  const handleRemoveCitation = (index: number) => {
    setEditedCitations(editedCitations.filter((_, i) => i !== index));
  };

  const handleUpdateCitation = (index: number, field: keyof Citation, value: string) => {
    const updated = [...editedCitations];
    updated[index] = { ...updated[index], [field]: value };
    setEditedCitations(updated);
  };

  const handleSave = () => {
    onUpdate(editedCitations);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCitations(citations);
    setIsEditing(false);
  };

  const formatCitation = (citation: Citation) => {
    switch (citationStyle) {
      case 'apa':
        return formatAPACitation(citation);
      case 'mla':
        return formatMLACitation(citation);
      case 'chicago':
        return formatChicagoCitation(citation);
      case 'harvard':
        return formatHarvardCitation(citation);
      case 'ieee':
        return formatIEEECitation(citation);
      case 'vancouver':
        return formatVancouverCitation(citation);
      default:
        return citation.text;
    }
  };

  const formatAPACitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `${citation.authors || 'Author(s)'}. (${citation.year || 'n.d.'}). ${citation.title || citation.text}. ${citation.journal ? `${citation.journal}, ` : ''}${citation.volume ? `${citation.volume}${citation.issue ? `(${citation.issue})` : ''}, ` : ''}${citation.pages ? `${citation.pages}. ` : ''}${citation.url ? `Retrieved from ${citation.url}` : ''}`;
      case 'book':
        return `${citation.authors || 'Author(s)'}. (${citation.year || 'n.d.'}). ${citation.title || citation.text}. ${citation.publisher ? `${citation.publisher}. ` : ''}${citation.url ? `Retrieved from ${citation.url}` : ''}`;
      case 'website':
        return `${citation.authors || 'Author(s)'}. (${citation.year || 'n.d.'}). ${citation.title || citation.text}. ${citation.url ? `Retrieved from ${citation.url}` : ''}`;
      default:
        return citation.text;
    }
  };

  const formatMLACitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `${citation.authors || 'Author(s)'}. "${citation.title || citation.text}." ${citation.journal ? `${citation.journal}, ` : ''}${citation.volume ? `vol. ${citation.volume}${citation.issue ? `, no. ${citation.issue}` : ''}, ` : ''}${citation.year ? `${citation.year}, ` : ''}${citation.pages ? `pp. ${citation.pages}. ` : ''}${citation.url ? `Web. ${new Date().toLocaleDateString()}. <${citation.url}>` : ''}`;
      case 'book':
        return `${citation.authors || 'Author(s)'}. ${citation.title || citation.text}. ${citation.publisher ? `${citation.publisher}, ` : ''}${citation.year ? `${citation.year}. ` : ''}${citation.url ? `Web. ${new Date().toLocaleDateString()}. <${citation.url}>` : ''}`;
      case 'website':
        return `${citation.authors || 'Author(s)'}. "${citation.title || citation.text}." ${citation.url ? `Web. ${new Date().toLocaleDateString()}. <${citation.url}>` : ''}`;
      default:
        return citation.text;
    }
  };

  const formatChicagoCitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `${citation.authors || 'Author(s)'}. "${citation.title || citation.text}." ${citation.journal ? `${citation.journal} ` : ''}${citation.volume ? `${citation.volume}${citation.issue ? `, no. ${citation.issue}` : ''} ` : ''}${citation.year ? `(${citation.year})` : ''}${citation.pages ? `: ${citation.pages}. ` : ''}${citation.url ? `Accessed ${new Date().toLocaleDateString()}. ${citation.url}` : ''}`;
      case 'book':
        return `${citation.authors || 'Author(s)'}. ${citation.title || citation.text}. ${citation.publisher ? `${citation.publisher}, ` : ''}${citation.year ? `${citation.year}. ` : ''}${citation.url ? `Accessed ${new Date().toLocaleDateString()}. ${citation.url}` : ''}`;
      case 'website':
        return `${citation.authors || 'Author(s)'}. "${citation.title || citation.text}." ${citation.url ? `Accessed ${new Date().toLocaleDateString()}. ${citation.url}` : ''}`;
      default:
        return citation.text;
    }
  };

  const formatHarvardCitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `${citation.authors || 'Author(s)'} (${citation.year || 'n.d.'}) '${citation.title || citation.text}', ${citation.journal ? `${citation.journal}, ` : ''}${citation.volume ? `vol. ${citation.volume}${citation.issue ? `(${citation.issue})` : ''}, ` : ''}${citation.pages ? `pp. ${citation.pages}. ` : ''}${citation.url ? `Available at: ${citation.url} (Accessed: ${new Date().toLocaleDateString()})` : ''}`;
      case 'book':
        return `${citation.authors || 'Author(s)'} (${citation.year || 'n.d.'}) ${citation.title || citation.text}, ${citation.publisher ? `${citation.publisher}. ` : ''}${citation.url ? `Available at: ${citation.url} (Accessed: ${new Date().toLocaleDateString()})` : ''}`;
      case 'website':
        return `${citation.authors || 'Author(s)'} (${citation.year || 'n.d.'}) '${citation.title || citation.text}', ${citation.url ? `Available at: ${citation.url} (Accessed: ${new Date().toLocaleDateString()})` : ''}`;
      default:
        return citation.text;
    }
  };

  const formatIEEECitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `[${citation.year || 'n.d.'}] ${citation.authors || 'Author(s)'}, "${citation.title || citation.text}," ${citation.journal ? `${citation.journal}, ` : ''}${citation.volume ? `vol. ${citation.volume}${citation.issue ? `, no. ${citation.issue}` : ''}, ` : ''}${citation.pages ? `pp. ${citation.pages}, ` : ''}${citation.url ? `[Online]. Available: ${citation.url}` : ''}`;
      case 'book':
        return `[${citation.year || 'n.d.'}] ${citation.authors || 'Author(s)'}, ${citation.title || citation.text}, ${citation.publisher ? `${citation.publisher}, ` : ''}${citation.url ? `[Online]. Available: ${citation.url}` : ''}`;
      case 'website':
        return `[${citation.year || 'n.d.'}] ${citation.authors || 'Author(s)'}, "${citation.title || citation.text}," ${citation.url ? `[Online]. Available: ${citation.url}` : ''}`;
      default:
        return citation.text;
    }
  };

  const formatVancouverCitation = (citation: Citation) => {
    switch (citation.type) {
      case 'article':
        return `${citation.authors || 'Author(s)'}. ${citation.title || citation.text}. ${citation.journal ? `${citation.journal}. ` : ''}${citation.year ? `${citation.year}; ` : ''}${citation.volume ? `${citation.volume}${citation.issue ? `(${citation.issue})` : ''}: ` : ''}${citation.pages ? `${citation.pages}. ` : ''}${citation.url ? `[cited ${new Date().toLocaleDateString()}]; Available from: ${citation.url}` : ''}`;
      case 'book':
        return `${citation.authors || 'Author(s)'}. ${citation.title || citation.text}. ${citation.publisher ? `${citation.publisher}; ` : ''}${citation.year ? `${citation.year}. ` : ''}${citation.url ? `[cited ${new Date().toLocaleDateString()}]; Available from: ${citation.url}` : ''}`;
      case 'website':
        return `${citation.authors || 'Author(s)'}. ${citation.title || citation.text}. ${citation.url ? `[cited ${new Date().toLocaleDateString()}]; Available from: ${citation.url}` : ''}`;
      default:
        return citation.text;
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h4 className="text-sm font-medium text-gray-500">Citations</h4>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="apa">APA</option>
              <option value="mla">MLA</option>
              <option value="chicago">Chicago</option>
              <option value="harvard">Harvard</option>
              <option value="ieee">IEEE</option>
              <option value="vancouver">Vancouver</option>
            </select>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit Citations
          </button>
        </div>
        <ul className="space-y-2">
          {citations.map((citation, index) => (
            <li key={index} className="text-sm text-gray-600">
              {formatCitation(citation)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-500">Edit Citations</h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {editedCitations.map((citation, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <select
                value={citation.type}
                onChange={(e) => handleUpdateCitation(index, 'type', e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="article">Article</option>
                <option value="book">Book</option>
                <option value="website">Website</option>
              </select>
              <button
                onClick={() => handleRemoveCitation(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={citation.authors || ''}
                onChange={(e) => handleUpdateCitation(index, 'authors', e.target.value)}
                placeholder="Authors"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              />
              <input
                type="text"
                value={citation.year || ''}
                onChange={(e) => handleUpdateCitation(index, 'year', e.target.value)}
                placeholder="Year"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              />
              <input
                type="text"
                value={citation.title || ''}
                onChange={(e) => handleUpdateCitation(index, 'title', e.target.value)}
                placeholder="Title"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              />
              {citation.type === 'article' && (
                <>
                  <input
                    type="text"
                    value={citation.journal || ''}
                    onChange={(e) => handleUpdateCitation(index, 'journal', e.target.value)}
                    placeholder="Journal Name"
                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={citation.volume || ''}
                      onChange={(e) => handleUpdateCitation(index, 'volume', e.target.value)}
                      placeholder="Volume"
                      className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
                    />
                    <input
                      type="text"
                      value={citation.issue || ''}
                      onChange={(e) => handleUpdateCitation(index, 'issue', e.target.value)}
                      placeholder="Issue"
                      className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
                    />
                    <input
                      type="text"
                      value={citation.pages || ''}
                      onChange={(e) => handleUpdateCitation(index, 'pages', e.target.value)}
                      placeholder="Pages"
                      className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
                    />
                  </div>
                </>
              )}
              {citation.type === 'book' && (
                <input
                  type="text"
                  value={citation.publisher || ''}
                  onChange={(e) => handleUpdateCitation(index, 'publisher', e.target.value)}
                  placeholder="Publisher"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                />
              )}
              <input
                type="url"
                value={citation.url || ''}
                onChange={(e) => handleUpdateCitation(index, 'url', e.target.value)}
                placeholder="URL (optional)"
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Preview: {formatCitation(citation)}
            </div>
          </div>
        ))}
        <button
          onClick={handleAddCitation}
          className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400"
        >
          Add Citation
        </button>
      </div>
    </div>
  );
} 