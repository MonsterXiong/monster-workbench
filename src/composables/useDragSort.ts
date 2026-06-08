import { ref, type Ref } from 'vue';
import { moveItem } from "../utils";

/**
 * 通用 HTML5 拖放排序 Composable
 *
 * @param list - 需要进行拖动重排的响应式数组 Ref
 * @param onSortComplete - 拖动结束且顺序发生变化后的回调函数
 */
export function useDragSort<T>(
  list: Ref<T[]>,
  onSortComplete?: () => void
) {
  // 当前正在被拖拽的元素索引
  const isDraggingIndex = ref<number | null>(null);

  // 记录拖拽开始时的初始位置，用以判断结束后顺序是否真的发生了变化
  let startIndex = -1;

  /**
   * 拖拽开始事件处理器
   * @param index - 拖拽元素的当前索引
   * @param event - 原生拖拽事件
   */
  function handleDragStart(index: number, event: DragEvent) {
    isDraggingIndex.value = index;
    startIndex = index;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // 设置拖动时的自定义数据，防止某些浏览器拦截
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  /**
   * 拖动元素进入其他元素上方时的处理器 (实时改变位置以实现平滑动画效果)
   * @param index - 悬停目标元素的当前索引
   */
  function handleDragEnter(index: number) {
    if (isDraggingIndex.value === null || isDraggingIndex.value === index) {
      return;
    }

    list.value = moveItem(list.value, isDraggingIndex.value, index);

    // 更新当前拖拽元素的索引为新位置
    isDraggingIndex.value = index;
  }

  /**
   * 拖拽结束事件处理器
   */
  function handleDragEnd() {
    const finalIndex = isDraggingIndex.value;
    isDraggingIndex.value = null;

    // 如果位置发生了实质改变，则调用完成回调
    if (finalIndex !== null && startIndex !== finalIndex) {
      if (onSortComplete) {
        onSortComplete();
      }
    }

    startIndex = -1;
  }

  return {
    isDraggingIndex,
    handleDragStart,
    handleDragEnter,
    handleDragEnd
  };
}
