<script setup lang="ts">
import { ref, computed } from "vue";
import { Star, Flame, WandSparkles } from "lucide-vue-next";
import { useNavigationStore } from "../../../stores/navigation";
import { useToast } from "../../../composables/useToast";
import AppImageUploader from "../../../components/common/AppImageUploader.vue";
import { useI18n } from "../../../composables/useI18n";
import { applyObjectPatch, ensureHttpProtocol, getEventTargetValue, isBlank, toTrimmedString } from "../../../utils";

const navigationStore = useNavigationStore();
const { triggerToast } = useToast();
const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  isEdit: boolean;
  currentId?: number;
  form: {
    title: string;
    url: string;
    description: string;
    category: string;
    is_featured: number;
    is_hot: number;
    logo_path: string;
    bg_path: string;
    tags: string[];
  };
}>();

type NavigationForm = typeof props.form;

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "update:form", form: typeof props.form): void;
  (e: "saved"): void;
}>();

function patchForm(patch: Partial<NavigationForm>) {
  emit("update:form", applyObjectPatch(props.form, patch));
}

const tagsText = computed({
  get: () => (props.form.tags || []).join(", "),
  set: (value: string) => patchForm({ tags: navigationStore.parseTagsText(value) }),
});

function applyLocalSuggestion() {
  if (isBlank(props.form.url)) {
    triggerToast(t('navigation.urlRequired'));
    return;
  }
  const suggestion = navigationStore.suggestFromUrl(ensureHttpProtocol(props.form.url));
  const canApplyCategory =
    !props.isEdit &&
    (!props.form.category || props.form.category === "Utility" || props.form.category === navigationStore.category);
  patchForm({
    title: isBlank(props.form.title) ? suggestion.title : props.form.title,
    description: isBlank(props.form.description) ? suggestion.description : props.form.description,
    category: canApplyCategory ? suggestion.category : props.form.category,
    tags: props.form.tags?.length ? props.form.tags : suggestion.tags,
  });
  triggerToast(t('navigation.suggestionApplied'), "success");
}

// 自定义分类切换
const isCustomCategory = ref(false);
const customCategoryName = ref("");

function toggleCustomCategory() {
  isCustomCategory.value = !isCustomCategory.value;
  if (!isCustomCategory.value) {
    customCategoryName.value = "";
  }
}

// 重置自定义分类状态
function resetCustomCategory() {
  isCustomCategory.value = false;
  customCategoryName.value = "";
}

// 将分类列表转换为 BaseSelect 支持的格式
const categoryOptions = computed(() => {
  return navigationStore.categories.map(cat => {
    const translationKey = `navigation.categories.${cat}`;
    const translated = t(translationKey);
    return {
      label: translated === translationKey ? cat : translated,
      value: cat
    };
  });
});

// 保存表单
async function handleSave() {
  if (isBlank(props.form.title)) {
    triggerToast(t('navigation.nameRequired'));
    return;
  }
  if (isBlank(props.form.url)) {
    triggerToast(t('navigation.urlRequired'));
    return;
  }

  const targetUrl = ensureHttpProtocol(props.form.url);

  let finalCategory = props.form.category;
  if (isCustomCategory.value) {
    const customCat = toTrimmedString(customCategoryName.value);
    if (!customCat) {
      triggerToast(t('navigation.customCategoryRequired'));
      return;
    }
    finalCategory = customCat;
  }

  try {
    if (props.isEdit && props.currentId !== undefined) {
      await navigationStore.update({
        id: props.currentId,
        title: toTrimmedString(props.form.title),
        url: targetUrl,
        description: toTrimmedString(props.form.description),
        category: finalCategory,
        is_featured: props.form.is_featured,
        is_hot: props.form.is_hot,
        clicks: 0,
        logo_path: props.form.logo_path || undefined,
        bg_path: props.form.bg_path || undefined,
        tags: props.form.tags || [],
      });
      triggerToast(t('navigation.modifySuccess'), "success");
    } else {
      await navigationStore.add({
        title: toTrimmedString(props.form.title),
        url: targetUrl,
        description: toTrimmedString(props.form.description),
        category: finalCategory,
        is_featured: props.form.is_featured,
        is_hot: props.form.is_hot,
        logo_path: props.form.logo_path || undefined,
        bg_path: props.form.bg_path || undefined,
        tags: props.form.tags || [],
      });
      triggerToast(t('navigation.addSuccess'), "success");
    }
    resetCustomCategory();
    emit("update:visible", false);
    emit("saved");
  } catch {
    triggerToast(t('navigation.saveFailed'), "error");
  }
}

const showModalValue = computed({
  get: () => props.visible,
  set: (val: boolean) => {
    if (!val) {
      resetCustomCategory();
    }
    emit("update:visible", val);
  }
});

function closeModal() {
  resetCustomCategory();
  emit("update:visible", false);
}
</script>

<template>
  <BaseDialog
    v-model="showModalValue"
    :title="isEdit ? t('navigation.editTitle') : t('navigation.addTitle')"
    width="520px"
  >
    <!-- 表单内容 -->
    <div class="space-y-4">
      <!-- 网站名称 -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          {{ t('navigation.nameLabel') }} <span class="text-error font-extrabold">*</span>
        </label>
        <BaseInput
          :model-value="form.title"
          :placeholder="t('navigation.namePlaceholder')"
          size="sm"
          @update:model-value="patchForm({ title: String($event) })"
        />
      </div>

      <!-- 网址 -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          {{ t('navigation.urlLabel') }} <span class="text-error font-extrabold">*</span>
        </label>
        <div class="flex items-center gap-2">
          <BaseInput
            :model-value="form.url"
            :placeholder="t('navigation.urlPlaceholder')"
            size="sm"
            class="min-w-0 flex-1"
            @update:model-value="patchForm({ url: String($event) })"
          />
          <BaseButton
            type="neutral"
            outline
            size="sm"
            :title="t('navigation.applySuggestion')"
            @click="applyLocalSuggestion"
          >
            <template #icon><WandSparkles class="h-3.5 w-3.5" /></template>
          </BaseButton>
        </div>
      </div>

      <!-- 分类下拉 -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center justify-between select-none">
          <span>{{ t('navigation.categoryLabel') }}</span>
          <BaseButton
            type="link"
            size="xs"
            class="font-bold !p-0 h-auto min-h-0"
            @click="toggleCustomCategory"
          >
            {{ isCustomCategory ? t('navigation.selectCategory') : t('navigation.addCategory') }}
          </BaseButton>
        </label>
        <div class="flex items-center gap-2 w-full min-h-[36px] relative">
          <transition
            name="fade-slide"
            mode="out-in"
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <BaseSelect
              v-if="!isCustomCategory"
              key="select-cat"
              :model-value="form.category"
              :options="categoryOptions"
              size="sm"
              class="flex-1 w-full"
              @update:model-value="patchForm({ category: String($event) })"
            />
            <BaseInput
              v-else
              key="input-cat"
              v-model="customCategoryName"
              :placeholder="t('navigation.customCategoryPlaceholder')"
              size="sm"
              class="flex-1 w-full"
            />
          </transition>
        </div>
      </div>

      <!-- 标志 -->
      <div class="grid grid-cols-2 gap-4 pt-1 select-none">
        <label class="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer">
          <input
            :checked="form.is_featured === 1"
            type="checkbox"
            class="checkbox cursor-pointer"
            @change="patchForm({ is_featured: form.is_featured === 1 ? 0 : 1 })"
          />
          <span class="flex items-center gap-1">
            <Star class="h-3.5 w-3.5 text-blue-500" />
            {{ t('navigation.setFeatured') }}
          </span>
        </label>
        <label class="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer">
          <input
            :checked="form.is_hot === 1"
            type="checkbox"
            class="checkbox cursor-pointer"
            @change="patchForm({ is_hot: form.is_hot === 1 ? 0 : 1 })"
          />
          <span class="flex items-center gap-1">
            <Flame class="h-3.5 w-3.5 text-amber-500" />
            {{ t('navigation.setCommon') }}
          </span>
        </label>
      </div>

      <!-- 标签 -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">{{ t('navigation.tagsLabel') }}</label>
        <BaseInput
          v-model="tagsText"
          :placeholder="t('navigation.tagsPlaceholder')"
          size="sm"
        />
      </div>

      <!-- Logo 和封面上传区 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Logo 上传 -->
        <AppImageUploader
          :model-value="form.logo_path"
          :label="t('navigation.logoLabel')"
          aspect-ratio="contain"
          @update:model-value="patchForm({ logo_path: $event })"
        />

        <!-- 背景封面上传 -->
        <AppImageUploader
          :model-value="form.bg_path"
          :label="t('navigation.bgLabel')"
          aspect-ratio="cover"
          @update:model-value="patchForm({ bg_path: $event })"
        />
      </div>

      <!-- 网站描述 -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-extrabold text-base-content/60">{{ t('navigation.descLabel') }}</label>
        <textarea
          :value="form.description"
          rows="3"
          :placeholder="t('navigation.descPlaceholder')"
          class="workbench-textarea p-3 text-xs leading-5 resize-none h-20"
          @input="patchForm({ description: getEventTargetValue($event) })"
        ></textarea>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <BaseButton
        type="neutral"
        outline
        size="sm"
        @click="closeModal"
      >
        {{ t('common.cancel') }}
      </BaseButton>
      <BaseButton
        type="primary"
        size="sm"
        @click="handleSave"
      >
        {{ t('navigation.saveBtn') }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
