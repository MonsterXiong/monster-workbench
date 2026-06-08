import { ref } from "vue";

export function useDialog() {
  const visible = ref(false);

  const show = () => {
    visible.value = true;
  };

  const hide = () => {
    visible.value = false;
  };

  return {
    visible,
    show,
    hide,
  };
}
