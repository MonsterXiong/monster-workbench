import { ref } from "vue";
import { clearTimeoutHandle, clearTimeoutMap, createTimeout, createTimestampId, findIndexByValue, type TimeoutHandle } from "../utils";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageItem {
  id: string;
  msg: string;
  type: MessageType;
  duration: number;
  title?: string;
  description?: string;
  icon?: string;
  closable: boolean;
  actionText?: string;
  onAction?: () => void;
  showProgress: boolean;
  wrap: boolean;
}

export interface MessageOptions {
  duration?: number;
  title?: string;
  description?: string;
  icon?: string;
  closable?: boolean;
  actionText?: string;
  onAction?: () => void;
  showProgress?: boolean;
  wrap?: boolean;
}

/** 全局 Message 队列状态（单例） */
const messages = ref<MessageItem[]>([]);
const timers = new Map<string, TimeoutHandle>();

/**
 * 全局 Message 提示服务的 composable
 */
export function useMessage() {
  /**
   * 触发一条顶部 Message 提示
   * @param msg 提示消息内容
   * @param type 提示类型，默认为 'success'
   * @param duration 持续显示时间（毫秒），默认为 3000ms
   */
  function triggerMessage(msg: string, type: MessageType = "success", durationOrOptions: number | MessageOptions = 3000) {
    const options = typeof durationOrOptions === "number" ? { duration: durationOrOptions } : durationOrOptions;
    const duration = options.duration ?? 3000;
    const id = createTimestampId("");
    const item: MessageItem = {
      id,
      msg,
      type,
      duration,
      title: options.title,
      description: options.description,
      icon: options.icon,
      closable: options.closable ?? true,
      actionText: options.actionText,
      onAction: options.onAction,
      showProgress: options.showProgress ?? duration > 0,
      wrap: options.wrap ?? false,
    };
    messages.value.push(item);

    if (duration > 0) {
      const timer = createTimeout(() => {
        removeMessage(id);
      }, duration);
      timers.set(id, timer);
    }
  }

  /**
   * 主动或到期移除指定的 Message
   * @param id 消息 ID
   */
  function removeMessage(id: string) {
    const timer = timers.get(id);
    clearTimeoutHandle(timer);
    timers.delete(id);

    const index = findIndexByValue(messages.value, (message) => message.id, id);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  }

  function clearMessages() {
    clearTimeoutMap(timers);
    messages.value = [];
  }

  return {
    messages,
    triggerMessage,
    removeMessage,
    clearMessages,
  };
}
