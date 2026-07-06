import { request } from "./request";
import { isTauriRuntime } from "./runtime";

type DevBridgeCallResult<T> =
  | { handled: true; value: T }
  | { handled: false };

interface DevBridgeResponse<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

const DEV_BRIDGE_BASE_URL = String(
  import.meta.env.VITE_DEV_IPC_BRIDGE_URL || "http://127.0.0.1:1421"
).replace(/\/+$/, "");

const DEV_BRIDGE_IPC_URL = `${DEV_BRIDGE_BASE_URL}/__monster_dev_ipc`;
const DEV_BRIDGE_ASSET_URL = `${DEV_BRIDGE_BASE_URL}/__monster_dev_asset`;
const DEV_BRIDGE_TIMEOUT_MS = 30 * 60 * 1000;
let devBridgeAvailable: boolean | null = null;

const DEV_BRIDGE_DATA_COMMANDS = new Set([
  "get_app_paths",
  "get_app_version",
  "check_db_status",
  "get_preference_config",
  "save_preference_config",
  "verify_admin_password",
  "init_navigation_db",
  "get_navigation_list",
  "add_navigation",
  "update_navigation",
  "batch_update_navigation",
  "delete_navigation",
  "batch_delete_navigation",
  "increment_navigation_clicks",
  "get_navigation_categories",
  "migrate_navigation_category",
  "clear_navigation_file_references",
  "check_navigation_file_references",
  "save_navigation_sort_order",
  "get_all_navigation_list",
  "import_navigation_list",
  "list_uploaded_files",
  "delete_uploaded_file",
  "write_file_data",
  "read_file_data",
  "write_log_entry",
  "read_log_file",
  "clear_all_logs",
]);

const DEV_BRIDGE_AI_COMMANDS = new Set([
  "test_ai_provider",
  "generate_ai_content",
  "generate_ai_business_content",
  "enqueue_ai_business_generation",
  "get_ai_generation_task",
  "list_ai_generation_tasks",
  "cancel_ai_generation_task",
  "enqueue_ai_provider_test",
  "get_ai_provider_test_task",
  "list_ai_provider_test_tasks",
  "get_ai_provider_queue_status",
  "cancel_ai_provider_queued_tests",
  "cancel_ai_provider_test_task",
]);

export function canUseDevBridgeRuntime() {
  return import.meta.env.DEV && !isTauriRuntime();
}

function isDevBridgeCommand(command: string) {
  return command.startsWith("get_image_workbench_") ||
    command.startsWith("create_image_workbench_") ||
    command.startsWith("list_image_workbench_") ||
    command.startsWith("query_image_workbench_") ||
    command.startsWith("import_image_workbench_") ||
    command.startsWith("recover_image_workbench_") ||
    command.startsWith("update_image_workbench_") ||
    command.startsWith("start_image_workbench_") ||
    command.startsWith("record_image_workbench_") ||
    command.startsWith("cancel_image_workbench_") ||
    command.startsWith("retry_image_workbench_") ||
    command.startsWith("replan_image_workbench_") ||
    command.startsWith("delete_image_workbench_") ||
    command.startsWith("export_image_workbench_") ||
    command.startsWith("tag_image_workbench_") ||
    command.startsWith("cleanup_image_workbench_") ||
    command.startsWith("save_image_workbench_") ||
    command.startsWith("set_image_workbench_") ||
    DEV_BRIDGE_DATA_COMMANDS.has(command) ||
    DEV_BRIDGE_AI_COMMANDS.has(command);
}

export async function tryDevBridgeCallTauri<T>(
  command: string,
  args: Record<string, unknown>
): Promise<DevBridgeCallResult<T>> {
  if (!canUseDevBridgeRuntime() || !isDevBridgeCommand(command)) {
    return { handled: false };
  }

  const response = await request.post<DevBridgeResponse<T>>(
    DEV_BRIDGE_IPC_URL,
    { command, args },
    {
      timeout: DEV_BRIDGE_TIMEOUT_MS,
      headers: {
        "X-Monster-Dev-Bridge": "1",
      },
      showToastOnError: false,
    }
  );

  if (!response.success) {
    if (response.status === 0 || response.status === 404) {
      devBridgeAvailable = false;
      return { handled: false };
    }
    throw new Error(response.message || "[ERR_DEV_BRIDGE_HTTP] 开发期真实数据桥接请求失败");
  }

  const data = response.data;
  if (!data || typeof data.ok !== "boolean") {
    devBridgeAvailable = false;
    return { handled: false };
  }
  devBridgeAvailable = true;
  if (!data.ok) {
    throw new Error(data.error || "[ERR_DEV_BRIDGE_COMMAND] 开发期真实数据桥接命令失败");
  }

  return { handled: true, value: data.value as T };
}

export function resolveDevBridgeAssetSrc(path: string) {
  if (!canUseDevBridgeRuntime() || devBridgeAvailable !== true || !path) {
    return "";
  }
  return `${DEV_BRIDGE_ASSET_URL}?path=${encodeURIComponent(path)}`;
}
