import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
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
  maskZoom: Ref<number>;
  maskZoomPercent: ComputedRef<number>;
  maskCanvasSize: Ref<{ width: number; height: number } | null>;
  maskFocusPoint: Ref<{ x: number; y: number } | null>;
  maskPreviewDataUrl: Ref<string>;
  inpaintMaskStrokes: Ref<ImageWorkbenchMaskStroke[]>;
  canSaveInpaintMask: Ref<boolean>;
  canUndoMask: ComputedRef<boolean>;
  canRedoMask: ComputedRef<boolean>;
  canZoomInMask: ComputedRef<boolean>;
  canZoomOutMask: ComputedRef<boolean>;
  syncMaskCanvasSize(): void;
  handleMaskPointerDown(event: PointerEvent): void;
  handleMaskPointerMove(event: PointerEvent): void;
  finishMaskStroke(event: PointerEvent): void;
  undoMaskStroke(): void;
  redoMaskStroke(): void;
  resetInpaintMask(): void;
  zoomInMask(): void;
  zoomOutMask(): void;
  resetMaskView(): void;
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
  const maskZoom = ref(1);
  const maskCanvasSize = ref<{ width: number; height: number } | null>(null);
  const maskFocusPoint = ref<{ x: number; y: number } | null>(null);
  const maskPreviewDataUrl = ref("");
  const inpaintMaskStrokes = ref<ImageWorkbenchMaskStroke[]>([]);
  const redoMaskStrokes = ref<ImageWorkbenchMaskStroke[]>([]);
  let activeMaskStroke: ImageWorkbenchMaskStroke | null = null;
  let currentCanvasSize: { width: number; height: number } | null = null;

  const maskZoomPercent = computed(() => Math.round(maskZoom.value * 100));
  const canUndoMask = computed(() => inpaintMaskStrokes.value.length > 0);
  const canRedoMask = computed(() => redoMaskStrokes.value.length > 0);
  const canZoomInMask = computed(() => maskZoom.value < 4);
  const canZoomOutMask = computed(() => maskZoom.value > 1);

  const canSaveInpaintMask = ref(false);
  const recomputeCanSave = () => {
    canSaveInpaintMask.value =
      options.isActive.value &&
      inpaintMaskStrokes.value.some((stroke) => stroke.points.length >= 2);
  };
  watch([inpaintMaskStrokes, options.isActive], recomputeCanSave, { immediate: true, deep: true });

  function scaleStrokes(
    strokes: ImageWorkbenchMaskStroke[],
    scaleX: number,
    scaleY: number
  ): ImageWorkbenchMaskStroke[] {
    const brushScale = (scaleX + scaleY) / 2;
    return strokes.map((stroke) => ({
      ...stroke,
      brushSize: Math.min(160, Math.max(1, stroke.brushSize * brushScale)),
      points: stroke.points.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })),
    }));
  }

  function syncMaskCanvasSize() {
    const canvas = maskCanvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(16, Math.round(rect.width));
    const height = Math.max(16, Math.round(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      if (currentCanvasSize) {
        const scaleX = width / currentCanvasSize.width;
        const scaleY = height / currentCanvasSize.height;
        inpaintMaskStrokes.value = scaleStrokes(inpaintMaskStrokes.value, scaleX, scaleY);
        redoMaskStrokes.value = scaleStrokes(redoMaskStrokes.value, scaleX, scaleY);
      }
      canvas.width = width;
      canvas.height = height;
      currentCanvasSize = { width, height };
      maskCanvasSize.value = currentCanvasSize;
      replayMaskCanvas();
    } else if (!currentCanvasSize) {
      currentCanvasSize = { width, height };
      maskCanvasSize.value = currentCanvasSize;
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
    updateMaskPreview();
  }

  function updateMaskPreview() {
    const canvas = maskCanvasRef.value;
    if (!canvas || !inpaintMaskStrokes.value.some((stroke) => stroke.points.length >= 2)) {
      maskPreviewDataUrl.value = "";
      return;
    }
    maskPreviewDataUrl.value = canvas.toDataURL("image/png");
  }

  function handleMaskPointerDown(event: PointerEvent) {
    if (!options.isActive.value) return;
    syncMaskCanvasSize();
    const point = getMaskCanvasPoint(event);
    if (!point) return;
    maskFocusPoint.value = point;
    event.preventDefault();
    options.onClearStoreMask();
    redoMaskStrokes.value = [];
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
    maskFocusPoint.value = point;
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
    updateMaskPreview();
  }

  function undoMaskStroke() {
    if (activeMaskStroke) return;
    const nextStrokes = [...inpaintMaskStrokes.value];
    const stroke = nextStrokes.pop();
    if (!stroke) return;
    inpaintMaskStrokes.value = nextStrokes;
    redoMaskStrokes.value = [...redoMaskStrokes.value, stroke];
    options.onClearStoreMask();
    replayMaskCanvas();
  }

  function redoMaskStroke() {
    if (activeMaskStroke) return;
    const nextRedoStrokes = [...redoMaskStrokes.value];
    const stroke = nextRedoStrokes.pop();
    if (!stroke) return;
    redoMaskStrokes.value = nextRedoStrokes;
    inpaintMaskStrokes.value = [...inpaintMaskStrokes.value, stroke];
    options.onClearStoreMask();
    replayMaskCanvas();
  }

  function resetInpaintMask() {
    activeMaskStroke = null;
    inpaintMaskStrokes.value = [];
    redoMaskStrokes.value = [];
    maskFocusPoint.value = null;
    options.onClearStoreMask();
    replayMaskCanvas();
  }

  function setMaskZoom(value: number) {
    maskZoom.value = Math.min(4, Math.max(1, value));
  }

  function zoomInMask() {
    setMaskZoom(maskZoom.value + 0.25);
  }

  function zoomOutMask() {
    setMaskZoom(maskZoom.value - 0.25);
  }

  function resetMaskView() {
    setMaskZoom(1);
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

  watch(maskZoom, () => {
    void nextTick(() => syncMaskCanvasSize());
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
    maskZoom,
    maskZoomPercent,
    inpaintMaskStrokes,
    maskCanvasSize,
    maskFocusPoint,
    maskPreviewDataUrl,
    canSaveInpaintMask,
    canUndoMask,
    canRedoMask,
    canZoomInMask,
    canZoomOutMask,
    syncMaskCanvasSize,
    handleMaskPointerDown,
    handleMaskPointerMove,
    finishMaskStroke,
    undoMaskStroke,
    redoMaskStroke,
    resetInpaintMask,
    zoomInMask,
    zoomOutMask,
    resetMaskView,
    handleMaskImageLoad,
    handleSaveInpaintMask,
  };
}
