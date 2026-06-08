import { ref } from 'vue';
import { useSettingStore } from '../stores/settings';
import { getTranslation } from '../locales';

/** 确认弹窗配置选项 */
export interface ConfirmOptions {
  /** 弹窗标题 */
  title: string;
  /** 弹窗消息内容 */
  message: string;
  /** 确认按钮文本，默认"确定" */
  confirmText?: string;
  /** 取消按钮文本，默认"取消" */
  cancelText?: string;
  /** 是否为危险操作（红色警告风格） */
  danger?: boolean;
}

/** 全局弹窗可见状态 */
const visible = ref(false);
/** 全局弹窗配置 */
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
  danger: false,
});

/** Promise resolve 回调句柄 */
let resolvePromise: ((value: boolean) => void) | null = null;

/**
 * 全局确认弹窗 composable（单例模式）
 * 使用 Promise 模式，调用 confirm() 后返回用户选择结果
 */
export function useConfirm() {
  /**
   * 弹出确认框并等待用户操作
   * @param opts - 弹窗配置选项
   * @returns Promise<boolean> - 用户点击确认返回 true，取消返回 false
   */
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    const settingsStore = useSettingStore();
    resolvePromise?.(false);
    resolvePromise = null;

    options.value = {
      confirmText: getTranslation('common.confirm', settingsStore.locale),
      cancelText: getTranslation('common.cancel', settingsStore.locale),
      danger: false,
      ...opts,
    };
    visible.value = true;
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
  }

  /** 处理用户点击确认 */
  function handleConfirm() {
    visible.value = false;
    resolvePromise?.(true);
    resolvePromise = null;
  }

  /** 处理用户点击取消 */
  function handleCancel() {
    visible.value = false;
    resolvePromise?.(false);
    resolvePromise = null;
  }

  return { visible, options, confirm, handleConfirm, handleCancel };
}
