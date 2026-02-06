import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StrategyBlock, StrategyEdge } from '../types';

interface Props {
  blocks: StrategyBlock[];
  edges: StrategyEdge[];
  onBlocksChange: (blocks: StrategyBlock[]) => void;
  onEdgesChange: (edges: StrategyEdge[]) => void;
}

export const StrategyFlow: React.FC<Props> = ({ blocks, edges, onBlocksChange, onEdgesChange }) => {
  const nodeTypes = useMemo(() => ({
    strategy: ({ data }: { data: { title: string; type: string; description?: string } }) => (
      <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-sm min-w-[160px]">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-400">{data.type}</div>
        <div className="text-sm font-black uppercase text-rose-800 mt-1">{data.title}</div>
        {data.description && (
          <div className="text-[9px] uppercase tracking-[0.2em] text-rose-500 mt-2">{data.description}</div>
        )}
      </div>
    )
  }), []);

  const nodes = useMemo<Node[]>(() => {
    return blocks.map((block, index) => ({
      id: block.id,
      position: block.position ?? { x: 60 + (index % 3) * 240, y: 60 + Math.floor(index / 3) * 160 },
      data: { title: block.title, type: block.type, description: block.description },
      type: 'strategy'
    }));
  }, [blocks]);

  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target
    }));
  }, [edges]);

  const handleNodesChange = (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes);
    const nextBlocks = blocks.map(block => {
      const node = updatedNodes.find(n => n.id === block.id);
      if (!node) return block;
      return { ...block, position: node.position };
    });
    onBlocksChange(nextBlocks);
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, flowEdges);
    onEdgesChange(updatedEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      projectId: edges.find(e => e.id === edge.id)?.projectId ?? ''
    })));
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const newEdge: StrategyEdge = {
      id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
      source: connection.source,
      target: connection.target,
      projectId: blocks[0]?.projectId ?? ''
    };
    onEdgesChange([...edges, newEdge]);
  };

  return (
    <div className="h-[320px] sm:h-[420px] lg:h-[520px] w-full rounded-[2.5rem] overflow-hidden border border-rose-100 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={18} size={1} />
      </ReactFlow>
    </div>
  );
};
