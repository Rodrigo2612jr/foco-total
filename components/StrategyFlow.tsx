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
  const nodes = useMemo<Node[]>(() => {
    return blocks.map((block, index) => ({
      id: block.id,
      position: block.position ?? { x: 60 + (index % 3) * 240, y: 60 + Math.floor(index / 3) * 160 },
      data: { label: block.title },
      type: 'default'
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
    <div className="h-[420px] w-full rounded-[2.5rem] overflow-hidden border border-rose-100 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
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
