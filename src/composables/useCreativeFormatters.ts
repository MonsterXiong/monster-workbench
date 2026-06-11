

export function useCreativeFormatters() {
  const statusLabel = (status?: string | null) => {
    if (!status) return "-";
    const statusMap: Record<string, string> = {
      idle: "空闲",
      active: "活跃",
      archived: "已归档",
      running: "运行中",
      queued: "排队中",
      succeeded: "成功",
      completed: "已完成",
      failed: "失败",
      cancelled: "已取消",
      manual_approval: "待人工确认",
      ready: "已就绪",
      paused: "已暂停",
      stopped: "已停止",
    };
    return statusMap[status] ?? status;
  };

  const userFacingTaskType = (taskType?: string | null) => {
    const typeMap: Record<string, string> = {
      "image_prompt.generate": "提示词生成",
      "generate_image_prompt": "提示词生成",
      "review.asset_quality": "资产审查",
      "review_asset_quality": "资产审查",
      "revise_asset_quality": "返工任务",
      "review.revision": "返工任务",
      "domain.assets.draft": "资产草稿",
      "goal.character.stub": "角色任务",
      "goal.scene.stub": "场景任务",
      "goal.prop.stub": "道具任务",
      "goal.review.stub": "审查任务",
      "goal.merge_review_stub": "合并审查",
      "demo.image.mock": "模拟验证",
      "demo.image.prompt": "提示词生成",
      "demo.image.generate": "图片生成",
    };
    if (!taskType) return "-";
    return typeMap[taskType] ?? taskType.replaceAll(".", " / ").replaceAll("_", " ");
  };

  const userFacingAssetType = (assetType?: string | null) => {
    const typeMap: Record<string, string> = {
      image_prompt: "图片提示词",
      review_result: "审查结果",
      character: "角色",
      scene: "场景",
      prop: "道具",
      storyboard: "分镜",
      novel_chapter: "小说章节",
      script_scene: "剧本场次",
      bible: "设定集",
      demo_image_prompt: "批量提示词",
      demo_image: "生成图片",
    };
    if (!assetType) return "-";
    return typeMap[assetType] ?? assetType.replaceAll("_", " ");
  };

  const userFacingBatchType = (batchType?: string | null) => {
    const typeMap: Record<string, string> = {
      "demo.image.mock": "模拟验证",
      "demo.image.prompt": "提示词生成",
      "demo.image.generate": "图片生成",
    };
    if (!batchType) return "-";
    return typeMap[batchType] ?? batchType.replaceAll(".", " / ");
  };

  const userFacingLinkType = (linkType?: string | null) => {
    const typeMap: Record<string, string> = {
      uses_character: "使用角色",
      uses_scene: "使用场景",
      uses_prop: "使用道具",
      part_of: "归属设定集",
      derived_from: "来源资产",
    };
    if (!linkType) return "-";
    return typeMap[linkType] ?? linkType.replaceAll("_", " ");
  };

  const userFacingApproval = (approval?: string | null) => {
    const approvalMap: Record<string, string> = {
      approved: "已通过",
      rejected: "未通过",
      manual_approval: "待人工确认",
      pending: "待处理",
    };
    if (!approval) return "-";
    return approvalMap[approval] ?? approval;
  };

  const userFacingRoleKey = (roleKey?: string | null) => {
    const roleMap: Record<string, string> = {
      character: "角色",
      scene: "场景",
      prop: "道具",
      review: "审查",
    };
    if (!roleKey) return "-";
    return roleMap[roleKey] ?? roleKey;
  };

  const userFacingEventMessage = (message?: string | null) => {
    if (!message) return "";
    const trimmed = message.trim();
    if (!trimmed) return "";
    const normalized = trimmed.toLowerCase();
    if (normalized.startsWith("task created:")) {
      return `已创建${userFacingTaskType(trimmed.split(":").slice(1).join(":").trim())}`;
    }
    if (normalized.startsWith("status changed to")) {
      return `状态已更新为${statusLabel(trimmed.replace(/^status changed to\s*/i, ""))}`;
    }
    const messageMap: Record<string, string> = {
      "workflow queued": "任务已加入队列",
      "generate_image_prompt workflow started": "提示词生成已开始",
      "generate_image_prompt workflow completed": "提示词生成已完成",
      "review task queued": "审查已加入队列",
      "review passed": "审查已通过",
      "manual approval required": "需要人工确认",
      "batch job created": "批量任务已创建",
      "mock worker scheduled retry": "模拟任务等待重试",
      "prompt worker scheduled retry": "提示词任务等待重试",
      "prompt worker finished with failure": "提示词任务失败",
      "prompt worker finished successfully": "提示词任务完成",
      "image worker scheduled retry": "图片任务等待重试",
      "image worker finished with failure": "图片任务失败",
      "image worker finished successfully": "图片任务完成",
    };
    if (messageMap[normalized]) return messageMap[normalized];
    if (normalized.startsWith("prompt asset created")) return "提示词资产已保存";
    if (normalized.startsWith("review asset created")) return "审查结果已保存";
    if (normalized.startsWith("batch task queued")) return "批量子任务已排队";
    if (normalized.includes("sidecar")) return "执行器已就绪";
    if (/^[\w\s:./#-]+$/.test(trimmed)) return "任务已更新";
    return trimmed.replaceAll("Mock", "模拟").replaceAll("Provider", "服务");
  };

  const safeParseJson = (raw: string) => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const compactTimelineDescription = (raw?: string | null) => {
    if (!raw) return "-";
    const text = raw.trim();
    if (!text) return "-";
    const parsed = safeParseJson(text);
    if (parsed) {
      const candidates = [
        parsed.title,
        parsed.brief,
        parsed.contentHint,
        parsed.promptExcerpt,
        parsed.revisionInstruction,
        parsed.stage,
      ];
      const value = candidates.find((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (value) return value;
    }
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  };

  return {
    statusLabel,
    userFacingTaskType,
    userFacingAssetType,
    userFacingBatchType,
    userFacingLinkType,
    userFacingApproval,
    userFacingRoleKey,
    userFacingEventMessage,
    compactTimelineDescription,
    safeParseJson,
  };
}
