import { ref } from 'vue';

/** 全局 Toast 消息内容 */
const toastMsg = ref('');
/** 全局 Toast 显示状态 */
const showToast = ref(false);
/** 定时器句柄，用于自动关闭 */
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * 全局 Toast composable（单例模式）
 * 使用模块级 ref 确保全局共享状态
 */
export function useToast() {
  /**
   * 触发 Toast 提示
   * @param msg - 提示消息文本
   * @param duration - 显示时长（毫秒），默认 2500ms
   */
  function triggerToast(msg: string, duration = 2500) {
    toastMsg.value = msg;
    showToast.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      showToast.value = false;
    }, duration);
  }

  return { toastMsg, showToast, triggerToast };
}
