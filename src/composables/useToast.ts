import { ref } from "vue";
import { clearTimeoutHandle, createTimeout, type TimeoutHandle } from "../utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  duration?: number;
  type?: ToastType;
  title?: string;
  description?: string;
  icon?: string;
  closable?: boolean;
  actionText?: string;
  onAction?: () => void;
  showProgress?: boolean;
  wrap?: boolean;
}

/** 全局 Toast 消息内容 */
const toastMsg = ref("");
/** 全局 Toast 类型 */
const toastType = ref<ToastType>("success");
/** 全局 Toast 显示状态 */
const showToast = ref(false);
const toastTitle = ref("");
const toastDescription = ref("");
const toastIcon = ref("");
const toastClosable = ref(false);
const toastActionText = ref("");
const toastAction = ref<(() => void) | null>(null);
const toastDuration = ref(2500);
const toastShowProgress = ref(false);
const toastWrap = ref(false);
const toastId = ref(0);
/** 定时器句柄，用于自动关闭 */
let timer: TimeoutHandle | null = null;

function clearToastTimer() {
  clearTimeoutHandle(timer);
  timer = null;
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
      toastType.value = typeOrDuration.type ?? "success";
    } else {
      toastType.value = options.type ?? typeOrDuration;
    }

    toastTitle.value = options.title ?? "";
    toastDescription.value = options.description ?? "";
    toastIcon.value = options.icon ?? "";
    toastClosable.value = options.closable ?? false;
    toastActionText.value = options.actionText ?? "";
    toastAction.value = options.onAction ?? null;
    toastDuration.value = duration;
    toastShowProgress.value = options.showProgress ?? duration > 0;
    toastWrap.value = options.wrap ?? false;
    toastId.value += 1;
    showToast.value = true;
    clearToastTimer();

    if (duration > 0) {
      timer = createTimeout(() => {
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
    toastDescription,
    toastIcon,
    toastClosable,
    toastActionText,
    toastDuration,
    toastShowProgress,
    toastWrap,
    toastId,
    triggerToast,
    hideToast,
    runToastAction,
    clearToastTimer,
  };
}
