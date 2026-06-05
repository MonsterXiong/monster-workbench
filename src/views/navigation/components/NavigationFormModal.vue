<script setup lang="ts">
import { ref } from "vue";
import { Settings2, X, Star, Flame } from "lucide-vue-next";
import { useNavigationStore } from "../../../stores/navigation";
import { useToast } from "../../../composables/useToast";
import AppImageUploader from "../../../components/common/AppImageUploader.vue";

const navigationStore = useNavigationStore();
const { triggerToast } = useToast();

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
  };
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "update:form", form: typeof props.form): void;
  (e: "saved"): void;
}>();

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

// 保存表单
async function handleSave() {
  if (!props.form.title.trim()) {
    triggerToast("网站名称不能为空");
    return;
  }
  if (!props.form.url.trim()) {
    triggerToast("网站网址不能为空");
    return;
  }

  // 补全协议头
  let targetUrl = props.form.url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  let finalCategory = props.form.category;
  if (isCustomCategory.value) {
    const customCat = customCategoryName.value.trim();
    if (!customCat) {
      triggerToast("自定义分类名称不能为空");
      return;
    }
    finalCategory = customCat;
  }

  try {
    if (props.isEdit && props.currentId !== undefined) {
      await navigationStore.update({
        id: props.currentId,
        title: props.form.title.trim(),
        url: targetUrl,
        description: props.form.description.trim(),
        category: finalCategory,
        is_featured: props.form.is_featured,
        is_hot: props.form.is_hot,
        clicks: 0,
        logo_path: props.form.logo_path || undefined,
        bg_path: props.form.bg_path || undefined,
      });
      triggerToast("修改成功！");
    } else {
      await navigationStore.add({
        title: props.form.title.trim(),
        url: targetUrl,
        description: props.form.description.trim(),
        category: finalCategory,
        is_featured: props.form.is_featured,
        is_hot: props.form.is_hot,
        logo_path: props.form.logo_path || undefined,
        bg_path: props.form.bg_path || undefined,
      });
      triggerToast("新增成功！");
    }
    resetCustomCategory();
    emit("update:visible", false);
    emit("saved");
  } catch {
    triggerToast("保存失败");
  }
}

function closeModal() {
  resetCustomCategory();
  emit("update:visible", false);
}
</script>

<template>
  <transition
    enter-active-class="ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      @click.self="closeModal"
    >
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div class="relative w-full max-w-[440px] max-h-[85vh] overflow-y-auto no-scrollbar rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
          <!-- 弹窗头 -->
          <div class="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div class="flex items-center gap-2">
              <Settings2 class="h-4.5 w-4.5 text-blue-600" />
              <h3 class="text-xs font-black text-slate-800 tracking-wide">
                {{ isEdit ? '修改导航配置' : '录入网址导航' }}
              </h3>
            </div>
            <button
              class="text-slate-400 hover:text-slate-600 cursor-pointer"
              @click="closeModal"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- 表单内容 -->
          <div class="mt-4.5 space-y-4">
            <!-- 网站名称 -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-bold text-slate-550 flex items-center gap-1">
                网站名称 <span class="text-error font-extrabold">*</span>
              </label>
              <input
                :value="form.title"
                type="text"
                placeholder="如: 百度一下"
                class="workbench-input h-9 text-xs px-3"
                @input="emit('update:form', { ...form, title: ($event.target as HTMLInputElement).value })"
              />
            </div>

            <!-- 网址 -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-bold text-slate-550 flex items-center gap-1">
                网站网址 <span class="text-error font-extrabold">*</span>
              </label>
              <input
                :value="form.url"
                type="text"
                placeholder="如: www.baidu.com"
                class="workbench-input h-9 text-xs px-3"
                @input="emit('update:form', { ...form, url: ($event.target as HTMLInputElement).value })"
              />
            </div>

            <!-- 分类下拉 -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-bold text-slate-550 flex items-center justify-between">
                <span>所属分类</span>
                <button
                  type="button"
                  class="text-[10px] text-blue-600 hover:text-blue-700 font-bold transition flex items-center gap-0.5 cursor-pointer"
                  @click="toggleCustomCategory"
                >
                  {{ isCustomCategory ? '选择已有分类' : '+ 新增分类' }}
                </button>
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
                  <select
                    v-if="!isCustomCategory"
                    key="select-cat"
                    :value="form.category"
                    class="workbench-select flex-1 h-9 text-xs w-full"
                    @change="emit('update:form', { ...form, category: ($event.target as HTMLSelectElement).value })"
                  >
                    <option v-for="cat in navigationStore.categories" :key="cat" :value="cat">
                      {{ cat }}
                    </option>
                  </select>
                  <input
                    v-else
                    key="input-cat"
                    v-model="customCategoryName"
                    type="text"
                    placeholder="请输入新分类名称..."
                    class="workbench-input flex-1 h-9 text-xs px-3 w-full"
                  />
                </transition>
              </div>
            </div>

            <!-- 标志 -->
            <div class="grid grid-cols-2 gap-4 pt-1">
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  :checked="form.is_featured === 1"
                  type="checkbox"
                  class="checkbox cursor-pointer"
                  @change="emit('update:form', { ...form, is_featured: form.is_featured === 1 ? 0 : 1 })"
                />
                <span class="flex items-center gap-1">
                  <Star class="h-3.5 w-3.5 text-blue-500" />
                  设为精选
                </span>
              </label>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  :checked="form.is_hot === 1"
                  type="checkbox"
                  class="checkbox cursor-pointer"
                  @change="emit('update:form', { ...form, is_hot: form.is_hot === 1 ? 0 : 1 })"
                />
                <span class="flex items-center gap-1">
                  <Flame class="h-3.5 w-3.5 text-amber-500" />
                  设为热门
                </span>
              </label>
            </div>

            <!-- Logo 和封面上传区 -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Logo 上传 -->
              <AppImageUploader
                :model-value="form.logo_path"
                label="网站 Logo"
                aspect-ratio="contain"
                @update:model-value="emit('update:form', { ...form, logo_path: $event })"
              />

              <!-- 背景封面上传 -->
              <AppImageUploader
                :model-value="form.bg_path"
                label="背景封面图"
                aspect-ratio="cover"
                @update:model-value="emit('update:form', { ...form, bg_path: $event })"
              />
            </div>

            <!-- 网站描述 -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-bold text-slate-550">描述说明</label>
              <textarea
                :value="form.description"
                rows="3"
                placeholder="可简述该网站的常用能力或快捷功能说明..."
                class="workbench-textarea p-3 text-xs leading-5 resize-none h-20"
                @input="emit('update:form', { ...form, description: ($event.target as HTMLTextAreaElement).value })"
              ></textarea>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="workbench-btn border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 h-9 px-4 text-xs font-bold"
              @click="closeModal"
            >
              取消
            </button>
            <button
              type="button"
              class="workbench-btn bg-primary text-primary-content text-xs font-bold h-9 px-4 shadow-sm shadow-primary/10 cursor-pointer"
              @click="handleSave"
            >
              保存并确定
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
