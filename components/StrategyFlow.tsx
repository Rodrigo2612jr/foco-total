import React, { useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StrategyBlock, StrategyEdge } from '../types';

interface Props {
  blocks: StrategyBlock[];
  edges: StrategyEdge[];
  onBlocksChange: (blocks: StrategyBlock[]) => void;
  onEdgesChange: (edges: StrategyEdge[]) => void;
  onEditNode?: (id: string) => void;
  theme?: 'feminine' | 'masculine';
  onDuplicateNode?: (id: string) => void;
  onAddNode?: (position: { x: number; y: number }) => void;
}

export const StrategyFlow: React.FC<Props> = ({ blocks, edges, onBlocksChange, onEdgesChange, onEditNode, onDuplicateNode, onAddNode, theme = 'feminine' }) => {
  const isFem = theme === 'feminine';
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const nodeTypes = useMemo(() => ({
    strategy: ({ data }: { data: { title: string; type: string; description?: string; id: string } }) => (
      <div className={`rounded-2xl border px-4 py-3 shadow-sm min-w-[160px] ${isFem ? 'border-rose-100 bg-white' : 'border-zinc-800 bg-zinc-950'}`}>
        <div className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>{data.type}</div>
        <div className={`text-sm font-black uppercase mt-1 ${isFem ? 'text-rose-800' : 'text-white'}`}>{data.title}</div>
        {data.description && (
          <div className={`text-[9px] uppercase tracking-[0.2em] mt-2 ${isFem ? 'text-rose-500' : 'text-zinc-400'}`}>{data.description}</div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEditNode?.(data.id)}
            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDuplicateNode?.(data.id)}
            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-white text-rose-600 border border-rose-200' : 'bg-black text-zinc-400 border border-zinc-800'}`}
          >
            Duplicar
          </button>
        </div>
      </div>
    )
  }), [isFem]);

  const nodes = useMemo<Node[]>(() => {
    return blocks.map((block, index) => ({
      id: block.id,
      position: block.position ?? { x: 60 + (index % 3) * 240, y: 60 + Math.floor(index / 3) * 160 },
      data: { id: block.id, title: block.title, type: block.type, description: block.description },
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
    <div ref={wrapperRef} className={`h-[60vh] sm:h-[65vh] lg:h-[70vh] w-full rounded-[2.5rem] overflow-hidden border ${isFem ? 'border-rose-100 bg-white' : 'border-zinc-800 bg-black'}`}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onInit={setInstance}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeDoubleClick={(_, node) => onEditNode?.(node.id)}
        onPaneDoubleClick={(event) => {
          if (!onAddNode) return;
          if (!instance) return;
          const bounds = wrapperRef.current?.getBoundingClientRect();
          if (!bounds) return;
          const position = instance.project({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
          });
          if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            onAddNode({ x: 120, y: 120 });
            return;
          }
          onAddNode(position);
        }}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={18} size={1} />
      </ReactFlow>
    </div>
  );
};
