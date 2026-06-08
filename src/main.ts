import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import { router } from "./router";
import { ErrorHandler } from "./services/error-handler";
import { useSettingStore } from "./stores/settings";
import { useTaskStore } from "./stores/task";

// 引入高频基础通用组件
import BaseIcon from "./components/common/BaseIcon.vue";
import BaseButton from "./components/common/BaseButton.vue";
import BaseInput from "./components/common/BaseInput.vue";
import BaseSelect from "./components/common/BaseSelect.vue";
import BaseDialog from "./components/common/BaseDialog.vue";
import BaseDrawer from "./components/common/BaseDrawer.vue";
import BaseForm from "./components/common/BaseForm.vue";
import BaseFormItem from "./components/common/BaseFormItem.vue";
import BaseEmpty from "./components/common/BaseEmpty.vue";
import BaseLoading from "./components/common/BaseLoading.vue";
import BaseError from "./components/common/BaseError.vue";
import BaseMessage from "./components/common/BaseMessage.vue";
import BaseToast from "./components/common/BaseToast.vue";
import BaseTab from "./components/common/BaseTab.vue";
import BaseTable from "./components/common/BaseTable.vue";
import BaseTree from "./components/common/BaseTree.vue";
import BaseList from "./components/common/BaseList.vue";
import BaseTooltip from "./components/common/BaseTooltip.vue";
import BaseUpload from "./components/common/BaseUpload.vue";
import BaseResizablePanels from "./components/common/BaseResizablePanels.vue";
import BaseThreeColumnLayout from "./components/common/BaseThreeColumnLayout.vue";
import BaseBadge from "./components/common/BaseBadge.vue";
import BasePanel from "./components/common/BasePanel.vue";
import BaseSwitch from "./components/common/BaseSwitch.vue";
import BaseCheckbox from "./components/common/BaseCheckbox.vue";
import BaseRadioGroup from "./components/common/BaseRadioGroup.vue";
import BaseSegmented from "./components/common/BaseSegmented.vue";
import BaseToolbar from "./components/common/BaseToolbar.vue";
import BaseSearchInput from "./components/common/BaseSearchInput.vue";
import BaseStatusDot from "./components/common/BaseStatusDot.vue";
import BaseKeyValueList from "./components/common/BaseKeyValueList.vue";
import BaseActionMenu from "./components/common/BaseActionMenu.vue";
import BasePagination from "./components/common/BasePagination.vue";
import BaseStepper from "./components/common/BaseStepper.vue";
import BaseCopyButton from "./components/common/BaseCopyButton.vue";
import BaseBreadcrumb from "./components/common/BaseBreadcrumb.vue";
import BaseAlert from "./components/common/BaseAlert.vue";
import BaseProgress from "./components/common/BaseProgress.vue";
import BaseTextarea from "./components/common/BaseTextarea.vue";
import BaseNumberInput from "./components/common/BaseNumberInput.vue";
import BaseTagInput from "./components/common/BaseTagInput.vue";
import BaseStatCard from "./components/common/BaseStatCard.vue";
import BaseTimeline from "./components/common/BaseTimeline.vue";
import BaseCodeBlock from "./components/common/BaseCodeBlock.vue";
import BaseSectionHeader from "./components/common/BaseSectionHeader.vue";
import BaseAvatar from "./components/common/BaseAvatar.vue";
import BaseSkeletonCard from "./components/common/BaseSkeletonCard.vue";
import BaseDivider from "./components/common/BaseDivider.vue";
import BaseInfoCard from "./components/common/BaseInfoCard.vue";
import BaseFieldGroup from "./components/common/BaseFieldGroup.vue";
import BaseDescriptionList from "./components/common/BaseDescriptionList.vue";
import BaseCommandPalette from "./components/common/BaseCommandPalette.vue";
import BaseFilterBar from "./components/common/BaseFilterBar.vue";
import BaseDateRange from "./components/common/BaseDateRange.vue";
import BaseSlider from "./components/common/BaseSlider.vue";
import BaseAccordion from "./components/common/BaseAccordion.vue";
import BaseSelectionBar from "./components/common/BaseSelectionBar.vue";
import BaseTableToolbar from "./components/common/BaseTableToolbar.vue";
import BaseFormActions from "./components/common/BaseFormActions.vue";
import AppPathSelector from "./components/common/AppPathSelector.vue";
import AppImageUploader from "./components/common/AppImageUploader.vue";
import BaseDataState from "./components/common/BaseDataState.vue";
import BasePageHeader from "./components/common/BasePageHeader.vue";
import BaseConfirmAction from "./components/common/BaseConfirmAction.vue";
import BaseDataTable from "./components/common/BaseDataTable.vue";
import BasePageShell from "./components/common/BasePageShell.vue";
import BaseDetailCard from "./components/common/BaseDetailCard.vue";

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  // 注册全局基础组件
  const globalComponents = {
    BaseIcon,
    BaseButton,
    BaseInput,
    BaseSelect,
    BaseDialog,
    BaseDrawer,
    BaseForm,
    BaseFormItem,
    BaseEmpty,
    BaseLoading,
    BaseError,
    BaseMessage,
    BaseToast,
    BaseTab,
    BaseTable,
    BaseTree,
    BaseList,
    BaseTooltip,
    BaseUpload,
    BaseResizablePanels,
    BaseThreeColumnLayout,
    BaseBadge,
    BasePanel,
    BaseSwitch,
    BaseCheckbox,
    BaseRadioGroup,
    BaseSegmented,
    BaseToolbar,
    BaseSearchInput,
    BaseStatusDot,
    BaseKeyValueList,
    BaseActionMenu,
    BasePagination,
    BaseStepper,
    BaseCopyButton,
    BaseBreadcrumb,
    BaseAlert,
    BaseProgress,
    BaseTextarea,
    BaseNumberInput,
    BaseTagInput,
    BaseStatCard,
    BaseTimeline,
    BaseCodeBlock,
    BaseSectionHeader,
    BaseAvatar,
    BaseSkeletonCard,
    BaseDivider,
    BaseInfoCard,
    BaseFieldGroup,
    BaseDescriptionList,
    BaseCommandPalette,
    BaseFilterBar,
    BaseDateRange,
    BaseSlider,
    BaseAccordion,
    BaseSelectionBar,
    BaseTableToolbar,
    BaseFormActions,
    AppPathSelector,
    AppImageUploader,
    BaseDataState,
    BasePageHeader,
    BaseConfirmAction,
    BaseDataTable,
    BasePageShell,
    BaseDetailCard,
  };
  Object.entries(globalComponents).forEach(([name, comp]) => {
    app.component(name, comp);
  });

  // 1. 初始化全局异常拦截
  ErrorHandler.init(app);

  // 2. 初始化偏好与主题 (本地/底座自愈)
  const settingsStore = useSettingStore();
  await settingsStore.initSettings();

  // 3. 开启底座长任务通知侦听
  const taskStore = useTaskStore();
  await taskStore.initTaskListener();

  // 4. 挂载
  app.mount("#app");
}

bootstrap().catch((err) => {
  console.error("[ERR_APP_BOOTSTRAP] 应用启动失败:", err);
});
