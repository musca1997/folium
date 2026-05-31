"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type GraphNodeKind = "root" | "category" | "topic" | "wiki_node" | "block";
type DetailLevel = "categories" | "topics" | "content";

type PositionedNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  href: string | null;
  x: number;
  y: number;
  r: number;
  type?: string;
  categoryId?: string;
  topicId?: string;
};

type VisualEdge = {
  id: string;
  from: string;
  to: string;
  weight: number;
  kind: "root_category" | "category_topic" | "topic_block" | "block_node";
};

type GraphCanvasProps = { width: number; height: number; nodes: PositionedNode[]; edges: VisualEdge[] };

function shortLabel(label: string, max = 28): string { return label.length > max ? `${label.slice(0, max - 1)}…` : label; }
function nodeFill(kind: GraphNodeKind): string { return kind === "root" || kind === "wiki_node" ? "#111111" : "#ffffff"; }
function nodeStroke(kind: GraphNodeKind): string { return kind === "block" ? "#777777" : "#111111"; }

export function GraphCanvas({ width, height, nodes, edges }: GraphCanvasProps) {
  const [scale, setScale] = useState(0.78);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const [detail, setDetail] = useState<DetailLevel>("topics");
  const [focusedCategoryId, setFocusedCategoryId] = useState("all");

  const categories = useMemo(() => nodes.filter((node) => node.kind === "category").sort((a, b) => a.label.localeCompare(b.label)), [nodes]);
  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (focusedCategoryId !== "all" && node.kind !== "root" && node.id !== focusedCategoryId && node.categoryId !== focusedCategoryId) return false;
      if (detail === "categories") return node.kind === "root" || node.kind === "category";
      if (detail === "topics") return node.kind === "root" || node.kind === "category" || node.kind === "topic";
      return true;
    });
  }, [detail, focusedCategoryId, nodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)), [edges, visibleIds]);
  const byId = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);

  function zoom(delta: number) { setScale((value) => Math.min(2.4, Math.max(0.35, Number((value + delta).toFixed(2))))); }
  function reset() { setScale(0.78); setPan({ x: 0, y: 0 }); }

  return (
    <section className="border border-line bg-[#fbfbfb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-3 py-2 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => zoom(0.12)} type="button">+</button>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => zoom(-0.12)} type="button">−</button>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={reset} type="button">Reset</button>
          {(["categories", "topics", "content"] as const).map((level) => (
            <button key={level} className={`border px-2 py-1 ${detail === level ? "border-ink text-ink" : "border-line hover:border-ink hover:text-ink"}`} onClick={() => setDetail(level)} type="button">
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
          <select className="border border-line bg-white px-2 py-1" value={focusedCategoryId} onChange={(event) => setFocusedCategoryId(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
          <button className="border border-line px-2 py-1 hover:border-ink hover:text-ink" onClick={() => setShowLinks((value) => !value)} type="button">
            {showLinks ? "Hide link labels" : "Show link labels"}
          </button>
        </div>
        <p>Scroll to zoom · drag empty space to pan · click nodes to open</p>
      </div>

      <div
        className="h-[76vh] min-h-[560px] cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? -0.08 : 0.08); }}
        onPointerDown={(event) => { if ((event.target as Element).closest("a,button,select")) return; setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }); }}
        onPointerMove={(event) => { if (!dragStart) return; setPan({ x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y }); }}
        onPointerUp={() => setDragStart(null)}
        onPointerLeave={() => setDragStart(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full select-none">
          <rect width={width} height={height} fill="#fbfbfb" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`} style={{ transformOrigin: "center" }}>
            {visibleEdges.map((edge) => {
              const from = byId.get(edge.from); const to = byId.get(edge.to); if (!from || !to) return null;
              const stroke = edge.kind === "root_category" ? "#999999" : edge.kind === "category_topic" ? "#bdbdbd" : "#d8d8d8";
              return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={edge.kind === "root_category" ? 1.8 : 0.6 + edge.weight * 1.2} opacity={edge.kind === "block_node" ? 0.45 : 0.85} />;
            })}
            {visibleNodes.map((node) => {
              const labelFill = node.kind === "block" ? "#777777" : node.kind === "wiki_node" ? "#444444" : "#111111";
              const labelSize = node.kind === "root" ? 18 : node.kind === "category" ? 15 : node.kind === "topic" ? 13 : node.kind === "wiki_node" ? 12 : 10;
              const shouldShowLabel = node.kind === "root" || node.kind === "category" || node.kind === "topic" || (node.kind === "block" && showLinks) || (node.kind === "wiki_node" && detail === "content");
              const circle = <circle cx={node.x} cy={node.y} r={node.r} fill={nodeFill(node.kind)} stroke={nodeStroke(node.kind)} strokeWidth={node.kind === "category" ? 1.4 : 1} className="transition-opacity hover:opacity-70" />;
              return (
                <g key={node.id}>
                  {node.href ? <Link href={node.href}>{circle}</Link> : circle}
                  {shouldShowLabel ? <text x={node.x + node.r + 7} y={node.y + 4} fontSize={labelSize} fill={labelFill} fontWeight={node.kind === "category" || node.kind === "root" ? 500 : 400}>{shortLabel(node.label, node.kind === "block" ? 24 : 30)}</text> : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}
