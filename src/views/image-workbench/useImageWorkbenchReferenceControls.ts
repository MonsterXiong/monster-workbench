import { computed, nextTick, type ComputedRef, type Ref } from "vue";
import type { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate } from "../../utils";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchReferenceRole,
} from "../../types/image-workbench";
import type { ImageWorkbenchAssetShelfView } from "./imageWorkbenchReview";
import {
  buildImageWorkbenchJobReferenceViews,
  type ImageWorkbenchJobReferenceView,
} from "./imageWorkbenchReferences";
import type { ImageWorkbenchTaskEntryKey } from "./imageWorkbenchTaskLauncher";

const REFERENCE_ROLE_KEYS: ImageWorkbenchReferenceRole[] = ["person", "prop", "scene", "style"];

interface UseImageWorkbenchReferenceControlsOptions {
  activeTaskEntry: Ref<ImageWorkbenchTaskEntryKey>;
  assetShelfDialogOpen: Ref<boolean>;
  assetShelfView: Ref<ImageWorkbenchAssetShelfView>;
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  promptTextareaRef: Ref<HTMLTextAreaElement | null>;
  referenceComposerOpen: Ref<boolean>;
  sceneGuideOpen: Ref<boolean>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  store: ReturnType<typeof useImageWorkbenchStore>;
  t: (key: string) => string;
}

export function useImageWorkbenchReferenceControls(options: UseImageWorkbenchReferenceControlsOptions) {
  const referenceRoleOptions = computed(() =>
    REFERENCE_ROLE_KEYS.map((role) => ({
      role,
      label: referenceRoleLabel(role),
    }))
  );
  const selectedAssetIsReference = computed(() =>
    Boolean(
      options.selectedAsset.value &&
      options.store.referenceAssets.some((asset) => asset.id === options.selectedAsset.value?.id)
    )
  );
  const currentJobReferenceViews = computed<ImageWorkbenchJobReferenceView[]>(() =>
    buildImageWorkbenchJobReferenceViews({
      job: options.currentJob.value,
      currentAssets: options.store.currentAssetCards,
      libraryAssets: options.store.libraryAssetCards,
      referenceRoleLabel,
      resolveDisplayUrl: options.store.resolveReferenceDisplayUrl,
    })
  );

  function referenceRoleKey(index: number): ImageWorkbenchReferenceRole {
    return REFERENCE_ROLE_KEYS[index] || "style";
  }

  function normalizeReferenceRole(role: ImageWorkbenchReferenceRole | undefined, index: number) {
    return role && REFERENCE_ROLE_KEYS.includes(role) ? role : referenceRoleKey(index);
  }

  function referenceRoleLabel(role: ImageWorkbenchReferenceRole | undefined, index = 0) {
    return options.t(`imageWorkbench.reference.roles.${normalizeReferenceRole(role, index)}`);
  }

  function defaultReferenceRoleForTask(
    key: ImageWorkbenchTaskEntryKey = options.activeTaskEntry.value
  ): ImageWorkbenchReferenceRole {
    if (key === "person" || key === "storyboard") {
      return "person";
    }
    if (key === "style") {
      return "style";
    }
    return "scene";
  }

  function applyDefaultReferenceRole(
    keys: string | string[],
    role = defaultReferenceRoleForTask()
  ) {
    const targetKeys = Array.isArray(keys) ? keys : [keys];
    targetKeys.forEach((key) => {
      if (key) {
        options.store.setReferenceRole(key, role);
      }
    });
  }

  function applyDefaultReferenceRoles(role = defaultReferenceRoleForTask()) {
    options.store.referenceItems.forEach((item) => {
      applyDefaultReferenceRole(item.key, role);
    });
  }

  function referencePromptToken(index: number) {
    const role = normalizeReferenceRole(options.store.referenceItems[index]?.role, index);
    return formatTemplate(options.t("imageWorkbench.reference.promptToken"), {
      index: index + 1,
      role: referenceRoleLabel(role, index),
    });
  }

  function handleReferenceRoleChange(key: string, event: Event) {
    const role = (event.target as HTMLSelectElement | null)?.value as ImageWorkbenchReferenceRole;
    options.store.setReferenceRole(key, role);
  }

  function insertReferencePrompt(index: number) {
    const token = referencePromptToken(index);
    const textarea = options.promptTextareaRef.value;
    const current = options.store.prompt;
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const prefix = before && !/[，。；、,.;\s]$/u.test(before) ? `${before}，` : before;
    const suffix = after && !/^[，。；、,.;\s]/u.test(after) ? `，${after}` : after;
    const nextPrompt = `${prefix}${token}${suffix}`;
    const cursor = prefix.length + token.length;
    options.store.prompt = nextPrompt;
    options.store.notice = formatTemplate(options.t("imageWorkbench.reference.insertedNotice"), { token });
    void nextTick(() => {
      options.promptTextareaRef.value?.focus();
      options.promptTextareaRef.value?.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSelectReferenceImageFromComposer() {
    const selectedPath = await options.store.selectReferenceImage();
    if (!selectedPath) {
      return;
    }
    options.store.mode =
      options.activeTaskEntry.value === "person" || options.activeTaskEntry.value === "storyboard"
        ? "person_consistency"
        : "img2img";
    applyDefaultReferenceRole("uploaded");
    options.referenceComposerOpen.value = false;
  }

  function handlePickReferenceFromLibrary() {
    options.assetShelfView.value = "library";
    options.assetShelfDialogOpen.value = true;
    options.sceneGuideOpen.value = false;
    options.store.notice = options.t("imageWorkbench.reference.pickFromLibraryNotice");
  }

  return {
    applyDefaultReferenceRole,
    applyDefaultReferenceRoles,
    currentJobReferenceViews,
    defaultReferenceRoleForTask,
    handlePickReferenceFromLibrary,
    handleReferenceRoleChange,
    handleSelectReferenceImageFromComposer,
    insertReferencePrompt,
    normalizeReferenceRole,
    referenceRoleLabel,
    referenceRoleOptions,
    selectedAssetIsReference,
  };
}
