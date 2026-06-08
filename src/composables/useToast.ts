import { ref } from "vue";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  duration?: number;
  title?: string;
  icon?: string;
  closable?: boolean;
  actionText?: string;
  onAction?: () => void;
}

/** 全局 Toast 消息内容 */
const toastMsg = ref("");
/** 全局 Toast 类型 */
const toastType = ref<ToastType>("success");
/** 全局 Toast 显示状态 */
const showToast = ref(false);
const toastTitle = ref("");
const toastIcon = ref("");
const toastClosable = ref(false);
const toastActionText = ref("");
const toastAction = ref<(() => void) | null>(null);
/** 定时器句柄，用于自动关闭 */
let timer: ReturnType<typeof setTimeout> | null = null;

function clearToastTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * 全局 Toast composable（单例模式）
 * 使用模块级 ref 确保全局共享状态
 */
export function useToast() {
  /**
   * 触发 Toast 提示
   * @param msg - 提示消息文本
   * @param typeOrDuration - 消息类型 ('success' | 'error' | 'warning' | 'info') 或持续时间（兼容旧接口）
   * @param duration - 显示时长（毫秒），默认 2500ms
   */
  function triggerToast(
    msg: string,
    typeOrDuration: ToastType | number | ToastOptions = "success",
    durationOrOptions: number | ToastOptions = 2500
  ) {
    const options: ToastOptions =
      typeof durationOrOptions === "object"
        ? durationOrOptions
        : typeof typeOrDuration === "object"
          ? typeOrDuration
          : { duration: durationOrOptions };
    let duration = options.duration ?? 2500;
    toastMsg.value = msg;

    if (typeof typeOrDuration === "number") {
      toastType.value = "success";
      duration = typeOrDuration;
    } else if (typeof typeOrDuration === "object") {
      toastType.value = "success";
    } else {
      toastType.value = typeOrDuration;
    }

    toastTitle.value = options.title ?? "";
    toastIcon.value = options.icon ?? "";
    toastClosable.value = options.closable ?? false;
    toastActionText.value = options.actionText ?? "";
    toastAction.value = options.onAction ?? null;
    showToast.value = true;
    clearToastTimer();

    if (duration > 0) {
      timer = setTimeout(() => {
        showToast.value = false;
        timer = null;
      }, duration);
    }
  }

  function hideToast() {
    showToast.value = false;
    clearToastTimer();
  }

  function runToastAction() {
    toastAction.value?.();
    hideToast();
  }

  return {
    toastMsg,
    toastType,
    showToast,
    toastTitle,
    toastIcon,
    toastClosable,
    toastActionText,
    triggerToast,
    hideToast,
    runToastAction,
    clearToastTimer,
  };
}
