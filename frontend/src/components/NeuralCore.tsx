"use client";

import { useEffect, useRef, useState } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  label: string;
  color: string;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export default function NeuralCore({ activeStage }: { activeStage: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse position tracking for parallax
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = containerRef.current?.clientWidth || 400);
    let height = (canvas.height = containerRef.current?.clientHeight || 400);

    // Re-adjust size on resize
    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      width = canvas.width = containerRef.current.clientWidth;
      height = canvas.height = containerRef.current.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // 1. Generate 3D sphere nodes
    const nodes: Node3D[] = [];
    const labels = [
      "Lexical Index", "Semantic Vectors", "Hybrid DB", "RRF Merger", "Cross-Encoder", 
      "LLM Generator", "Citation Audit", "Neon PostgreSQL", "Qdrant Cloud", "RAGAS Engine", 
      "Embeddings Map", "Latency Tracker", "Query Log", "Security SOP", "SLA Guide",
      "OAuth JWT", "BGE Embedding", "MiniLM Rerank", "GPT-4o API", "Faithfulness Core"
    ];

    const numNodes = 40;
    const radius = Math.min(width, height) * 0.35;

    for (let i = 0; i < numNodes; i++) {
      // Golden spiral distribution on sphere
      const phi = Math.acos(-1 + (2 * i) / numNodes);
      const theta = Math.sqrt(numNodes * Math.PI) * phi;
      
      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        label: labels[i % labels.length],
        color: i % 5 === 0 ? "#F7C948" : "#D4AF37"
      });
    }

    // 2. Generate random background golden dust particles
    const particles: Particle3D[] = [];
    const numParticles = 60;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: (Math.random() - 0.5) * radius * 2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        vz: (Math.random() - 0.5) * 0.2
      });
    }

    // Rotations variables
    let angleX = 0.002;
    let angleY = 0.003;
    
    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      // Calculate coordinates relative to center
      mouseRef.current.targetX = (clientX - width / 2) * 0.003;
      mouseRef.current.targetY = (clientY - height / 2) * 0.003;
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // Flow path variables for active query animation
    let flowProgress = 0;
    const stagesFlow = ["Embed", "Dense Search", "BM25 Search", "RRF Fusion", "Reranker", "LLM Generate", "Verify"];

    // Main animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse tracking (LERP)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Apply 3D Rotations
      // Combine automatic slow rotation + mouse offset rotation
      const currentAngleX = angleX + mouse.y * 0.05;
      const currentAngleY = angleY + mouse.x * 0.05;

      const cosX = Math.cos(currentAngleX);
      const sinX = Math.sin(currentAngleX);
      const cosY = Math.cos(currentAngleY);
      const sinY = Math.sin(currentAngleY);

      // Rotate and project nodes
      const projectedNodes = nodes.map(node => {
        // Rotate Y
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;
        
        // Rotate X
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        // Keep rotated coordinates back in object for subsequent frames
        node.x = x1;
        node.y = y2;
        node.z = z2;

        // Perspective projection parameters
        const fov = 350;
        const scale = fov / (fov + z2);
        const projX = width / 2 + x1 * scale;
        const projY = height / 2 + y2 * scale;

        return {
          projX,
          projY,
          scale,
          z: z2,
          label: node.label,
          color: node.color
        };
      });

      // Draw background particles (floating gold dust)
      ctx.fillStyle = "rgba(212, 175, 55, 0.25)";
      particles.forEach(p => {
        // Apply rotation
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        // Update positions slowly
        p.x = x1 + p.vx;
        p.y = y2 + p.vy;
        p.z = z2 + p.vz;

        // Wrap around boundaries
        if (Math.abs(p.x) > width) p.x = -p.x;
        if (Math.abs(p.y) > height) p.y = -p.y;

        const fov = 350;
        const scale = fov / (fov + z2);
        const px = width / 2 + x1 * scale;
        const py = height / 2 + y2 * scale;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.arc(px, py, scale * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw connections (thin golden web lines)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];
          
          // Calculate distance in 3D rotated space
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          // Connect close nodes
          if (dist < radius * 0.8) {
            // Lines are more transparent if nodes are farther away in z
            const avgZ = (n1.z + n2.z) / 2;
            const alpha = Math.max(0, 0.15 * (1 - dist / (radius * 0.8)) * (1 - avgZ / (radius * 2)));
            
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.projX, n1.projY);
            ctx.lineTo(n2.projX, n2.projY);
            ctx.stroke();
          }
        }
      }

      // Draw RAG Query Pulse Beams
      if (activeStage) {
        flowProgress += 0.015;
        if (flowProgress > 1) flowProgress = 0;
        
        ctx.lineWidth = 1.5;
        // Draw 3 primary glowing flows through nodes representing: User -> Embed -> Search -> Verify -> Response
        ctx.strokeStyle = "rgba(247, 201, 72, 0.6)";
        ctx.shadowColor = "#D4AF37";
        ctx.shadowBlur = 8;
        
        for (let flowIdx = 0; flowIdx < 3; flowIdx++) {
          const startNode = projectedNodes[flowIdx * 5];
          const midNode1 = projectedNodes[flowIdx * 5 + 3];
          const midNode2 = projectedNodes[flowIdx * 5 + 6];
          const endNode = projectedNodes[flowIdx * 5 + 9];
          
          if (startNode && midNode1 && midNode2 && endNode) {
            ctx.beginPath();
            ctx.moveTo(startNode.projX, startNode.projY);
            
            // Draw quad curves
            ctx.quadraticCurveTo(midNode1.projX, midNode1.projY, midNode2.projX, midNode2.projY);
            ctx.lineTo(endNode.projX, endNode.projY);
            ctx.stroke();
          }
        }
        
        // Reset shadows
        ctx.shadowBlur = 0;
      }

      // Draw nodes (glowing golden spheres)
      projectedNodes.forEach(node => {
        // Node size depends on perspective depth (scale)
        const size = Math.max(1.5, node.scale * 3.5);
        const zAlpha = Math.max(0.2, (node.z + radius) / (radius * 2)); // fade rear nodes
        
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = zAlpha;
        ctx.fill();
        
        // Draw glowing aura behind front nodes
        if (node.z < -radius * 0.2) {
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${0.05 * zAlpha})`;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      });

      // Render Active Stage indicator text on the Canvas
      if (activeStage) {
        ctx.fillStyle = "rgba(245, 245, 245, 0.9)";
        ctx.font = "600 11px var(--font-display), sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`OS STAGE: ${activeStage.toUpperCase()}`, width / 2, height - 25);
        
        // Little progress line
        ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
        ctx.fillRect(width / 2 - 60, height - 16, 120, 2);
        
        ctx.fillStyle = "#D4AF37";
        ctx.fillRect(width / 2 - 60, height - 16, 120 * flowProgress, 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeStage]);

  return (
    <div ref={containerRef} className="w-full h-full relative group">
      {/* Glow background behind sphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.04)_0%,transparent_60%)] pointer-events-none" />
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" 
      />
    </div>
  );
}
