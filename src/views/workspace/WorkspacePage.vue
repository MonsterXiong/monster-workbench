<script setup lang="ts">
import { ref } from "vue";
import {
  TrendingUp,
  FolderDot,
  FileCheck,
  Users2,
  Plus,
  Play,
  Upload,
  BarChart4,
  ChevronRight,
  Sparkles,
  Lightbulb,
  AlertTriangle
} from "lucide-vue-next";

// 选项卡状态
const activeFileTab = ref("all");

// 模拟待办事项
const todos = ref([
  { id: 1, title: "流方方案审议", source: "来自: 市场部 - 李娜", time: "10分钟前", type: "warning", tag: "审" },
  { id: 2, title: "合同签署", source: "来自: 法务部 - 王强", time: "1小时前", type: "primary", tag: "签" },
  { id: 3, title: "预算申请", source: "来自: 产品部 - 陈晨", time: "3小时前", type: "error", tag: "支" },
]);

// 模拟时间轴任务动态
const taskLogs = ref([
  { id: 1, title: "产品需求文档评审", user: "张伟", action: "完成了任务", time: "10分钟前", type: "success" },
  { id: 2, title: "UI设计稿确认", user: "李娜", action: "提交了审批", time: "1小时前", type: "warning" },
  { id: 3, title: "接口开发", user: "王强", action: "更新了进度 60%", time: "3小时前", type: "info" },
  { id: 4, title: "测试用例编写", user: "陈晨", action: "创建了任务", time: "昨天 17:30", type: "neutral" },
]);

// 模拟智能建议
const suggestions = ref([
  { id: 1, title: "流程优化建议", desc: "发现“需求评审”环节平均耗时较长，建议优化流程或增加并行处理", type: "primary", icon: Lightbulb },
  { id: 2, title: "项目风险预警", desc: "根据“数据中台建设”进度滞后，建议关注资源分配与依赖项", type: "warning", icon: AlertTriangle },
  { id: 3, title: "知识推荐", desc: "根据您的工作内容，推荐您阅读《高效需求管理实践指南》", type: "info", icon: Sparkles },
]);

// 模拟最近文件
const files = ref([
  { name: "客户需求规格说明书.docx", type: "Word", ext: "DOCX", time: "张伟 · 10分钟前", color: "bg-blue-500" },
  { name: "项目预算明细表.xlsx", type: "Excel", ext: "XLSX", time: "李娜 · 1小时前", color: "bg-emerald-500" },
  { name: "产品演示文稿.pptx", type: "PPT", ext: "PPTX", time: "陈晨 · 昨天", color: "bg-orange-500" },
  { name: "合同模板.pdf", type: "PDF", ext: "PDF", time: "王强 · 2天前", color: "bg-red-500" },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- 2. 四列指标卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- 指标 1 -->
      <div class="workbench-card indicator-card group/card hover:shadow-blue-500/5">
        <div class="flex items-center gap-3.5">
          <!-- 渐变底框图标 -->
          <div class="indicator-icon-wrapper bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-blue-500/10 group-hover/card:scale-105">
            <FolderDot class="h-5.5 w-5.5" />
          </div>
          <div>
            <span class="indicator-title">项目总数</span>
            <div class="indicator-value">128</div>
            <div class="mt-1.5 text-[10px] font-bold text-blue-500 flex items-center gap-0.5">
              较上月 <span class="font-extrabold">+12.5%</span>
            </div>
          </div>
        </div>
        <!-- SVG 趋势折线图 -->
        <svg class="w-20 h-10 text-primary opacity-90 shrink-0 group-hover/card:scale-105 transition-transform duration-300" viewBox="0 0 100 30" fill="none">
          <path d="M0,25 Q15,15 30,22 T60,8 T90,18 T100,5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M0,25 Q15,15 30,22 T60,8 T90,18 T100,5 L100,30 L0,30 Z" fill="currentColor" fill-opacity="0.03"/>
        </svg>
      </div>

      <!-- 指标 2 -->
      <div class="workbench-card indicator-card group/card hover:shadow-teal-500/5">
        <div class="flex items-center gap-3.5">
          <!-- 渐变底框图标 -->
          <div class="indicator-icon-wrapper bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-teal-500/10 group-hover/card:scale-105">
            <TrendingUp class="h-5.5 w-5.5" />
          </div>
          <div>
            <span class="indicator-title">进行中项目</span>
            <div class="indicator-value">32</div>
            <div class="mt-1.5 text-[10px] font-bold text-teal-600 flex items-center gap-0.5">
              较上月 <span class="font-extrabold">+8.2%</span>
            </div>
          </div>
        </div>
        <!-- SVG 趋势折线图 -->
        <svg class="w-20 h-10 text-teal-500 opacity-90 shrink-0 group-hover/card:scale-105 transition-transform duration-300" viewBox="0 0 100 30" fill="none">
          <path d="M0,20 Q20,25 40,10 T80,18 T100,12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M0,20 Q20,25 40,10 T80,18 T100,12 L100,30 L0,30 Z" fill="currentColor" fill-opacity="0.03"/>
        </svg>
      </div>

      <!-- 指标 3 -->
      <div class="workbench-card indicator-card group/card hover:shadow-violet-500/5">
        <div class="flex items-center gap-3.5">
          <!-- 渐变底框图标 -->
          <div class="indicator-icon-wrapper bg-gradient-to-tr from-violet-600 to-purple-400 shadow-violet-500/10 group-hover/card:scale-105">
            <FileCheck class="h-5.5 w-5.5" />
          </div>
          <div>
            <span class="indicator-title">任务完成率</span>
            <div class="indicator-value">78.4%</div>
            <div class="mt-1.5 text-[10px] font-bold text-violet-500 flex items-center gap-0.5">
              较上月 <span class="font-extrabold">+11.3%</span>
            </div>
          </div>
        </div>
        <!-- SVG 趋势折线图 -->
        <svg class="w-20 h-10 text-violet-500 opacity-90 shrink-0 group-hover/card:scale-105 transition-transform duration-300" viewBox="0 0 100 30" fill="none">
          <path d="M0,25 C30,22 40,5 70,12 T100,8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M0,25 C30,22 40,5 70,12 T100,8 L100,30 L0,30 Z" fill="currentColor" fill-opacity="0.03"/>
        </svg>
      </div>

      <!-- 指标 4 -->
      <div class="workbench-card indicator-card group/card hover:shadow-orange-500/5">
        <div class="flex items-center gap-3.5">
          <!-- 渐变底框图标 -->
          <div class="indicator-icon-wrapper bg-gradient-to-tr from-orange-500 to-amber-400 shadow-orange-500/10 group-hover/card:scale-105">
            <Users2 class="h-5.5 w-5.5" />
          </div>
          <div>
            <span class="indicator-title">团队成员</span>
            <div class="indicator-value">46</div>
            <div class="mt-1.5 text-[10px] font-bold text-orange-500 flex items-center gap-0.5">
              较上月 <span class="font-extrabold">+6.0%</span>
            </div>
          </div>
        </div>
        <!-- SVG 趋势折线图 -->
        <svg class="w-20 h-10 text-orange-500 opacity-90 shrink-0 group-hover/card:scale-105 transition-transform duration-300" viewBox="0 0 100 30" fill="none">
          <path d="M0,28 C20,28 45,10 65,18 T100,5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M0,28 C20,28 45,10 65,18 T100,5 L100,30 L0,30 Z" fill="currentColor" fill-opacity="0.03"/>
        </svg>
      </div>
    </div>

    <!-- 3. 第三排：流程进度(5/12)、项目概览(4/12)、待办事项(3/12) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 流程进度 (5/12) -->
      <div class="workbench-card p-5 lg:col-span-5 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <span class="panel-title">流程进度</span>
          <button class="text-xs text-primary font-bold hover:underline">查看全部</button>
        </div>

        <!-- 5 个节点的步骤指示器 -->
        <div class="flex items-center justify-between px-1 py-4 relative">
          <!-- 节点 1: 需求评审 (已完成) -->
          <div class="flex flex-col items-center gap-1.5 z-10">
            <div class="h-7 w-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px] font-bold shadow-md shadow-primary/20 cursor-pointer hover:scale-105 transition">✓</div>
            <span class="text-xs font-bold text-slate-700">需求评审</span>
            <span class="text-[9px] text-slate-400 font-bold">已完成 05-18</span>
          </div>
          <!-- 线 1 -->
          <div class="flex-1 h-0.5 bg-primary -mx-1 -translate-y-4"></div>

          <!-- 节点 2: 方案设计 (进行中) -->
          <div class="flex flex-col items-center gap-1.5 z-10">
            <div class="h-7 w-7 rounded-full border-2 border-primary bg-white text-primary flex items-center justify-center text-[10px] font-black shadow-sm cursor-pointer relative hover:scale-105 transition">
              <span class="absolute inset-0.5 rounded-full bg-primary/10 animate-ping"></span>
              2
            </div>
            <span class="text-xs font-bold text-primary">方案设计</span>
            <span class="text-[9px] text-primary/80 font-bold bg-primary/10 rounded px-1.5 py-0.5">进行中 05-20</span>
          </div>
          <!-- 线 2 -->
          <div class="flex-1 h-0.5 bg-slate-200 -mx-1 -translate-y-4"></div>

          <!-- 节点 3: 开发实现 -->
          <div class="flex flex-col items-center gap-1.5 z-10">
            <div class="h-7 w-7 rounded-full border border-slate-200 bg-white text-slate-400 flex items-center justify-center text-[10px] font-bold">3</div>
            <span class="text-xs font-medium text-slate-450">开发实现</span>
            <span class="text-[9px] text-slate-400 font-semibold">待开始</span>
          </div>
          <!-- 线 3 -->
          <div class="flex-1 h-0.5 bg-slate-200 -mx-1 -translate-y-4"></div>

          <!-- 节点 4: 测试验收 -->
          <div class="flex flex-col items-center gap-1.5 z-10">
            <div class="h-7 w-7 rounded-full border border-slate-200 bg-white text-slate-400 flex items-center justify-center text-[10px] font-bold">4</div>
            <span class="text-xs font-medium text-slate-450">测试验收</span>
            <span class="text-[9px] text-slate-400 font-semibold">待开始</span>
          </div>
          <!-- 线 4 -->
          <div class="flex-1 h-0.5 bg-slate-200 -mx-1 -translate-y-4"></div>

          <!-- 节点 5: 上线发布 -->
          <div class="flex flex-col items-center gap-1.5 z-10">
            <div class="h-7 w-7 rounded-full border border-slate-200 bg-white text-slate-400 flex items-center justify-center text-[10px] font-bold">5</div>
            <span class="text-xs font-medium text-slate-450">上线发布</span>
            <span class="text-[9px] text-slate-400 font-semibold">待开始</span>
          </div>
        </div>

        <!-- 当前详情盒 -->
        <div class="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div class="flex items-center gap-3">
            <span class="font-bold text-slate-700">当前流程:</span>
            <span class="font-bold text-slate-600">客户管理系统升级</span>
            <span class="rounded-full bg-blue-100 text-blue-600 font-bold px-2 py-0.5 text-[10px]">运行中</span>
          </div>
          <div class="flex items-center gap-4 text-slate-500 font-semibold">
            <span>预计完成时间: 2024-05-28</span>
            <span>负责人: 张伟</span>
          </div>
        </div>
      </div>

      <!-- 项目概览 (4/12) -->
      <div class="workbench-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <span class="panel-title">项目概览</span>
          <div class="dropdown dropdown-end dropdown-bottom">
            <div tabindex="0" role="button" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer">
              本月 <ChevronRight class="h-3 w-3 rotate-90" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-6 py-1">
          <!-- Donut 环形图 -->
          <div class="relative flex-shrink-0">
            <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" stroke-width="2.5" />
              <!-- 进行中 (40%): color #3b82f6 (blue-500) -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="40 60" stroke-dashoffset="100" />
              <!-- 已完成 (35%): color #10b981 (emerald-500) -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="35 65" stroke-dashoffset="60" />
              <!-- 已暂停 (15%): color #8b5cf6 (violet-500) -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="15 85" stroke-dashoffset="25" />
              <!-- 未开始 (10%): color #f59e0b (amber-500) -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10 90" stroke-dashoffset="10" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-[20px] font-black text-slate-800 leading-none animate-pulse">80</span>
              <span class="text-[9px] text-slate-400 font-bold mt-1">项目总和</span>
            </div>
          </div>

          <!-- 右侧图例 -->
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="flex items-center justify-between text-xs font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                <span class="text-slate-500">进行中</span>
              </div>
              <span class="text-slate-800 font-bold">32 (40%)</span>
            </div>
            <div class="flex items-center justify-between text-xs font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span class="text-slate-500">已完成</span>
              </div>
              <span class="text-slate-800 font-bold">28 (35%)</span>
            </div>
            <div class="flex items-center justify-between text-xs font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-violet-500"></span>
                <span class="text-slate-500">已暂停</span>
              </div>
              <span class="text-slate-800 font-bold">12 (15%)</span>
            </div>
            <div class="flex items-center justify-between text-xs font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-amber-500"></span>
                <span class="text-slate-500">未开始</span>
              </div>
              <span class="text-slate-800 font-bold">8 (10%)</span>
            </div>
          </div>
        </div>

        <!-- 健康度 -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-600">项目健康度</span>
            <span class="rounded bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 text-[9px]">良好</span>
          </div>
          <span class="text-[10px] text-slate-400 font-semibold">整体进展顺利，请继续保持</span>
        </div>
      </div>

      <!-- 待办事项 (3/12) -->
      <div class="workbench-card p-5 lg:col-span-3 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <div class="flex items-center gap-1.5">
            <span class="panel-title">待办事项</span>
            <span class="rounded-full bg-error px-1.5 py-0.5 text-[9px] font-black text-error-content shadow-sm shadow-error/10">6</span>
          </div>
          <button class="text-xs text-primary font-bold hover:underline">查看全部</button>
        </div>

        <div class="space-y-3 flex-1 overflow-y-auto">
          <!-- 待办行 -->
          <div
            v-for="todo in todos"
            :key="todo.id"
            class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/30 hover:border-blue-200 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/10 transition-all duration-300 hover:shadow-sm cursor-pointer"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- 类别徽标 -->
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs"
                :class="{
                  'bg-amber-100 text-amber-600': todo.type === 'warning',
                  'bg-blue-100 text-blue-600': todo.type === 'primary',
                  'bg-red-100 text-red-600': todo.type === 'error'
                }"
              >
                {{ todo.tag }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-xs font-bold text-slate-755">{{ todo.title }}</div>
                <div class="mt-0.5 text-[9px] text-slate-400 font-semibold">{{ todo.source }}</div>
              </div>
            </div>
            <span class="text-[9px] font-bold text-slate-400 shrink-0">{{ todo.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 第四排：数据趋势(5/12)、任务动态时间轴(4/12)、智能建议AI(3/12) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 数据趋势 (5/12) -->
      <div class="workbench-card p-5 lg:col-span-5 flex flex-col justify-between gap-4.5">
        <div class="panel-header">
          <span class="panel-title">数据趋势</span>
          <div class="text-[10px] font-bold text-slate-400 flex items-center gap-3">
            <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-primary"></span> 项目数</span>
            <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500"></span> 完成率</span>
          </div>
        </div>

        <!-- 精美 SVG 折线折光图 -->
        <div class="relative w-full h-44 bg-slate-50/20 rounded-2xl border border-slate-100/50 p-2 overflow-hidden flex-1">
          <!-- 网格底线 -->
          <div class="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-40">
            <div class="border-b border-dashed border-slate-200 w-full"></div>
            <div class="border-b border-dashed border-slate-200 w-full"></div>
            <div class="border-b border-dashed border-slate-200 w-full"></div>
            <div class="w-full"></div>
          </div>
          <!-- SVG 折线 -->
          <svg class="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
            <!-- 折线 1 区域填充 -->
            <path d="M0,100 L40,85 L80,95 L120,70 L160,82 L200,60 L240,48 L280,72 L320,50 L360,35 L400,20 L400,120 L0,120 Z" fill="url(#blue-grad-2)" />
            <!-- 折线 1 线条 -->
            <path d="M0,100 L40,85 L80,95 L120,70 L160,82 L200,60 L240,48 L280,72 L320,50 L360,35 L400,20" stroke="#5b6cf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            
            <!-- 折线 2 线条 -->
            <path d="M0,110 L40,95 L80,80 L120,85 L160,65 L200,75 L240,62 L280,50 L320,68 L360,55 L400,30" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            
            <defs>
              <linearGradient id="blue-grad-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5b6cf8" stop-opacity="0.12" />
                <stop offset="100%" stop-color="#5b6cf8" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <!-- 任务动态时间轴 (4/12) -->
      <div class="workbench-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <span class="panel-title">任务动态</span>
          <button class="text-xs text-primary font-bold hover:underline">查看全部</button>
        </div>

        <div class="relative flex-1 py-1 px-1 overflow-y-auto max-h-[190px]">
          <!-- 时间轴连接竖线 -->
          <div class="absolute left-4.5 top-2 bottom-6 w-0.5 bg-slate-100"></div>

          <div class="space-y-4.5">
            <div
              v-for="log in taskLogs"
              :key="log.id"
              class="relative flex gap-4 items-start pl-9"
            >
              <!-- 节点小圆圈 -->
              <div
                class="absolute left-3.5 top-1.5 h-2.5 w-2.5 rounded-full"
                :class="{
                  'bg-emerald-500 ring-4 ring-emerald-100': log.type === 'success',
                  'bg-amber-500 ring-4 ring-amber-100': log.type === 'warning',
                  'bg-blue-500 ring-4 ring-blue-100': log.type === 'info',
                  'bg-slate-400 ring-4 ring-slate-100': log.type === 'neutral'
                }"
              ></div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-slate-755 leading-tight">{{ log.title }}</div>
                <div class="text-[9px] text-slate-400 font-bold mt-0.5">{{ log.user }} · {{ log.action }}</div>
              </div>
              <span class="text-[9px] font-bold text-slate-400 shrink-0">{{ log.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能建议 AI (3/12) -->
      <div class="workbench-card p-5 lg:col-span-3 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <div class="flex items-center gap-1.5">
            <span class="panel-title">
              <Sparkles class="h-4 w-4 text-primary animate-pulse" /> 智能建议
            </span>
            <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary flex items-center gap-0.5 shadow-sm shadow-primary/5">
              AI
            </span>
          </div>
        </div>

        <div class="space-y-3 flex-1">
          <!-- 高对比AI建议炫彩渐变卡片 -->
          <div
            v-for="sug in suggestions"
            :key="sug.title"
            class="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:bg-gradient-to-br hover:from-white hover:to-primary/5 transition-all duration-300 hover:shadow-md hover:shadow-primary/5 cursor-pointer relative overflow-hidden group/sug"
          >
            <!-- 彩色小图标背景 -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white font-bold transition-transform duration-300 group-hover/sug:scale-105"
              :class="{
                'bg-blue-500 shadow-sm shadow-blue-500/10': sug.type === 'primary',
                'bg-amber-500 shadow-sm shadow-amber-500/10': sug.type === 'warning',
                'bg-info shadow-sm shadow-info/10': sug.type === 'info'
              }"
            >
              <component :is="sug.icon" class="h-4 w-4 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 group-hover/sug:text-primary transition-colors">{{ sug.title }}</span>
                <ChevronRight class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover/sug:translate-x-0.5" />
              </div>
              <p class="text-[9px] leading-3.5 text-slate-450 font-semibold mt-1">
                {{ sug.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. 第五排：最近文件(8/12)、快捷操作(4/12) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 最近文件 (8/12) -->
      <div class="workbench-card p-5 lg:col-span-8 flex flex-col justify-between gap-4">
        <div class="panel-header">
          <div class="flex items-center gap-4">
            <span class="panel-title">最近文件</span>
            <!-- 选项卡分类 -->
            <div class="flex border border-slate-200/50 rounded-full p-0.5 bg-slate-50">
              <button
                class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all"
                :class="activeFileTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
                @click="activeFileTab = 'all'"
              >
                全部
              </button>
              <button
                class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all"
                :class="activeFileTab === 'doc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
                @click="activeFileTab = 'doc'"
              >
                文档
              </button>
              <button
                class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all"
                :class="activeFileTab === 'sheet' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
                @click="activeFileTab = 'sheet'"
              >
                表格
              </button>
              <button
                class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all"
                :class="activeFileTab === 'ppt' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
                @click="activeFileTab = 'ppt'"
              >
                演示
              </button>
            </div>
          </div>
          <button class="text-xs text-primary font-bold hover:underline">查看全部</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          <div
            v-for="file in files"
            :key="file.name"
            class="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-blue-250 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/10 transition-all duration-300 hover:shadow-sm cursor-pointer group/file"
          >
            <!-- 文件类型小卡片 -->
            <div :class="`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-[10px] ${file.color} shadow-sm shadow-black/5 transition-transform duration-300 group-hover/file:scale-105`">
              {{ file.ext }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-bold text-slate-700 group-hover/file:text-blue-600 transition-colors">{{ file.name }}</div>
              <div class="mt-0.5 text-[9px] text-slate-450 font-semibold">{{ file.time }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 (4/12) -->
      <div class="workbench-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
        <div class="border-b border-slate-100 pb-3">
          <span class="panel-title">快捷操作</span>
        </div>

        <div class="grid grid-cols-2 gap-3 flex-1 py-1">
          <button class="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/10 text-slate-600 hover:text-primary transition-all duration-200 cursor-pointer shadow-sm shadow-slate-100/5 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-100">
              <Plus class="h-4 w-4" />
            </div>
            <span class="text-xs font-bold">新建项目</span>
          </button>
          <button class="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/10 text-slate-600 hover:text-emerald-600 transition-all duration-200 cursor-pointer shadow-sm shadow-slate-100/5 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100">
              <Play class="h-4 w-4" />
            </div>
            <span class="text-xs font-bold">发起流程</span>
          </button>
          <button class="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/10 text-slate-600 hover:text-amber-600 transition-all duration-200 cursor-pointer shadow-sm shadow-slate-100/5 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-emerald-100">
              <Upload class="h-4 w-4" />
            </div>
            <span class="text-xs font-bold">上传文件</span>
          </button>
          <button class="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/10 text-slate-600 hover:text-violet-600 transition-all duration-200 cursor-pointer shadow-sm shadow-slate-100/5 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500 group-hover:bg-violet-100">
              <BarChart4 class="h-4 w-4" />
            </div>
            <span class="text-xs font-bold">数据看板</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indicator-card {
  @apply p-5 flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60;
}
.indicator-icon-wrapper {
  @apply flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-300;
}
.indicator-title {
  @apply text-xs font-bold text-slate-400;
}
.indicator-value {
  @apply text-2xl font-black text-slate-800 mt-1;
}
.panel-header {
  @apply flex items-center justify-between border-b border-slate-100 pb-3;
}
.panel-title {
  @apply text-sm font-bold text-slate-700 flex items-center gap-1.5;
}
</style>
