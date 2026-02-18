import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  onAddNode?: (position: { x: number; y: number }, type?: string) => void;
// Estratégia removida.
export {};
export const StrategyFlow: React.FC<Props> = ({ blocks, edges, onBlocksChange, onEdgesChange, onEditNode, onDuplicateNode, onAddNode, theme = 'feminine' }) => {
