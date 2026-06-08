/// <reference types="vite/client" />

import { DefineComponent } from "vue";

declare module "*.vue" {
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    BaseIcon: typeof import('./components/common/BaseIcon.vue').default;
    BaseButton: typeof import('./components/common/BaseButton.vue').default;
    BaseInput: typeof import('./components/common/BaseInput.vue').default;
    BaseSelect: typeof import('./components/common/BaseSelect.vue').default;
    BaseDialog: typeof import('./components/common/BaseDialog.vue').default;
    BaseDrawer: typeof import('./components/common/BaseDrawer.vue').default;
    BaseForm: typeof import('./components/common/BaseForm.vue').default;
    BaseFormItem: typeof import('./components/common/BaseFormItem.vue').default;
    BaseEmpty: typeof import('./components/common/BaseEmpty.vue').default;
    BaseLoading: typeof import('./components/common/BaseLoading.vue').default;
    BaseError: typeof import('./components/common/BaseError.vue').default;
    BaseMessage: typeof import('./components/common/BaseMessage.vue').default;
    BaseToast: typeof import('./components/common/BaseToast.vue').default;
    BaseTab: typeof import('./components/common/BaseTab.vue').default;
    BaseTable: typeof import('./components/common/BaseTable.vue').default;
    BaseTree: typeof import('./components/common/BaseTree.vue').default;
    BaseList: typeof import('./components/common/BaseList.vue').default;
    BaseTooltip: typeof import('./components/common/BaseTooltip.vue').default;
    BaseUpload: typeof import('./components/common/BaseUpload.vue').default;
    BaseResizablePanels: typeof import('./components/common/BaseResizablePanels.vue').default;
    BaseThreeColumnLayout: typeof import('./components/common/BaseThreeColumnLayout.vue').default;
    BaseBadge: typeof import('./components/common/BaseBadge.vue').default;
    BasePanel: typeof import('./components/common/BasePanel.vue').default;
    BaseSwitch: typeof import('./components/common/BaseSwitch.vue').default;
    BaseCheckbox: typeof import('./components/common/BaseCheckbox.vue').default;
    BaseRadioGroup: typeof import('./components/common/BaseRadioGroup.vue').default;
    BaseSegmented: typeof import('./components/common/BaseSegmented.vue').default;
    BaseToolbar: typeof import('./components/common/BaseToolbar.vue').default;
    BaseSearchInput: typeof import('./components/common/BaseSearchInput.vue').default;
    BaseStatusDot: typeof import('./components/common/BaseStatusDot.vue').default;
    BaseKeyValueList: typeof import('./components/common/BaseKeyValueList.vue').default;
    BaseActionMenu: typeof import('./components/common/BaseActionMenu.vue').default;
    BasePagination: typeof import('./components/common/BasePagination.vue').default;
    BaseStepper: typeof import('./components/common/BaseStepper.vue').default;
    BaseCopyButton: typeof import('./components/common/BaseCopyButton.vue').default;
    BaseBreadcrumb: typeof import('./components/common/BaseBreadcrumb.vue').default;
    BaseAlert: typeof import('./components/common/BaseAlert.vue').default;
    BaseProgress: typeof import('./components/common/BaseProgress.vue').default;
    BaseTextarea: typeof import('./components/common/BaseTextarea.vue').default;
    BaseNumberInput: typeof import('./components/common/BaseNumberInput.vue').default;
    BaseTagInput: typeof import('./components/common/BaseTagInput.vue').default;
    BaseStatCard: typeof import('./components/common/BaseStatCard.vue').default;
    BaseTimeline: typeof import('./components/common/BaseTimeline.vue').default;
    BaseCodeBlock: typeof import('./components/common/BaseCodeBlock.vue').default;
    BaseSectionHeader: typeof import('./components/common/BaseSectionHeader.vue').default;
    BaseAvatar: typeof import('./components/common/BaseAvatar.vue').default;
    BaseSkeletonCard: typeof import('./components/common/BaseSkeletonCard.vue').default;
    BaseDivider: typeof import('./components/common/BaseDivider.vue').default;
    BaseInfoCard: typeof import('./components/common/BaseInfoCard.vue').default;
    BaseFieldGroup: typeof import('./components/common/BaseFieldGroup.vue').default;
    BaseDescriptionList: typeof import('./components/common/BaseDescriptionList.vue').default;
    BaseCommandPalette: typeof import('./components/common/BaseCommandPalette.vue').default;
    BaseFilterBar: typeof import('./components/common/BaseFilterBar.vue').default;
    BaseDateRange: typeof import('./components/common/BaseDateRange.vue').default;
    BaseSlider: typeof import('./components/common/BaseSlider.vue').default;
    BaseAccordion: typeof import('./components/common/BaseAccordion.vue').default;
    BaseSelectionBar: typeof import('./components/common/BaseSelectionBar.vue').default;
    BaseTableToolbar: typeof import('./components/common/BaseTableToolbar.vue').default;
    BaseFormActions: typeof import('./components/common/BaseFormActions.vue').default;
    AppPathSelector: typeof import('./components/common/AppPathSelector.vue').default;
    AppImageUploader: typeof import('./components/common/AppImageUploader.vue').default;
    BaseDataState: typeof import('./components/common/BaseDataState.vue').default;
    BasePageHeader: typeof import('./components/common/BasePageHeader.vue').default;
    BaseConfirmAction: typeof import('./components/common/BaseConfirmAction.vue').default;
    BaseDataTable: typeof import('./components/common/BaseDataTable.vue').default;
    BasePageShell: typeof import('./components/common/BasePageShell.vue').default;
    BaseDetailCard: typeof import('./components/common/BaseDetailCard.vue').default;
  }
}
