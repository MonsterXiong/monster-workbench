import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { ImageWorkbenchMaskStroke } from "../../types/image-workbench";

export interface UseImageWorkbenchMaskCanvasOptions {
  isActive: Ref<boolean>;
  onSave: (payload: {
    width: number;
    height: number;
    strokes: ImageWorkbenchMaskStroke[];
  }) => void;
  onClearStoreMask: () => void;
  watchKey: () => unknown[];
}

export interface UseImageWorkbenchMaskCanvasResult {
  maskCanvasRef: Ref<HTMLCanvasElement | null>;
  maskTool: Ref<"paint" | "erase">;
  maskBrushSize: Ref<number>;
  inpaintMaskStrokes: Ref<ImageWorkbenchMaskStroke[]>;
  canSaveInpaintMask: Ref<boolean>;
  syncMaskCanvasSize(): void;
  handleMaskPointerDown(event: PointerEvent): void;
  handleMaskPointerMove(event: PointerEvent): void;
  finishMaskStroke(event: PointerEvent): void;
  resetInpaintMask(): void;
  handleMaskImageLoad(): void;
  handleSaveInpaintMask(): void;
}

/**
 * 蒙版绘制画布逻辑：把 inpaint 工作流里的 pointer 事件、stroke 数据与
 * canvas 重绘统一封装。Page 只需要拿到 ref/state 与事件 handler，避免
 * 把 ~150 行底层实现继续堆在路由 Page 入口。
 */
export function useImageWorkbenchMaskCanvas(
  options: UseImageWorkbenchMaskCanvasOptions
): UseImageWorkbenchMaskCanvasResult {
  const maskCanvasRef = ref<HTMLCanvasElement | null>(null);
  const maskTool = ref<"paint" | "erase">("paint");
  const maskBrushSize = ref(32);
  const inpaintMaskStrokes = ref<ImageWorkbenchMaskStroke[]>([]);
  let activeMaskStroke: ImageWorkbenchMaskStroke | null = null;

  const canSaveInpaintMask = ref(false);
  const recomputeCanSave = () => {
    canSaveInpaintMask.value =
      options.isActive.value &&
      inpaintMaskStrokes.value.some((stroke) => stroke.points.length >= 2);
  };
  watch([inpaintMaskStrokes, options.isActive], recomputeCanSave, { immediate: true, deep: true });

  function syncMaskCanvasSize() {
    const canvas = maskCanvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(16, Math.round(rect.width));
    const height = Math.max(16, Math.round(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      replayMaskCanvas();
    }
  }

  function getMaskCanvasPoint(event: PointerEvent) {
    const canvas = maskCanvasRef.value;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function drawMaskStroke(stroke: ImageWorkbenchMaskStroke, fromIndex = 0) {
    const canvas = maskCanvasRef.value;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || stroke.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.brushSize;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.78)";
    ctx.globalCompositeOperation =
      stroke.tool === "erase" ? "destination-out" : "source-over";
    const startIndex = Math.max(1, fromIndex);
    for (let index = startIndex; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const point = stroke.points[index];
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function replayMaskCanvas() {
    const canvas = maskCanvasRef.value;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    inpaintMaskStrokes.value.forEach((stroke) => drawMaskStroke(stroke));
  }

  function handleMaskPointerDown(event: PointerEvent) {
    if (!options.isActive.value) return;
    syncMaskCanvasSize();
    const point = getMaskCanvasPoint(event);
    if (!point) return;
    event.preventDefault();
    options.onClearStoreMask();
    const canvas = maskCanvasRef.value;
    canvas?.setPointerCapture(event.pointerId);
    activeMaskStroke = {
      tool: maskTool.value,
      brushSize: maskBrushSize.value,
      points: [point],
    };
    inpaintMaskStrokes.value = [...inpaintMaskStrokes.value, activeMaskStroke];
  }

  function handleMaskPointerMove(event: PointerEvent) {
    if (!activeMaskStroke) return;
    const point = getMaskCanvasPoint(event);
    if (!point) return;
    event.preventDefault();
    const fromIndex = activeMaskStroke.points.length - 1;
    activeMaskStroke.points.push(point);
    drawMaskStroke(activeMaskStroke, fromIndex);
  }

  function finishMaskStroke(event: PointerEvent) {
    if (!activeMaskStroke) return;
    if (maskCanvasRef.value?.hasPointerCapture(event.pointerId)) {
      maskCanvasRef.value.releasePointerCapture(event.pointerId);
    }
    if (activeMaskStroke.points.length < 2) {
      inpaintMaskStrokes.value = inpaintMaskStrokes.value.filter(
        (stroke) => stroke !== activeMaskStroke
      );
    } else {
      inpaintMaskStrokes.value = [...inpaintMaskStrokes.value];
    }
    activeMaskStroke = null;
  }

  function resetInpaintMask() {
    activeMaskStroke = null;
    inpaintMaskStrokes.value = [];
    options.onClearStoreMask();
    replayMaskCanvas();
  }

  function handleMaskImageLoad() {
    void nextTick(() => syncMaskCanvasSize());
  }

  function handleSaveInpaintMask() {
    const canvas = maskCanvasRef.value;
    if (!canvas || !canSaveInpaintMask.value) return;
    options.onSave({
      width: canvas.width,
      height: canvas.height,
      strokes: inpaintMaskStrokes.value.filter((stroke) => stroke.points.length >= 2),
    });
  }

  watch(options.watchKey, () => {
    resetInpaintMask();
    if (options.isActive.value) {
      void nextTick(() => syncMaskCanvasSize());
    }
  });

  onMounted(() => {
    window.addEventListener("resize", syncMaskCanvasSize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", syncMaskCanvasSize);
  });

  return {
    maskCanvasRef,
    maskTool,
    maskBrushSize,
    inpaintMaskStrokes,
    canSaveInpaintMask,
    syncMaskCanvasSize,
    handleMaskPointerDown,
    handleMaskPointerMove,
    finishMaskStroke,
    resetInpaintMask,
    handleMaskImageLoad,
    handleSaveInpaintMask,
  };
}
