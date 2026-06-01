"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type GraphNodeKind = "root" | "topic" | "wiki_node" | "block";
type DetailLevel = "topics" | "content";

type PositionedNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  href: string | null;
  x: number;
  y: number;
  r: number;
  type?: string;
  topicId?: string;
};

type VisualEdge = {
  id: string;
  from: string;
  to: string;
  weight: number;
  kind: "root_topic" | "topic_block" | "block_node";
};

type GraphCanvasProps = { width: number; height: number; nodes: PositionedNode[]; edges: VisualEdge[] };

function shortLabel(label: string, max = 28): string { return label.length > max ? `${label.slice(0, max - 1)}…` : label; }
function nodeFill(node: PositionedNode): string {
  if (node.kind === "root") return "#111111";
  if (node.kind === "topic") return "#ffffff";
  if (node.kind === "block") return "#ffffff";
  if (node.type === "Source") return "#eeeeee";
  if (node.type === "Technology") return "#1f2937";
  return "#3f3f46";
}
function nodeStroke(node: PositionedNode): string {
  if (node.type === "Source") return "#cfcfcf";
  return node.kind === "block" ? "#777777" : "#111111";
}

export function GraphCanvas({ width, height, nodes, edges }: GraphCanvasProps) {
  const [scale, setScale] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [minRelevance, setMinRelevance] = useState(0.75);
  const [detail, setDetail] = useState<DetailLevel>("content");
  const [focusedTopicId, setFocusedTopicId] = useState("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const topics = useMemo(() => nodes.filter((node) => node.kind === "topic").sort((a, b) => a.label.localeCompare(b.label)), [nodes]);
  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!showSources && node.kind === "wiki_node" && node.type === "Source") return false;
      if (focusedTopicId !== "all" && node.kind !== "root" && node.id !== focusedTopicId && node.topicId !== focusedTopicId) return false;
      if (detail === "topics") return node.kind === "root" || node.kind === "topic";
      return true;
    });
  }, [detail, focusedTopicId, nodes, showSources]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter((edge) => {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) return false;
    if (edge.kind === "block_node" || edge.kind === "topic_block") return edge.weight >= minRelevance;
    return true;
  }), [edges, minRelevance, visibleIds]);
  const byId = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const connectedIds = useMemo(() => {
    if (!hoveredId) return null;
    const hovered = byId.get(hoveredId);
    const ids = new Set([hoveredId]);
    for (const edge of visibleEdges) {
      if (edge.from === hoveredId) ids.add(edge.to);
      if (edge.to === hoveredId) ids.add(edge.from);
    }
    if (hovered?.kind === "topic") {
      const blockIds = new Set([...ids].filter((id) => byId.get(id)?.kind === "block"));
      for (const edge of visibleEdges) {
        if (edge.kind !== "block_node") continue;
        if (blockIds.has(edge.from)) ids.add(edge.to);
        if (blockIds.has(edge.to)) ids.add(edge.from);
      }
    }
    return ids;
  }, [byId, hoveredId, visibleEdges]);

  const hoveredNode = hoveredId ? byId.get(hoveredId) : null;

  function zoom(delta: number) { setScale((value) => Math.min(2.4, Math.max(0.35, Number((value + delta).toFixed(2))))); }
  function reset() { setScale(0.72); setPan({ x: 0, y: 0 }); setFocusedTopicId("all"); setHoveredId(null); }
  function isDimmed(id: string) { return connectedIds ? !connectedIds.has(id) : false; }

  return (
    <section className="border border-line bg-[#fbfbfb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-3 py-2 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => zoom(0.12)} type="button">+</button>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => zoom(-0.12)} type="button">−</button>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={reset} type="button">Reset</button>
          {(["topics", "content"] as const).map((level) => (
            <button key={level} className={`border px-2 py-1 ${detail === level ? "border-ink text-ink" : "border-line hover:border-ink hover:text-ink"}`} onClick={() => setDetail(level)} type="button">
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
          <select className="border border-line bg-white px-2 py-1" value={focusedTopicId} onChange={(event) => setFocusedTopicId(event.target.value)}>
            <option value="all">All topics</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
          </select>
          <label className="flex items-center gap-1 border border-line px-2 py-1">
            <input type="checkbox" checked={showSources} onChange={(event) => setShowSources(event.target.checked)} /> Sources
          </label>
          <label className="flex items-center gap-2 border border-line px-2 py-1">
            <span>Min {minRelevance.toFixed(2)}</span>
            <input aria-label="Minimum relevance" type="range" min="0.35" max="0.95" step="0.05" value={minRelevance} onChange={(event) => setMinRelevance(Number(event.target.value))} />
          </label>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => setShowLabels((value) => !value)} type="button">
            {showLabels ? "Hide extra labels" : "Show extra labels"}
          </button>
        </div>
        <p>Clustered layout · hover a topic to reveal its nodes · scroll to zoom · drag empty space to pan</p>
      </div>

      <div
        className="h-[76vh] min-h-[560px] cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? -0.08 : 0.08); }}
        onPointerDown={(event) => { if ((event.target as Element).closest("a,button,select,input")) return; setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }); }}
        onPointerMove={(event) => { if (!dragStart) return; setPan({ x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y }); }}
        onPointerUp={() => setDragStart(null)}
        onPointerLeave={() => { setDragStart(null); setHoveredId(null); }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full select-none">
          <rect width={width} height={height} fill="#fbfbfb" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`} style={{ transformOrigin: "center" }}>
            {visibleEdges.map((edge) => {
              const from = byId.get(edge.from); const to = byId.get(edge.to); if (!from || !to) return null;
              const stroke = edge.kind === "root_topic" ? "#999999" : "#d8d8d8";
              const dimmed = connectedIds ? !(connectedIds.has(edge.from) && connectedIds.has(edge.to)) : false;
              return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={edge.kind === "root_topic" ? 1.8 : 0.6 + edge.weight * 1.25} opacity={dimmed ? 0.08 : edge.kind === "block_node" ? 0.42 : 0.82} />;
            })}
            {visibleNodes.map((node) => {
              const labelFill = node.kind === "block" ? "#777777" : node.kind === "wiki_node" ? "#444444" : "#111111";
              const labelSize = node.kind === "root" ? 18 : node.kind === "topic" ? 14 : node.kind === "wiki_node" ? 11 : 10;
              const shouldShowLabel = node.kind === "root" || node.kind === "topic" || hoveredId === node.id || (connectedIds?.has(node.id) && (node.kind === "wiki_node" || (hoveredNode?.kind === "topic" && node.kind === "block"))) || (showLabels && node.kind !== "block");
              const dimmed = isDimmed(node.id);
              const circle = <circle cx={node.x} cy={node.y} r={node.r} fill={nodeFill(node)} stroke={nodeStroke(node)} strokeWidth={node.kind === "topic" ? 1.4 : 1} opacity={dimmed ? 0.18 : 1} onPointerEnter={() => setHoveredId(node.id)} className="transition-opacity hover:opacity-70" />;
              return (
                <g key={node.id} onPointerEnter={() => setHoveredId(node.id)}>
                  {node.href ? <Link href={node.href}>{circle}</Link> : circle}
                  {shouldShowLabel ? <text x={node.x + node.r + 7} y={node.y + 4} fontSize={labelSize} fill={labelFill} opacity={dimmed ? 0.18 : 1} fontWeight={node.kind === "topic" || node.kind === "root" ? 500 : 400}>{shortLabel(node.label, node.kind === "block" ? 24 : 34)}</text> : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}
