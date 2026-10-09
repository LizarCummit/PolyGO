import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />
});

interface Node {
  id: string;
  label: string;
  type: 'concept' | 'material';
  properties: Record<string, any>;
  cluster?: string;
}

interface Edge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

interface Props {
  data: {
    nodes: Node[];
    edges: Edge[];
  };
}

export default function KnowledgeGraph({ data }: Props) {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(true);
  const [layout, setLayout] = useState<'force' | 'circular' | 'grid'>('force');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [shortestPath, setShortestPath] = useState<string[]>([]);
  const [showPathFinding, setShowPathFinding] = useState(false);

  useEffect(() => {
    if (graphRef.current) {
      // Center the graph
      const centerAt = (x: number, y: number) => {
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(x, y);

        graphRef.current.cameraPosition(
          { x: x * distRatio, y: y * distRatio, z: distance * 2 },
          { x: 0, y: 0, z: 0 },
          3000
        );
      };

      setTimeout(() => {
        centerAt(0, 0);
      }, 100);
    }
  }, [data]);

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filteredNodes = data.nodes.filter(node => 
      node.label.toLowerCase().includes(term) ||
      node.type.toLowerCase().includes(term)
    );

    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredEdges = data.edges.filter(edge =>
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );

    setFilteredData({
      nodes: filteredNodes,
      edges: filteredEdges
    });
  }, [searchTerm, data]);

  const findShortestPath = (start: string, end: string) => {
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();

    // Initialize distances
    data.nodes.forEach(node => {
      distances.set(node.id, Infinity);
    });
    distances.set(start, 0);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === end) {
        setShortestPath(path);
        return;
      }

      if (visited.has(node)) continue;
      visited.add(node);

      // Find all connected nodes
      const connectedNodes = data.edges
        .filter(edge => edge.source === node || edge.target === node)
        .map(edge => edge.source === node ? edge.target : edge.source);

      // Update distances and add to queue
      connectedNodes.forEach(connectedNode => {
        const edge = data.edges.find(e => 
          (e.source === node && e.target === connectedNode) ||
          (e.source === connectedNode && e.target === node)
        );
        const distance = distances.get(node)! + (edge?.weight || 1);

        if (distance < distances.get(connectedNode)!) {
          distances.set(connectedNode, distance);
          previous.set(connectedNode, node);
          queue.push({
            node: connectedNode,
            path: [...path, connectedNode]
          });
        }
      });
    }

    // If no path found, reconstruct path from previous map
    const path: string[] = [];
    let current = end;
    while (current) {
      path.unshift(current);
      current = previous.get(current)!;
      if (current === start) {
        path.unshift(start);
        break;
      }
    }
    setShortestPath(path);
  };

  const handleNodeClick = (node: any) => {
    if (showPathFinding) {
      if (!pathStart) {
        setPathStart(node.id);
      } else if (node.id !== pathStart) {
        setPathEnd(node.id);
        findShortestPath(pathStart, node.id);
      }
    } else {
      setSelectedNode(data.nodes.find(n => n.id === node.id) || null);
      
      // Highlight connected nodes and edges
      const connectedNodes = new Set<string>();
      const connectedEdges = new Set<string>();
      
      filteredData.edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
          connectedNodes.add(edge.source);
          connectedNodes.add(edge.target);
          connectedEdges.add(`${edge.source}-${edge.target}`);
        }
      });
      
      setHighlightedNodes(connectedNodes);
      setHighlightedEdges(connectedEdges);
    }
  };

  const handleNodeDragStart = () => {
    setIsDragging(true);
  };

  const handleNodeDragEnd = (node: any) => {
    setIsDragging(false);
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleZoom = (zoom: number) => {
    setZoomLevel(zoom);
  };

  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
      setZoomLevel(1);
    }
  };

  const handleLayoutChange = (newLayout: 'force' | 'circular' | 'grid') => {
    setLayout(newLayout);
    if (graphRef.current) {
      // Reset node positions based on layout
      const nodes = graphRef.current.graphData().nodes;
      const width = graphRef.current.width();
      const height = graphRef.current.height();
      
      switch (newLayout) {
        case 'circular':
          nodes.forEach((node: any, i: number) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            const radius = Math.min(width, height) * 0.4;
            node.fx = radius * Math.cos(angle);
            node.fy = radius * Math.sin(angle);
          });
          break;
        case 'grid':
          const cols = Math.ceil(Math.sqrt(nodes.length));
          nodes.forEach((node: any, i: number) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            node.fx = (col - cols / 2) * 100;
            node.fy = (row - nodes.length / (2 * cols)) * 100;
          });
          break;
        case 'force':
          nodes.forEach((node: any) => {
            node.fx = undefined;
            node.fy = undefined;
          });
          break;
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center space-x-2">
          <select
            value={layout}
            onChange={(e) => handleLayoutChange(e.target.value as 'force' | 'circular' | 'grid')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="force">Force Layout</option>
            <option value="circular">Circular Layout</option>
            <option value="grid">Grid Layout</option>
          </select>
          <button
            onClick={handleResetView}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reset View
          </button>
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {showControls ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowPathFinding(!showPathFinding)}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            showPathFinding
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showPathFinding ? 'Cancel Path Finding' : 'Find Path'}
        </button>
        {showPathFinding && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {pathStart ? 'Select end node' : 'Select start node'}
            </span>
            {pathStart && pathEnd && (
              <button
                onClick={() => {
                  setPathStart(null);
                  setPathEnd(null);
                  setShortestPath([]);
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear Path
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative h-[600px] w-full bg-white rounded-lg border">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          linkLabel="label"
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25}
          linkAutoColorBy="label"
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragEnd={handleNodeDragEnd}
          onZoom={handleZoom}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = node.isPathNode 
              ? '#EF4444' 
              : node.highlighted 
                ? '#2563EB' 
                : node.selected 
                  ? '#1E40AF' 
                  : node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.selected ? 7 : 5, 0, 2 * Math.PI);
            ctx.fill();

            // Draw label
            ctx.fillStyle = node.isPathNode 
              ? '#991B1B' 
              : node.highlighted 
                ? '#1E40AF' 
                : '#1F2937';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, node.x, node.y + 10);
          }}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = link.label;
            const fontSize = 10 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = link.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, (link.source.x + link.target.x) / 2, (link.source.y + link.target.y) / 2);
          }}
        />
        {showControls && (
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Zoom:</span>
                <span className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Dragging:</span>
                <span className="text-sm font-medium">{isDragging ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Selected Node:</span>
                <span className="text-sm font-medium">{selectedNode?.label || 'None'}</span>
              </div>
              {showPathFinding && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Path Finding:</span>
                  <span className="text-sm font-medium">
                    {pathStart ? 'End node' : 'Start node'} selection
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-2">{selectedNode.label}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Type: {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
          </p>
          {Object.entries(selectedNode.properties).map(([key, value]) => (
            <div key={key} className="mb-2">
              <span className="text-sm font-medium text-gray-500">{key}:</span>
              <span className="ml-2 text-sm text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 