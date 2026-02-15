---
name: ui-feedback-utils
description: Provides instructions for using global feedback utilities like $tip (toast notifications) and useConfirm (confirmation dialogs). Use when the user wants to show a notification, toast, snackbar, or a confirmation dialog.
---

# UI Feedback Utilities

This skill provides instructions for using the project's global feedback utilities: `$tip` for toast notifications and `useConfirm` for confirmation dialogs.

## 1. Toast Notifications ($tip)

The `$tip` function is a global utility provided via a Nuxt plugin. It is used to show brief messages (snackbars) at the top of the screen.

### Usage

```typescript
const { $tip } = useNuxtApp();

// Simple success message (default)
$tip('操作成功');

// Error message with custom options
$tip('操作失败', {
  color: 'error',
  icon: 'mdi-alert-circle',
  timeout: 5000
});
```

### Options (TipOptions)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color` | `string` | `'success'` | Vuetify color name (e.g., `'error'`, `'warning'`, `'info'`) |
| `timeout` | `number` | `3000` | Duration in milliseconds before the toast disappears |
| `location` | `Anchor` | `'top'` | Display position (Vuetify Anchor type) |
| `icon` | `string` | `'mdi-check'` | MDI icon name |

---

## 2. Confirmation Dialogs (useConfirm)

The `useConfirm` composable provides a centralized way to trigger a global confirmation dialog.

### Usage

```typescript
import { useConfirm } from '~/composables/useConfirm';

const { showConfirm } = useConfirm();

const handleDelete = () => {
  showConfirm({
    title: '确认删除',
    message: '您确定要删除这个智能体吗？此操作不可撤销。',
    confirmText: '立即删除',
    icon: 'mdi-delete',
    onConfirm: async () => {
      // 执行删除逻辑
      await agentService.delete(id);
      $tip('删除成功');
    }
  });
};
```

### Options (ConfirmState)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `''` | Dialog title |
| `message` | `string` | `''` | Main content of the dialog |
| `icon` | `string` | `'mdi-help-circle'` | MDI icon displayed in the header |
| `confirmText` | `string` | `'确认'` | Text for the primary action button |
| `onConfirm` | `() => void` | `() => {}` | Callback function executed when the user clicks confirm |

---

## Best Practices

1. **Prefer $tip for non-blocking feedback**: Use it for success messages, simple warnings, or background task updates.
2. **Use useConfirm for destructive actions**: Always ask for confirmation before deleting data or performing irreversible operations.
3. **Consistency**: Use standard icons (e.g., `mdi-check` for success, `mdi-alert` for warnings, `mdi-delete` for deletions) to maintain a consistent UI/UX.
