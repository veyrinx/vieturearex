import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Inbox, Pencil, Plus, Save, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SearchInput,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Switch,
  Textarea,
} from "@/components/ui";
import { ImagePicker } from "@/components/image-picker";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import type {
  ArrayResourceConfig,
  FieldDef,
  ResourceItem,
  RowResourceConfig,
} from "@/admin/config";

/**
 * Hai màn hình dùng chung cho mọi mục quản trị dạng danh sách (xem admin/config.ts).
 *
 * Cùng một bộ giao diện: danh sách → mở tấm trượt sửa → lưu. Khác nhau ở chỗ ghi
 * xuống server: `array` gửi lại CẢ mảng một lần, `rows` gọi từng mục một.
 */

type ScreenProps = { title: string; description?: string };

// ── Đổi qua lại giữa dữ liệu API và ô nhập ─────────────────────────────────

function toInput(field: FieldDef, raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (field.type === "tags") return Array.isArray(raw) ? raw.join("\n") : String(raw);
  if (field.type === "datetime") return toLocalInputValue(String(raw));
  if (field.type === "date") return String(raw).slice(0, 10);
  return String(raw);
}

function fromInput(field: FieldDef, input: string): unknown {
  const trimmed = input.trim();
  if (field.type === "tags") {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (field.type === "number") return trimmed === "" ? undefined : Number(trimmed);
  if (field.type === "datetime") return trimmed === "" ? "" : fromLocalInputValue(trimmed);
  return trimmed;
}

function labelOf(field: FieldDef, raw: unknown): string {
  const value = raw === null || raw === undefined ? "" : String(raw);
  if (field.options) return field.options.find((o) => o.value === value)?.label ?? value;
  return value;
}

/** Ô nhập cho một trường đã khai báo. */
function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-3">
        <span className="text-[13px] font-medium text-mist-300">{field.label}</span>
        <Switch checked={value === true} onChange={onChange} label={field.label} />
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <ImagePicker
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        bucket={field.bucket ?? "logos"}
        label={field.label}
      />
    );
  }

  const input = toInput(field, value);

  return (
    <Field label={field.label} hint={field.hint} required={field.required}>
      {field.type === "select" ? (
        <Select value={input} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : field.type === "textarea" || field.type === "tags" ? (
        <Textarea
          rows={field.rows ?? 4}
          value={input}
          placeholder={field.placeholder}
          onChange={(e) => onChange(fromInput(field, e.target.value))}
        />
      ) : (
        <Input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "datetime"
                  ? "datetime-local"
                  : "text"
          }
          inputMode={field.type === "number" ? "numeric" : undefined}
          value={input}
          placeholder={field.placeholder}
          onChange={(e) => onChange(fromInput(field, e.target.value))}
        />
      )}
    </Field>
  );
}

/** Biểu mẫu của một mục — dùng chung cho cả hai kiểu màn hình. */
function ItemForm({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: ResourceItem;
  onChange: (next: ResourceItem) => void;
}) {
  return (
    <div className="space-y-3.5">
      {fields.map((field) => (
        <FieldControl
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(next) => onChange({ ...value, [field.name]: next })}
        />
      ))}
    </div>
  );
}

function missingRequired(fields: FieldDef[], value: ResourceItem): string | null {
  for (const field of fields) {
    if (!field.required) continue;
    const raw = value[field.name];
    if (raw === undefined || raw === null || String(raw).trim() === "") return field.label;
  }
  return null;
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-[68px]" />
      ))}
    </div>
  );
}

/** Một dòng trong danh sách. */
function ItemRow({
  title,
  subtitle,
  chip,
  onEdit,
  trailing,
}: {
  title: string;
  subtitle?: string;
  chip?: React.ReactNode;
  onEdit: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-2 truncate text-[14px] font-medium">
          {title || "(chưa đặt tên)"}
          {chip}
        </p>
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-mist-500">{subtitle}</p>}
      </button>
      {trailing}
    </Card>
  );
}

// ── Kiểu 1: cả danh sách nằm trong một dòng cài đặt ─────────────────────────

export function ArrayResourceScreen({
  config,
  title,
  description,
}: ScreenProps & { config: ArrayResourceConfig }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["resource", config.endpoint, config.listKey];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      api<Record<string, unknown>>(config.endpoint).then(
        (data) => (data[config.listKey] as ResourceItem[]) ?? [],
      ),
  });

  const [draft, setDraft] = useState<ResourceItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<{ index: number; value: ResourceItem } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Chỉ nuốt dữ liệu mới khi chưa có chỉnh sửa dở — kéo làm mới giữa chừng mà
  // ghi đè bản nháp thì mất công gõ lại.
  useEffect(() => {
    if (query.data && !dirty) setDraft(query.data);
  }, [query.data, dirty]);

  const save = useMutation({
    mutationFn: (items: ResourceItem[]) =>
      api<Record<string, unknown>>(config.endpoint, {
        method: "PUT",
        body: { [config.putKey ?? config.listKey]: items },
      }),
    onSuccess: (data) => {
      setDirty(false);
      const returned = data?.[config.putKey ?? config.listKey];
      if (Array.isArray(returned)) setDraft(returned as ResourceItem[]);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Đã lưu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return draft
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        needle
          ? JSON.stringify(item).toLowerCase().includes(needle)
          : true,
      );
  }, [draft, search]);

  function mutate(next: ResourceItem[]) {
    setDraft(next);
    setDirty(true);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  function addNew() {
    const blank: ResourceItem = { ...config.blank };
    if ("id" in blank && !blank.id) blank.id = Math.random().toString(36).slice(2, 10);
    setEditing({ index: -1, value: blank });
  }

  function applyEdit() {
    if (!editing) return;
    const missing = missingRequired(config.fields, editing.value);
    if (missing) {
      toast.error(`Thiếu "${missing}".`);
      return;
    }
    const next = [...draft];
    if (editing.index < 0) next.push(editing.value);
    else next[editing.index] = editing.value;
    mutate(next);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <SubHeader
        title={title}
        description={description}
        action={
          <Button size="sm" icon={Plus} onClick={addNew}>
            Thêm
          </Button>
        }
      />

      {draft.length > 6 && <SearchInput value={search} onChange={setSearch} />}

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : draft.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`Chưa có ${config.itemLabel} nào`}
          description={config.emptyHint}
          action={
            <Button size="sm" icon={Plus} onClick={addNew}>
              Thêm {config.itemLabel}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map(({ item, index }) => (
            <ItemRow
              key={String(item.id ?? item[config.titleField] ?? index)}
              title={String(item[config.titleField] ?? "")}
              subtitle={
                config.subtitleField ? String(item[config.subtitleField] ?? "") : undefined
              }
              chip={
                config.enabledField && item[config.enabledField] === false ? (
                  <Chip tone="neutral">Đang tắt</Chip>
                ) : undefined
              }
              onEdit={() => setEditing({ index, value: { ...item } })}
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  {config.reorder && !search && (
                    <>
                      <button
                        type="button"
                        aria-label="Lên"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="grid size-8 place-items-center rounded-lg text-mist-500 disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Xuống"
                        disabled={index === draft.length - 1}
                        onClick={() => move(index, 1)}
                        className="grid size-8 place-items-center rounded-lg text-mist-500 disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label="Xoá"
                    onClick={() => setRemoving(index)}
                    className="grid size-8 place-items-center rounded-lg text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {dirty && (
        <div className="safe-bottom fixed inset-x-0 bottom-16 z-30 px-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-violet-glow/30 bg-ink-900/95 p-2 shadow-xl backdrop-blur">
            <Button
              block
              icon={Save}
              loading={save.isPending}
              onClick={() => save.mutate(draft)}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing && editing.index >= 0 ? `Sửa ${config.itemLabel}` : `Thêm ${config.itemLabel}`}
        footer={
          <Button block onClick={applyEdit}>
            Xong
          </Button>
        }
      >
        {editing && (
          <ItemForm
            fields={config.fields}
            value={editing.value}
            onChange={(value) => setEditing({ ...editing, value })}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={removing !== null}
        title={`Xoá ${config.itemLabel}?`}
        message="Xoá xong vẫn phải bấm Lưu thay đổi thì web mới cập nhật."
        confirmLabel="Xoá"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing === null) return;
          mutate(draft.filter((_, index) => index !== removing));
          setRemoving(null);
        }}
      />
    </div>
  );
}

// ── Kiểu 2: mỗi mục một dòng trong bảng ─────────────────────────────────────

export function RowResourceScreen({
  config,
  title,
  description,
}: ScreenProps & { config: RowResourceConfig }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const idField = config.idField ?? "id";
  const [filter, setFilter] = useState(config.filter?.options[0]?.value ?? "");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ original: ResourceItem | null; value: ResourceItem } | null>(
    null,
  );
  const [removing, setRemoving] = useState<ResourceItem | null>(null);

  const params = new URLSearchParams(config.params ?? {});
  if (config.filter && filter) params.set(config.filter.param, filter);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const queryKey = ["resource", config.endpoint, config.listKey, suffix];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      api<Record<string, unknown>>(`${config.endpoint}${suffix}`).then(
        (data) => (data[config.listKey] as ResourceItem[]) ?? [],
      ),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["resource", config.endpoint] });
    void queryClient.invalidateQueries({ queryKey: ["logs"] });
  }

  const save = useMutation({
    mutationFn: ({ original, value }: { original: ResourceItem | null; value: ResourceItem }) => {
      // Gửi lại nguyên các trường không khai trong cấu hình, nếu không server
      // upsert sẽ hiểu là "xoá trắng" những cột đó.
      const merged: ResourceItem = { ...(original ?? {}), ...value, ...(config.extra ?? {}) };
      const body = config.normalize ? config.normalize(merged) : merged;
      if (!original) {
        return api(`${config.endpoint}${suffix}`, { method: config.createMethod ?? "POST", body });
      }
      const id = String(original[idField] ?? "");
      if (config.idInQuery) {
        const query = new URLSearchParams({ ...(config.params ?? {}), id });
        return api(`${config.endpoint}?${query.toString()}`, {
          method: config.updateMethod ?? "PATCH",
          body,
        });
      }
      return api(config.endpoint, {
        method: config.updateMethod ?? "PATCH",
        body: { ...body, [idField]: id },
      });
    },
    onSuccess: () => {
      setEditing(null);
      refresh();
      toast.success("Đã lưu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (item: ResourceItem) => {
      const id = String(item[idField] ?? "");
      if (config.idInQuery) {
        const query = new URLSearchParams({ ...(config.params ?? {}), id });
        return api(`${config.endpoint}?${query.toString()}`, { method: "DELETE" });
      }
      return api(config.endpoint, { method: "DELETE", body: { [idField]: id } });
    },
    onSuccess: () => {
      setRemoving(null);
      refresh();
      toast.success("Đã xoá.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = query.data ?? [];
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }, [items, search]);

  const canCreate = config.canCreate !== false && config.fields.length > 0;
  const canDelete = config.canDelete !== false;

  const subtitleField = config.fields.find((f) => f.name === config.subtitleField);

  return (
    <div className="space-y-4">
      <SubHeader
        title={title}
        description={description}
        action={
          canCreate ? (
            <Button size="sm" icon={Plus} onClick={() => setEditing({ original: null, value: {} })}>
              Thêm
            </Button>
          ) : undefined
        }
      />

      {config.filter && (
        <Segmented value={filter} onChange={setFilter} options={config.filter.options} />
      )}

      {items.length > 6 && <SearchInput value={search} onChange={setSearch} />}

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`Chưa có ${config.itemLabel} nào`}
          description={config.emptyHint}
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => (
            <ItemRow
              key={String(item[idField])}
              title={String(item[config.titleField] ?? "")}
              subtitle={
                config.subtitleField
                  ? subtitleField
                    ? labelOf(subtitleField, item[config.subtitleField])
                    : String(item[config.subtitleField] ?? "")
                  : undefined
              }
              onEdit={() =>
                config.fields.length > 0 && setEditing({ original: item, value: { ...item } })
              }
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  {config.fields.length > 0 && (
                    <button
                      type="button"
                      aria-label="Sửa"
                      onClick={() => setEditing({ original: item, value: { ...item } })}
                      className="grid size-8 place-items-center rounded-lg text-mist-300"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      aria-label="Xoá"
                      onClick={() => setRemoving(item)}
                      className="grid size-8 place-items-center rounded-lg text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.original ? `Sửa ${config.itemLabel}` : `Thêm ${config.itemLabel}`}
        footer={
          <Button
            block
            loading={save.isPending}
            onClick={() => {
              if (!editing) return;
              const missing = missingRequired(config.fields, editing.value);
              if (missing) {
                toast.error(`Thiếu "${missing}".`);
                return;
              }
              save.mutate(editing);
            }}
          >
            Lưu
          </Button>
        }
      >
        {editing && (
          <ItemForm
            fields={config.fields}
            value={editing.value}
            onChange={(value) => setEditing({ ...editing, value })}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(removing)}
        title={`Xoá ${config.itemLabel}?`}
        message="Thao tác này không hoàn tác được."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </div>
  );
}
