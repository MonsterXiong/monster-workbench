import { onBeforeUnmount, onMounted, type Ref } from "vue";

/**
 * 点击 ref 元素外部时触发 handler。常见用途：弹出菜单 / 下拉框失焦自关闭。
 *
 * - 监听 `pointerdown`（捕获阶段）以便在 click 触发前就响应；
 * - target 不在 ref 树内才调用 handler；ref 为 null 时不响应；
 * - onMounted 装载、onBeforeUnmount 卸载，与组件生命周期一致；
 * - 不内置 stopPropagation——handler 自己决定后续行为。
 */
export function useClickOutside(
  target: Ref<HTMLElement | null>,
  handler: (event: PointerEvent) => void,
) {
  const onPointerDown = (event: PointerEvent) => {
    const el = target.value;
    if (!el) return;
    const node = event.target as Node | null;
    if (node && el.contains(node)) return;
    handler(event);
  };

  onMounted(() => {
    window.addEventListener("pointerdown", onPointerDown, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("pointerdown", onPointerDown, true);
  });
}
