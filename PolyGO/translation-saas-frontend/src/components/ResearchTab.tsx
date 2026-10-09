import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import CitationManager from './CitationManager';
import CollaborationManager from './CollaborationManager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Dynamically import the knowledge graph visualization component
const KnowledgeGraph = dynamic(() => import('./KnowledgeGraph'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />
});

interface Citation {
  type: string;
  text: string;
  url: string;
}

interface ResearchMaterial {
  id: string;
  title: string;
  content: string;
  source_type: 'article' | 'book' | 'video' | 'website';
  source_url: string;
  citations: Citation[];
  related_concepts: string[];
}

interface RelatedContent {
  id: string;
  content_type: 'article' | 'video' | 'course' | 'quiz';
  title: string;
  description: string;
  url: string;
  relevance_score: number;
}

interface KnowledgeGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'concept' | 'material';
    properties: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    weight: number;
  }>;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
}

interface Props {
  lectureId: string;
}

const exportFormats: ExportFormat[] = [
  { id: 'markdown', name: 'Markdown', extension: 'md', mimeType: 'text/markdown' },
  { id: 'pdf', name: 'PDF', extension: 'pdf', mimeType: 'application/pdf' },
  { id: 'docx', name: 'Word', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'txt', name: 'Plain Text', extension: 'txt', mimeType: 'text/plain' },
  { id: 'json', name: 'JSON', extension: 'json', mimeType: 'application/json' },
  { id: 'latex', name: 'LaTeX', extension: 'tex', mimeType: 'application/x-latex' },
  { id: 'html', name: 'HTML', extension: 'html', mimeType: 'text/html' }
];

export default function ResearchTab({ lectureId }: Props) {
  const [activeTab, setActiveTab] = useState<'materials' | 'graph' | 'related'>('materials');
  const [materials, setMaterials] = useState<ResearchMaterial[]>([]);
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<('article' | 'book' | 'video' | 'website')[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<ResearchMaterial[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    fetchResearchData();
    fetchCurrentUser();
  }, [lectureId]);

  // Filter materials based on search term and source type
  useEffect(() => {
    let filtered = materials;

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(material =>
        material.title.toLowerCase().includes(term) ||
        material.content.toLowerCase().includes(term) ||
        material.related_concepts.some(concept => concept.toLowerCase().includes(term))
      );
    }

    // Apply source type filter
    if (sourceTypeFilter.length > 0) {
      filtered = filtered.filter(material => sourceTypeFilter.includes(material.source_type));
    }

    setFilteredMaterials(filtered);
  }, [searchTerm, sourceTypeFilter, materials]);

  const fetchResearchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/${lectureId}/research`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch research data');
      }

      const data = await response.json();
      setMaterials(data.materials);
      setGraphData(data.knowledge_graph);
      setRelatedContent(data.related_content);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');
      setCurrentUserId(session.user.id);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const exportResearchMaterials = async (format: ExportFormat) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      // Prepare the content based on format
      let content: string | Blob;
      let filename: string;

      if (format.id === 'json') {
        content = JSON.stringify(filteredMaterials, null, 2);
      } else if (format.id === 'latex') {
        content = generateLatexContent(filteredMaterials);
      } else if (format.id === 'html') {
        content = generateHtmlContent(filteredMaterials);
      } else {
        // For other formats, create a formatted text document
        content = filteredMaterials.map(material => `
# ${material.title}
Source Type: ${material.source_type.charAt(0).toUpperCase() + material.source_type.slice(1)}
${material.source_url ? `Source URL: ${material.source_url}` : ''}

## Content
${material.content}

## Citations
${material.citations.map(citation => `- ${citation.text}${citation.url ? ` (${citation.url})` : ''}`).join('\n')}

## Related Concepts
${material.related_concepts.map(concept => `- ${concept}`).join('\n')}

---
`).join('\n');
      }

      // For PDF, Word, LaTeX, and HTML formats, we need to use the backend API
      if (['pdf', 'docx', 'latex', 'html'].includes(format.id)) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/${lectureId}/research/export`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            format: format.id,
            materials: filteredMaterials
          })
        });

        if (!response.ok) {
          throw new Error('Failed to export materials');
        }

        content = await response.blob();
      }

      // Create a blob and download
      const blob = content instanceof Blob ? content : new Blob([content], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-materials-${lectureId}.${format.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const generateLatexContent = (materials: ResearchMaterial[]): string => {
    return `\\documentclass{article}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\begin{document}

\\title{Research Materials}
\\author{Generated by PolyGO}
\\date{\\today}
\\maketitle

${materials.map(material => `
\\section{${material.title}}
\\textbf{Source Type:} ${material.source_type.charAt(0).toUpperCase() + material.source_type.slice(1)}
${material.source_url ? `\\textbf{Source URL:} \\url{${material.source_url}}\n` : ''}

\\subsection{Content}
${material.content}

\\subsection{Citations}
\\begin{itemize}
${material.citations.map(citation => `\\item ${citation.text}${citation.url ? ` (\\url{${citation.url}})` : ''}`).join('\n')}
\\end{itemize}

\\subsection{Related Concepts}
\\begin{itemize}
${material.related_concepts.map(concept => `\\item ${concept}`).join('\n')}
\\end{itemize}

`).join('\n')}

\\end{document}`;
  };

  const generateHtmlContent = (materials: ResearchMaterial[]): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research Materials</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        h1, h2, h3 {
            color: #1a365d;
            margin-top: 2rem;
        }
        .source-info {
            color: #4a5568;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        .content {
            margin: 1rem 0;
        }
        .citations, .concepts {
            background-color: #f7fafc;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
        }
        .concept-tag {
            display: inline-block;
            background-color: #e2e8f0;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            margin: 0.25rem;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <h1>Research Materials</h1>
    <p>Generated on ${new Date().toLocaleDateString()}</p>

    ${materials.map(material => `
    <section>
        <h2>${material.title}</h2>
        <div class="source-info">
            <p><strong>Source Type:</strong> ${material.source_type.charAt(0).toUpperCase() + material.source_type.slice(1)}</p>
            ${material.source_url ? `<p><strong>Source URL:</strong> <a href="${material.source_url}">${material.source_url}</a></p>` : ''}
        </div>

        <div class="content">
            <h3>Content</h3>
            <p>${material.content}</p>
        </div>

        <div class="citations">
            <h3>Citations</h3>
            <ul>
                ${material.citations.map(citation => `
                <li>${citation.text}${citation.url ? ` (<a href="${citation.url}">${citation.url}</a>)` : ''}</li>
                `).join('')}
            </ul>
        </div>

        <div class="concepts">
            <h3>Related Concepts</h3>
            ${material.related_concepts.map(concept => `
            <span class="concept-tag">${concept}</span>
            `).join('')}
        </div>
    </section>
    `).join('\n')}

</body>
</html>`;
  };

  const handleUpdateCitations = async (materialId: string, citations: Citation[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/${lectureId}/research/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ citations })
      });

      if (!response.ok) {
        throw new Error('Failed to update citations');
      }

      // Update local state
      setMaterials(materials.map(material =>
        material.id === materialId
          ? { ...material, citations }
          : material
      ));
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['materials', 'graph', 'related'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {(['article', 'book', 'video', 'website'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSourceTypeFilter(prev =>
                        prev.includes(type)
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      );
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      sourceTypeFilter.includes(type)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredMaterials.length} of {materials.length} materials
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSourceTypeFilter([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Filters
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Materials
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        {exportFormats.map((format) => (
                          <button
                            key={format.id}
                            onClick={() => {
                              exportResearchMaterials(format);
                              setShowExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            {format.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {filteredMaterials.map((material) => (
                <div key={material.id} className="bg-white rounded-lg border p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{material.title}</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Source: {material.source_type.charAt(0).toUpperCase() + material.source_type.slice(1)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {material.source_url && (
                        <a
                          href={material.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Source
                        </a>
                      )}
                      <button
                        onClick={() => {
                          // Copy citations to clipboard
                          const citationsText = material.citations
                            .map(citation => citation.text)
                            .join('\n');
                          navigator.clipboard.writeText(citationsText);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Copy citations"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 prose max-w-none">
                    <p className="text-gray-700">{material.content}</p>
                  </div>
                  <div className="mt-4">
                    <CitationManager
                      citations={material.citations}
                      onUpdate={(citations) => handleUpdateCitations(material.id, citations)}
                    />
                  </div>
                  {material.related_concepts.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Related Concepts</h4>
                      <div className="flex flex-wrap gap-2">
                        {material.related_concepts.map((concept, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 pt-6 border-t">
                    <CollaborationManager
                      materialId={material.id}
                      currentUserId={currentUserId}
                      onCollaboratorsUpdate={(collaborators) => {
                        // Update local state if needed
                        console.log('Collaborators updated:', collaborators);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'graph' && graphData && (
          <div className="bg-white rounded-lg border p-6">
            <KnowledgeGraph data={graphData} />
          </div>
        )}

        {activeTab === 'related' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedContent.map((content) => (
              <div key={content.id} className="bg-white rounded-lg border p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {content.content_type.charAt(0).toUpperCase() + content.content_type.slice(1)}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {Math.round(content.relevance_score * 100)}% relevant
                  </span>
                </div>
                <p className="mt-4 text-gray-600">{content.description}</p>
                {content.url && (
                  <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Resource
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 