const TARGET_URL = process.env.MONSTER_PLAYGROUND_URL || "http://127.0.0.1:1420/#/playground";
const DEBUG_HOST = process.env.MONSTER_DEBUG_HOST || "127.0.0.1";
const DEBUG_PORT = Number(process.env.MONSTER_DEBUG_PORT || 9222);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createTarget(url) {
  const response = await fetch(
    `http://${DEBUG_HOST}:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" }
  );
  if (!response.ok) {
    throw new Error(`failed to create target: ${response.status}`);
  }
  return response.json();
}

async function withCdpPage(callback) {
  const target = await createTarget(TARGET_URL);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await sleep(8000);

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return result.result.value;
  };

  try {
    return await callback({ evaluate });
  } finally {
    socket.close();
  }
}

async function waitFor(evaluate, expression, timeoutMs = 20000, intervalMs = 500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await evaluate(expression);
    if (result?.ok) {
      return result;
    }
    await sleep(intervalMs);
  }
  return { ok: false, timeout: true };
}

function debugCall(expression) {
  return `(() => {
    const bridge = window.__monsterPlaygroundDebug;
    if (!bridge) return { ok: false, reason: "debug_bridge_missing" };
    return Promise.resolve(${expression})
      .then((value) => ({ ok: true, value }))
      .catch((error) => ({ ok: false, reason: String(error?.message || error) }));
  })()`;
}

async function main() {
  const result = await withCdpPage(async ({ evaluate }) => {
    const bridge = await waitFor(
      evaluate,
      `(() => ({ ok: Boolean(window.__monsterPlaygroundDebug) }))()`,
      15000,
      400
    );
    if (!bridge.ok) {
      return { ok: false, reason: "debug_bridge_unavailable" };
    }

    const promptRun = await evaluate(debugCall("bridge.runPromptWorkflow()"));
    const promptWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        return {
          ok: Boolean(state?.promptWorkflowTask?.status === "succeeded" && state?.promptWorkflowAsset?.id),
          state,
        };
      })()`,
      15000,
      500
    );

    const reviewRun = await evaluate(debugCall("bridge.runReviewWorkflow()"));
    const reviewWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        return {
          ok: Boolean(state?.reviewTaskResult?.id && state?.reviewAssetResult?.id),
          state,
        };
      })()`,
      15000,
      500
    );

    const domainRun = await evaluate(debugCall("bridge.runDomainAssetDraft()"));
    const domainWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        return {
          ok: Boolean(state?.domainAssets?.length >= 9 && state?.domainAssetLinks?.length >= 7),
          state,
        };
      })()`,
      15000,
      500
    );

    const goalRun = await evaluate(debugCall("bridge.runGoalMultiAgentStub()"));
    const goalWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        return {
          ok: Boolean(state?.goalStatusSnapshot?.totalTasks >= 5),
          state,
        };
      })()`,
      15000,
      500
    );

    const mockSetup = await evaluate(
      debugCall(`Promise.resolve()
        .then(() => bridge.setBatchMode("mock"))
        .then(() => bridge.patchBatchForm({ totalCount: 6, concurrency: 1, maxRetries: 0 }))
        .then(() => bridge.createBatchJob())`)
    );
    const mockStart = await evaluate(debugCall("bridge.startBatchJob()"));
    const mockPause = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        return {
          ok: Boolean(state?.batchJobActivity?.some?.((item) => item.message === "batch started")),
          state,
        };
      })()`,
      10000,
      400
    );
    const mockPauseAction = await evaluate(debugCall("bridge.pauseBatchJob()"));
    const mockResumeAction = await evaluate(debugCall("bridge.resumeBatchJob()"));
    const mockCancelAction = await evaluate(debugCall("bridge.cancelBatchJob()"));

    const promptBatchSetup = await evaluate(
      debugCall(`Promise.resolve()
        .then(() => bridge.setBatchMode("prompt"))
        .then(() => bridge.patchBatchForm({ totalCount: 3, concurrency: 1, maxRetries: 1 }))
        .then(() => bridge.createBatchJob())
        .then(() => bridge.startBatchJob())`)
    );
    const promptBatchWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        const summary = state?.batchJobTasks?.map?.((task) => ({
          status: task.status,
          taskType: task.taskType,
          resultJson: task.resultJson,
        })) || [];
        const hasModelRuns = summary.some((task) => task.resultJson?.includes?.("modelRunId"));
        return {
          ok: Boolean(state?.batchJobSnapshot?.job?.batchType === "demo.image.prompt" && state?.batchJobSnapshot?.stats?.succeededTasks >= 3 && hasModelRuns),
          state,
          hasModelRuns,
        };
      })()`,
      20000,
      700
    );

    const realBatchSetup = await evaluate(
      debugCall(`Promise.resolve()
        .then(() => bridge.setBatchMode("real"))
        .then(() => bridge.patchBatchForm({ totalCount: 2, concurrency: 1, maxRetries: 0 }))
        .then(() => bridge.createBatchJob())
        .then(() => bridge.startBatchJob())`)
    );
    const realBatchWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        const imageItems = state?.batchJobImageItems || [];
        const hasFiles = imageItems.some((item) => item.filePath && item.thumbnailPath);
        return {
          ok: Boolean(
            state?.batchJobSnapshot?.job?.batchType === "demo.image.generate" &&
              state?.batchJobSnapshot?.stats?.succeededTasks >= 2 &&
              imageItems.length >= 1 &&
              hasFiles
          ),
          state,
          imageItems,
          hasFiles,
        };
      })()`,
      25000,
      700
    );

    const autoPauseSetup = await evaluate(
      debugCall(`Promise.resolve()
        .then(() => bridge.setBatchMode("real"))
        .then(() =>
          bridge.patchBatchForm({
            totalCount: 9,
            concurrency: 1,
            maxRetries: 0,
            budgetJson: JSON.stringify({ stage: "real", maxConsecutiveFailures: 1 }),
          })
        )
        .then(() => bridge.createBatchJob())
        .then(() => bridge.startBatchJob())`)
    );
    const autoPauseWait = await waitFor(
      evaluate,
      `(() => {
        const state = window.__monsterPlaygroundDebug?.getState?.();
        const hasAutoPause = (state?.batchJobActivity || []).some((item) =>
          String(item?.message || "").includes("auto-paused")
        );
        return {
          ok: Boolean(
            state?.batchJobSnapshot?.job?.batchType === "demo.image.generate" &&
              state?.batchJobSnapshot?.job?.status === "paused" &&
              hasAutoPause
          ),
          state,
          hasAutoPause,
        };
      })()`,
      30000,
      700
    );

    const finalState = await evaluate(
      `(() => {
        const bridge = window.__monsterPlaygroundDebug;
        if (!bridge) return null;
        return bridge.getState();
      })()`
    );

    return {
      ok: true,
      promptRun,
      promptWait,
      reviewRun,
      reviewWait,
      domainRun,
      domainWait,
      goalRun,
      goalWait,
      mockSetup,
      mockStart,
      mockPause,
      mockPauseAction,
      mockResumeAction,
      mockCancelAction,
      promptBatchSetup,
      promptBatchWait,
      realBatchSetup,
      realBatchWait,
      autoPauseSetup,
      autoPauseWait,
      finalState,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
    return;
  }

  const failures = [
    ["promptWait", result.promptWait],
    ["reviewWait", result.reviewWait],
    ["domainWait", result.domainWait],
    ["goalWait", result.goalWait],
    ["promptBatchWait", result.promptBatchWait],
    ["realBatchWait", result.realBatchWait],
    ["autoPauseWait", result.autoPauseWait],
  ].filter(([, value]) => !value?.ok);

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
