"use client";

import { useState, useEffect, useMemo, useRef } from "react";

type Category = "Công việc" | "Ý tưởng" | "Gia đình";
type TabKey = "notes" | "board" | "todo" | "settings";
type PhoneScreen = "list" | "detail" | "edit";
type TimeFilter = "all" | "today" | "week" | "overdue" | "nodue";
type SortKey = "updated" | "due" | "created";
type TodoChip = "all" | "today" | "priority";

const CATEGORIES: { name: Category; icon: string }[] = [
  { name: "Công việc", icon: "work" },
  { name: "Ý tưởng", icon: "lightbulb" },
  { name: "Gia đình", icon: "home" },
];

const CAT_ICON: Record<Category, string> = {
  "Công việc": "work",
  "Ý tưởng": "lightbulb",
  "Gia đình": "shopping_cart",
};

interface Note {
  id: string;
  title: string;
  body: string;
  category: Category;
  pinned: boolean;
  done?: boolean;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  due?: string;
  priority?: boolean;
}

/* ------------------------------ Date helpers (local time) ------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (ymd: string, delta: number) => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + delta);
  return toYmd(d);
};
const diffDays = (ymd: string, today: string) =>
  Math.round((parseYmd(ymd).getTime() - parseYmd(today).getTime()) / 86400000);
const shortDate = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtRelative = (ts: number) => {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 2) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Hôm nay · ${new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  const diffD = Math.round(diffHr / 24);
  if (diffD === 1) return "Hôm qua";
  return `${diffD} ngày trước`;
};

type DueTone = "overdue" | "today" | "soon" | "later" | "done";

function dueBadge(due: string | undefined, time: string | undefined, done: boolean | undefined, today: string) {
  if (!due || !today) return null;
  const suffix = time ? ` · ${time}` : "";
  if (done) return { text: `Đã xong · ${shortDate(due)}`, tone: "done" as DueTone };
  const d = diffDays(due, today);
  if (d < 0) return { text: `Quá hạn ${-d} ngày`, tone: "overdue" as DueTone };
  if (d === 0) return { text: `Hôm nay${suffix}`, tone: "today" as DueTone };
  if (d === 1) return { text: `Ngày mai${suffix}`, tone: "soon" as DueTone };
  if (d <= 3) return { text: `Còn ${d} ngày · ${shortDate(due)}`, tone: "soon" as DueTone };
  return { text: `${shortDate(due)}${suffix}`, tone: "later" as DueTone };
}

function matchTime(n: Note, f: TimeFilter, today: string) {
  if (f === "all") return true;
  if (f === "nodue") return !n.dueDate;
  if (!n.dueDate || !today) return false;
  const d = diffDays(n.dueDate, today);
  if (f === "today") return d === 0;
  if (f === "week") return d >= 0 && d <= 7;
  return d < 0 && !n.done;
}

/* ------------------------------------- Demo data ------------------------------------- */

function makeDefaultNotes(): Note[] {
  const now = Date.now();
  const today = toYmd(new Date());
  const H = 1000 * 60 * 60;
  return [
    {
      id: "note-1",
      title: "Kế hoạch nâng cấp giao diện M3E",
      category: "Công việc",
      pinned: true,
      icon: "push_pin",
      tags: ["Thiết kế UX", "Material 3", "Độ ưu tiên cao"],
      body: "# 1. Mục tiêu thiết kế\n- Phân tách trải nghiệm Phone (412×892) và Desktop (1280×800).\n- Tận dụng đầy đủ linh hồn Material 3 Expressive: bo cong đậm đà, màu sắc Amber ấm áp, chuyển động mượt mà.\n- Dấu 3 gạch mở Navigation Drawer trượt chuẩn UX di động.\n- Trên máy tính: Cấu trúc 3 vùng làm việc với Navigation Rail, danh sách tìm kiếm thông minh và vùng soạn thảo hỗ trợ Markdown.",
      dueDate: addDays(today, 2),
      dueTime: "09:00",
      createdAt: now - 6 * H,
      updatedAt: now - H / 2,
    },
    {
      id: "note-2",
      title: "Ý tưởng ứng dụng ghi chú cá nhân",
      category: "Ý tưởng",
      pinned: false,
      icon: "lightbulb",
      tags: ["Tokens", "Shapes", "Dynamic color"],
      body: "Hỗ trợ Checklist việc cần làm, ghi âm, định dạng Markdown và đồng bộ Cloud an toàn. Có thể vừa xem bản vẽ thiết kế vừa gõ nội dung trực tiếp.",
      dueDate: addDays(today, -1),
      createdAt: now - 30 * H,
      updatedAt: now - 24 * H,
    },
    {
      id: "note-3",
      title: "Danh sách mua sắm gia đình",
      category: "Gia đình",
      pinned: false,
      icon: "shopping_cart",
      tags: ["Cuối tuần", "Siêu thị"],
      body: "Cà phê Arabica rang mộc, hoa quả tươi, sữa chua Hy Lạp, cáp sạc USB-C và sổ tay ghi chép.",
      dueDate: today,
      dueTime: "18:30",
      createdAt: now - 80 * H,
      updatedAt: now - 72 * H,
    },
    {
      id: "note-4",
      title: "Đồng bộ dữ liệu và bảo mật sinh trắc",
      category: "Công việc",
      pinned: false,
      icon: "lock",
      tags: ["Bảo mật", "AES-256"],
      body: "Đã thiết lập mã hóa cục bộ và kết nối sao lưu Google Drive tự động mỗi ngày.",
      dueDate: addDays(today, -2),
      done: true,
      createdAt: now - 140 * H,
      updatedAt: now - 120 * H,
    },
    {
      id: "note-5",
      title: "Biên bản cuộc họp quý IV",
      category: "Công việc",
      pinned: false,
      icon: "groups",
      tags: ["OKRs", "Quý IV"],
      body: "Tổng kết KPI và lộ trình phát triển tính năng mới. Đánh giá kết quả thử nghiệm và chuẩn bị ra mắt bản beta.",
      dueDate: addDays(today, 5),
      createdAt: now - 170 * H,
      updatedAt: now - 160 * H,
    },
  ];
}

function makeDefaultTodos(): TodoItem[] {
  const today = toYmd(new Date());
  return [
    { id: "td-1", text: "Hoàn thiện wireframe màn hình Phone", done: true, due: today },
    { id: "td-2", text: "Thiết kế Navigation Drawer cho menu 3 gạch", done: true, due: today },
    { id: "td-3", text: "Review giao diện M3E trên Desktop", done: false, due: today, priority: true },
    { id: "td-4", text: "Kiểm tra tương thích Dark mode", done: false, due: addDays(today, 1), priority: true },
    { id: "td-5", text: "Mua cà phê và tài liệu Material 3 Expressive", done: false, due: addDays(today, 3) },
  ];
}

/* ------------------------------------ Persistence ------------------------------------ */

const KEY_NOTES = "m3e_live_notes";
const KEY_TODOS = "m3e_live_todos";
const KEY_DARK = "m3e_live_dark";
const KEY_FONT = "m3e_live_font";
const KEY_SCALE = "m3e_live_scale";

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeNotes(raw: unknown): Note[] | null {
  if (!Array.isArray(raw)) return null;
  const validCats = CATEGORIES.map((c) => c.name);
  return raw
    .filter((n) => n && typeof n === "object" && typeof n.id === "string")
    .map((n) => {
      const updatedAt = typeof n.updatedAt === "number" ? n.updatedAt : Date.now();
      const cat: Category = validCats.includes(n.category) ? n.category : "Công việc";
      return {
        id: n.id,
        title: typeof n.title === "string" ? n.title : "",
        body: typeof n.body === "string" ? n.body : "",
        category: cat,
        pinned: Boolean(n.pinned),
        done: Boolean(n.done),
        dueDate: typeof n.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(n.dueDate) ? n.dueDate : undefined,
        dueTime: typeof n.dueTime === "string" ? n.dueTime : undefined,
        tags: Array.isArray(n.tags) ? n.tags.filter((t: unknown) => typeof t === "string") : ["Material 3"],
        icon: typeof n.icon === "string" ? n.icon : CAT_ICON[cat],
        createdAt: typeof n.createdAt === "number" ? n.createdAt : updatedAt,
        updatedAt,
      } as Note;
    });
}

function normalizeTodos(raw: unknown): TodoItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((t) => t && typeof t === "object" && typeof t.id === "string")
    .map((t) => ({
      id: t.id,
      text: typeof t.text === "string" ? t.text : "",
      done: Boolean(t.done),
      due: typeof t.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : undefined,
      priority: Boolean(t.priority),
    }));
}

/* --------------------------------- Small UI components --------------------------------- */

function Icon({ name, size }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={size ? { fontSize: size } : undefined} aria-hidden="true">
      {name}
    </span>
  );
}

function DueBadge({ due, time, done, today }: { due?: string; time?: string; done?: boolean; today: string }) {
  const b = dueBadge(due, time, done, today);
  if (!b) return null;
  return (
    <span className={`m3-due-badge ${b.tone}`}>
      <Icon name={b.tone === "done" ? "check_circle" : "schedule"} size={14} />
      {b.text}
    </span>
  );
}

function NoteCard({
  note,
  selected,
  today,
  onClick,
}: {
  note: Note;
  selected: boolean;
  today: string;
  onClick: () => void;
}) {
  const leadIcon = note.pinned ? "push_pin" : note.icon || CAT_ICON[note.category];
  return (
    <div
      className={`m3-note-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="m3-note-row">
        <div className={`m3-note-lead-icon ${note.pinned ? "pinned" : ""}`}>
          <Icon name={leadIcon} size={20} />
        </div>
        <div className="m3-note-main">
          <div className="m3-note-header">
            <h4 className={`m3-note-title ${note.done ? "done" : ""}`}>{note.title || "Chưa có tiêu đề"}</h4>
          </div>
          <p className="m3-note-desc">
            {fmtRelative(note.updatedAt)} · {note.body.replace(/^#+\s*/gm, "") || "Ghi chú trống..."}
          </p>
          <div className="m3-note-meta-row">
            <DueBadge due={note.dueDate} time={note.dueTime} done={note.done} today={today} />
            <span className="m3-note-meta">{note.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaSummary({
  notes,
  today,
  timeFilter,
  setTimeFilter,
}: {
  notes: Note[];
  today: string;
  timeFilter: TimeFilter;
  setTimeFilter: (f: TimeFilter) => void;
}) {
  if (!today) return null;
  const open = notes.filter((n) => n.dueDate && !n.done);
  const overdue = open.filter((n) => diffDays(n.dueDate!, today) < 0).length;
  const dueToday = open.filter((n) => diffDays(n.dueDate!, today) === 0).length;
  const week = open.filter((n) => {
    const d = diffDays(n.dueDate!, today);
    return d >= 1 && d <= 7;
  }).length;
  const heading = parseYmd(today).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const items: { key: TimeFilter; label: string; count: number; tone: string }[] = [
    { key: "overdue", label: "Quá hạn", count: overdue, tone: "overdue" },
    { key: "today", label: "Hôm nay", count: dueToday, tone: "today" },
    { key: "week", label: "7 ngày tới", count: week, tone: "soon" },
  ];
  return (
    <div className="m3-agenda">
      <div className="m3-agenda-date">
        <Icon name="today" size={18} />
        <span>{heading}</span>
      </div>
      <div className="m3-agenda-grid">
        {items.map((it) => (
          <button
            key={it.key}
            className={`m3-agenda-card ${it.tone} ${timeFilter === it.key ? "active" : ""}`}
            onClick={() => setTimeFilter(timeFilter === it.key ? "all" : it.key)}
            aria-pressed={timeFilter === it.key}
          >
            <strong>{it.count}</strong>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteFilters(props: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  placeholder: string;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (v: TimeFilter) => void;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  total: number;
  desktop?: boolean;
}) {
  const { searchQuery, setSearchQuery, categoryFilter, setCategoryFilter } = props;
  return (
    <>
      <div className="m3-search-bar" style={props.desktop ? { margin: "8px 16px" } : undefined}>
        <Icon name="search" />
        <input
          type="text"
          className="m3-search-input"
          placeholder={props.placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Tìm kiếm ghi chú"
        />
        {searchQuery && (
          <button
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
            onClick={() => setSearchQuery("")}
            aria-label="Xóa tìm kiếm"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="m3-chips-scroll">
        <button
          className={`m3-chip ${categoryFilter === "all" ? "active" : ""}`}
          onClick={() => setCategoryFilter("all")}
        >
          <Icon name="done" size={16} />
          <span>Tất cả ({props.total})</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            className={`m3-chip ${categoryFilter === c.name ? "active" : ""}`}
            onClick={() => setCategoryFilter(c.name)}
          >
            <Icon name={c.icon} size={16} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      <div className="m3-filter-row">
        <label className="m3-filter-field">
          <Icon name="event" size={18} />
          <select
            className="m3-select"
            value={props.timeFilter}
            onChange={(e) => props.setTimeFilter(e.target.value as TimeFilter)}
            aria-label="Lọc theo thời hạn"
          >
            <option value="all">Mọi thời hạn</option>
            <option value="today">Hạn hôm nay</option>
            <option value="week">Trong 7 ngày</option>
            <option value="overdue">Quá hạn</option>
            <option value="nodue">Chưa đặt hạn</option>
          </select>
        </label>
        <label className="m3-filter-field">
          <Icon name="sort" size={18} />
          <select
            className="m3-select"
            value={props.sortBy}
            onChange={(e) => props.setSortBy(e.target.value as SortKey)}
            aria-label="Sắp xếp"
          >
            <option value="updated">Mới sửa nhất</option>
            <option value="due">Hạn gần nhất</option>
            <option value="created">Mới tạo nhất</option>
          </select>
        </label>
      </div>
    </>
  );
}

/* ------------------------------ Desktop Editor with Toolbar & Tags ------------------------------ */

const TOOLBAR_ACTIONS: { icon: string; title: string; prefix: string; suffix?: string }[] = [
  { icon: "format_bold", title: "In đậm", prefix: "**", suffix: "**" },
  { icon: "format_italic", title: "In nghiêng", prefix: "_", suffix: "_" },
  { icon: "format_underlined", title: "Gạch chân", prefix: "<u>", suffix: "</u>" },
  { icon: "format_list_bulleted", title: "Danh sách chấm", prefix: "\n- " },
  { icon: "format_list_numbered", title: "Danh sách số", prefix: "\n1. " },
  { icon: "check_box", title: "Checklist", prefix: "\n- [ ] " },
  { icon: "code", title: "Mã nguồn", prefix: "`", suffix: "`" },
];

function DesktopNoteEditor({
  note,
  onChange,
  onDelete,
  onExportMarkdown,
  saveStatus,
  autoFocusTitle,
  cloudSync,
  setCloudSync,
}: {
  note: Note;
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onExportMarkdown: () => void;
  saveStatus: string;
  autoFocusTitle: boolean;
  cloudSync: boolean;
  setCloudSync: (v: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const setQuick = (offset: number) => onChange({ dueDate: addDays(toYmd(new Date()), offset), done: false });
  const words = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
  const tags = note.tags ?? [];

  const applyFormat = (prefix: string, suffix = "") => {
    const el = textareaRef.current;
    if (!el) {
      onChange({ body: note.body + prefix + suffix });
      return;
    }
    const start = el.selectionStart ?? note.body.length;
    const end = el.selectionEnd ?? note.body.length;
    const selected = note.body.slice(start, end) || "văn bản";
    const next = note.body.slice(0, start) + prefix + selected + suffix + note.body.slice(end);
    onChange({ body: next });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const commitTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) onChange({ tags: [...tags, t] });
    setNewTag("");
    setAddingTag(false);
  };

  const removeTag = (t: string) => onChange({ tags: tags.filter((x) => x !== t) });

  return (
    <>
      {/* Floating Formatting Toolbar (per canvas g_d_work_editor_toolbar) */}
      <div className="m3-editor-toolbar">
        {TOOLBAR_ACTIONS.map((a) => (
          <button
            key={a.icon}
            className="m3-icon-btn"
            style={{ width: 36, height: 36 }}
            title={a.title}
            aria-label={a.title}
            onClick={() => applyFormat(a.prefix, a.suffix)}
          >
            <Icon name={a.icon} size={20} />
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: "var(--m3-outline-variant)", alignSelf: "center" }} />
        <button
          className="m3-icon-btn"
          style={{ width: 36, height: 36, color: "#b3261e" }}
          title="Xóa ghi chú này"
          aria-label="Xóa ghi chú này"
          onClick={onDelete}
        >
          <Icon name="delete" size={20} />
        </button>
      </div>

      {/* Outlined Title Field (per canvas g_d_work_editor_title) */}
      <div className="m3-outlined-field">
        <span className="m3-outlined-label">
          <Icon name="title" size={14} /> Tiêu đề ghi chú (Lưu tự động)
        </span>
        <input
          type="text"
          className="m3-editor-title-in"
          placeholder="Nhập tiêu đề ngắn gọn súc tích..."
          value={note.title}
          autoFocus={autoFocusTitle}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Tiêu đề ghi chú"
        />
      </div>

      {/* Tag chips row (per canvas g_d_work_editor_tags) */}
      <div className="m3-tags-row">
        {tags.map((t) => (
          <span key={t} className="m3-chip active">
            <Icon name="label" size={15} />
            <span>{t}</span>
            <button
              className="m3-tag-remove"
              onClick={() => removeTag(t)}
              title={`Xóa thẻ ${t}`}
              aria-label={`Xóa thẻ ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            type="text"
            className="m3-tag-input"
            placeholder="Tên thẻ..."
            value={newTag}
            autoFocus
            onChange={(e) => setNewTag(e.target.value)}
            onBlur={commitTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTag();
              if (e.key === "Escape") {
                setNewTag("");
                setAddingTag(false);
              }
            }}
          />
        ) : (
          <button className="m3-chip" onClick={() => setAddingTag(true)}>
            <Icon name="add" size={16} />
            <span>Thêm thẻ</span>
          </button>
        )}
      </div>

      {/* Schedule & Category panel */}
      <div className="m3-schedule-panel">
        <div className="m3-schedule-row">
          <label className="m3-field-label" htmlFor={`cat-${note.id}`}>
            <Icon name="category" size={18} /> Chuyên mục
          </label>
          <select
            id={`cat-${note.id}`}
            className="m3-select boxed"
            value={note.category}
            onChange={(e) => onChange({ category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="m3-field-label" htmlFor={`due-${note.id}`}>
            <Icon name="event" size={18} /> Hạn chót
          </label>
          <div className="m3-date-group">
            <input
              id={`due-${note.id}`}
              type="date"
              className="m3-date-input"
              value={note.dueDate ?? ""}
              onChange={(e) =>
                e.target.value
                  ? onChange({ dueDate: e.target.value })
                  : onChange({ dueDate: undefined, dueTime: undefined, done: false })
              }
            />
            <input
              type="time"
              className="m3-date-input"
              value={note.dueTime ?? ""}
              disabled={!note.dueDate}
              onChange={(e) => onChange({ dueTime: e.target.value || undefined })}
              aria-label="Giờ hạn chót"
            />
          </div>
        </div>

        <div className="m3-quick-dates">
          <button className="m3-chip" onClick={() => setQuick(0)}>
            Hôm nay
          </button>
          <button className="m3-chip" onClick={() => setQuick(1)}>
            Ngày mai
          </button>
          <button className="m3-chip" onClick={() => setQuick(7)}>
            Tuần sau
          </button>
          {note.dueDate && (
            <button
              className="m3-chip"
              onClick={() => onChange({ dueDate: undefined, dueTime: undefined, done: false })}
            >
              Xóa hạn
            </button>
          )}
          {note.dueDate && (
            <label className="m3-done-check" style={{ marginLeft: "auto" }}>
              <input
                type="checkbox"
                checked={Boolean(note.done)}
                onChange={(e) => onChange({ done: e.target.checked })}
              />
              Đã hoàn thành
            </label>
          )}
        </div>
      </div>

      {/* Body card (per canvas g_d_work_editor_body) */}
      <div className="m3-body-card">
        <div className="m3-body-card-head">
          <Icon name="description" size={18} />
          <span>Nội dung chi tiết & Ghi chép tài liệu</span>
          <span className="m3-body-card-meta">
            {words} từ · Sửa {fmtDateTime(note.updatedAt)}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          className="m3-editor-body-textarea"
          placeholder="Hỗ trợ định dạng văn bản Markdown và danh sách đánh dấu..."
          value={note.body}
          onChange={(e) => onChange({ body: e.target.value })}
          aria-label="Nội dung ghi chú"
        />
      </div>

      {/* Bottom switches & action buttons (per canvas g_d_work_editor_switches & actions) */}
      <div className="m3-editor-bottom-bar">
        <div className="m3-inline-switches">
          <label className="m3-inline-switch">
            <span>Ghim lên đầu</span>
            <button
              className={`m3-switch-btn ${note.pinned ? "checked" : ""}`}
              onClick={() => onChange({ pinned: !note.pinned })}
              role="switch"
              aria-checked={note.pinned}
            >
              <div className="m3-switch-thumb" />
            </button>
          </label>
          <label className="m3-inline-switch">
            <span>Tự động lưu cục bộ</span>
            <button
              className={`m3-switch-btn ${cloudSync ? "checked" : ""}`}
              onClick={() => setCloudSync(!cloudSync)}
              role="switch"
              aria-checked={cloudSync}
            >
              <div className="m3-switch-thumb" />
            </button>
          </label>
        </div>

        <div className="m3-editor-actions">
          <button className="m3-chip" onClick={onExportMarkdown} title="Tải file .md về máy">
            <Icon name="file_download" size={18} />
            <span>Xuất Markdown</span>
          </button>
          <span className="m3-save-pill">
            <Icon name="save" size={16} />
            <span>{saveStatus}</span>
          </span>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Phone Detail & Edit Screens ------------------------------ */

function PhoneDetailScreen({
  note,
  today,
  onEdit,
  onTogglePin,
}: {
  note: Note;
  today: string;
  onEdit: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="m3-mobile-detail">
      <div className="m3-tags-row">
        <span className="m3-chip active">
          <Icon name="label" size={16} />
          <span>{note.category}</span>
        </span>
        <button className={`m3-chip ${note.pinned ? "active" : ""}`} onClick={onTogglePin}>
          <Icon name="push_pin" size={16} />
          <span>{note.pinned ? "Được ghim ⭐" : "Ghim ghi chú"}</span>
        </button>
        <DueBadge due={note.dueDate} time={note.dueTime} done={note.done} today={today} />
      </div>

      <h2 className="m3-detail-title">{note.title || "Chưa có tiêu đề"}</h2>
      <div className="m3-detail-stamp">Cập nhật lần cuối: {fmtRelative(note.updatedAt)}</div>
      <div className="m3-divider" />

      <div className="m3-detail-card">
        <div className="m3-detail-card-head">
          <Icon name="description" size={20} />
          <span>1. Nội dung & Mục tiêu trọng tâm</span>
        </div>
        <div className="m3-detail-card-body">{note.body || "Ghi chú trống..."}</div>
        {note.tags && note.tags.length > 0 && (
          <div className="m3-tags-row" style={{ marginTop: 12 }}>
            {note.tags.map((t) => (
              <span key={t} className="m3-chip">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <button className="m3-btn-primary-full" onClick={onEdit}>
        <Icon name="edit" size={20} />
        <span>Chỉnh sửa ghi chú</span>
      </button>
    </div>
  );
}

function PhoneEditScreen({
  note,
  onSave,
  onCancel,
}: {
  note: Note;
  onSave: (patch: Partial<Note>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState<Category>(note.category);
  const [body, setBody] = useState(note.body);
  const [pinned, setPinned] = useState(note.pinned);
  const [hasReminder, setHasReminder] = useState(Boolean(note.dueDate));
  const [dueDate, setDueDate] = useState(note.dueDate || toYmd(new Date()));
  const [dueTime, setDueTime] = useState(note.dueTime || "09:00");

  const submit = () => {
    onSave({
      title: title.trim() || "Ghi chú mới",
      category,
      body,
      pinned,
      dueDate: hasReminder ? dueDate : undefined,
      dueTime: hasReminder ? dueTime : undefined,
    });
  };

  return (
    <div className="m3-mobile-editor">
      <div className="m3-outlined-field">
        <span className="m3-outlined-label">
          <Icon name="title" size={14} /> Tiêu đề ghi chú
        </span>
        <input
          type="text"
          className="m3-outlined-input"
          placeholder="Nhập tiêu đề ngắn gọn súc tích"
          value={title}
          autoFocus={!note.title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="m3-outlined-field">
        <span className="m3-outlined-label">
          <Icon name="category" size={14} /> Chọn chuyên mục
        </span>
        <select
          className="m3-outlined-input"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="m3-outlined-field" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span className="m3-outlined-label">
          <Icon name="notes" size={14} /> Nội dung ghi chú...
        </span>
        <textarea
          className="m3-outlined-textarea"
          placeholder="Hỗ trợ định dạng văn bản và danh sách đánh dấu"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="m3-switch-row">
        <div style={{ fontWeight: 600, fontSize: 14 }}>Ghim ghi chú lên đầu danh sách</div>
        <button
          className={`m3-switch-btn ${pinned ? "checked" : ""}`}
          onClick={() => setPinned(!pinned)}
          role="switch"
          aria-checked={pinned}
        >
          <div className="m3-switch-thumb" />
        </button>
      </div>

      <div className="m3-switch-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Thiết lập lời nhắc hẹn giờ</div>
          <button
            className={`m3-switch-btn ${hasReminder ? "checked" : ""}`}
            onClick={() => setHasReminder(!hasReminder)}
            role="switch"
            aria-checked={hasReminder}
          >
            <div className="m3-switch-thumb" />
          </button>
        </div>
        {hasReminder && (
          <div className="m3-date-group">
            <input
              type="date"
              className="m3-date-input"
              style={{ flex: 1 }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <input
              type="time"
              className="m3-date-input"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="m3-edit-btn-pair">
        <button className="m3-btn-tonal" onClick={onCancel}>
          <Icon name="cancel" size={18} />
          <span>Hủy bỏ</span>
        </button>
        <button className="m3-btn-filled" onClick={submit}>
          <Icon name="check_circle" size={18} />
          <span>Lưu thay đổi</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Desktop Cards Board (frame 8) ------------------------------ */

function DesktopCardsBoard({
  notes,
  today,
  onSelectNote,
  onCreateNote,
}: {
  notes: Note[];
  today: string;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
}) {
  const [boardFilter, setBoardFilter] = useState<"all" | "pinned" | Category>("all");
  const pinnedCount = notes.filter((n) => n.pinned).length;
  const countCat = (c: Category) => notes.filter((n) => n.category === c).length;

  const list = useMemo(() => {
    return notes.filter((n) => {
      if (boardFilter === "all") return true;
      if (boardFilter === "pinned") return n.pinned;
      return n.category === boardFilter;
    });
  }, [notes, boardFilter]);

  return (
    <div className="m3-board-wrap">
      <div className="m3-chips-scroll" style={{ padding: "0 0 16px" }}>
        <button
          className={`m3-chip ${boardFilter === "all" ? "active" : ""}`}
          onClick={() => setBoardFilter("all")}
        >
          <Icon name="done" size={16} />
          <span>Tất cả ghi chú ({notes.length})</span>
        </button>
        <button
          className={`m3-chip ${boardFilter === "pinned" ? "active" : ""}`}
          onClick={() => setBoardFilter("pinned")}
        >
          <Icon name="push_pin" size={16} />
          <span>Được ghim ({pinnedCount})</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            className={`m3-chip ${boardFilter === c.name ? "active" : ""}`}
            onClick={() => setBoardFilter(c.name)}
          >
            <Icon name={c.icon} size={16} />
            <span>
              {c.name} ({countCat(c.name)})
            </span>
          </button>
        ))}
      </div>

      <div className="m3-board-grid">
        {list.map((n) => (
          <div
            key={n.id}
            className={`m3-board-card ${n.pinned ? "pinned" : ""}`}
            onClick={() => onSelectNote(n.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectNote(n.id);
              }
            }}
          >
            <div className="m3-board-card-top">
              <div className={`m3-note-lead-icon ${n.pinned ? "pinned" : ""}`}>
                <Icon name={n.pinned ? "push_pin" : n.icon || CAT_ICON[n.category]} size={20} />
              </div>
              <span className="m3-note-meta">{n.category}</span>
            </div>
            <h4 className="m3-board-card-title">{n.title || "Chưa có tiêu đề"}</h4>
            <p className="m3-board-card-body">{n.body.replace(/^#+\s*/gm, "") || "Ghi chú trống..."}</p>
            <div className="m3-board-card-foot">
              <DueBadge due={n.dueDate} time={n.dueTime} done={n.done} today={today} />
              <span className="m3-note-meta">{fmtRelative(n.updatedAt)}</span>
            </div>
          </div>
        ))}
        <button className="m3-board-card add-card" onClick={onCreateNote}>
          <Icon name="add_circle" size={32} />
          <span>Tạo thẻ ghi chú mới</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Todo & Settings Panels ------------------------------ */

function TodoPanel({
  todos,
  today,
  onAdd,
  onToggle,
  onTogglePriority,
  onDelete,
  placeholder,
}: {
  todos: TodoItem[];
  today: string;
  onAdd: (text: string, due?: string, priority?: boolean) => void;
  onToggle: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState(false);
  const [chip, setChip] = useState<TodoChip>("all");
  const done = todos.filter((t) => t.done).length;
  const remaining = todos.length - done;
  const percent = todos.length > 0 ? Math.round((done / todos.length) * 100) : 0;

  const filtered = useMemo(() => {
    return todos
      .filter((t) => {
        if (chip === "today") return t.due === today;
        if (chip === "priority") return Boolean(t.priority);
        return true;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (Boolean(a.priority) !== Boolean(b.priority)) return a.priority ? -1 : 1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return 0;
      });
  }, [todos, chip, today]);

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), due || undefined, priority);
    setText("");
    setDue("");
    setPriority(false);
  };

  return (
    <>
      <div className="m3-todo-progress-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="checklist" size={24} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>
                Tiến độ hôm nay: {done} / {todos.length} việc đã xong
              </span>
              <span>{percent}%</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
              {remaining > 0
                ? `Cố gắng hoàn thành nốt ${remaining} mục còn lại trước 18:00!`
                : "Tuyệt vời! Bạn đã hoàn tất toàn bộ danh sách."}
            </div>
          </div>
        </div>
        <div className="m3-progress-bar-bg">
          <div className="m3-progress-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Filter chips per canvas g_p_todo_chips */}
      <div className="m3-chips-scroll">
        <button className={`m3-chip ${chip === "all" ? "active" : ""}`} onClick={() => setChip("all")}>
          <Icon name="done" size={16} />
          <span>Tất cả ({todos.length})</span>
        </button>
        <button className={`m3-chip ${chip === "today" ? "active" : ""}`} onClick={() => setChip("today")}>
          <Icon name="today" size={16} />
          <span>Hôm nay</span>
        </button>
        <button className={`m3-chip ${chip === "priority" ? "active" : ""}`} onClick={() => setChip("priority")}>
          <Icon name="priority_high" size={16} />
          <span>Ưu tiên cao ⭐</span>
        </button>
      </div>

      <div className="m3-todo-input-row">
        <input
          type="text"
          className="m3-todo-input"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          aria-label="Việc cần làm mới"
        />
        <input
          type="date"
          className="m3-date-input m3-todo-date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Hạn chót việc cần làm"
        />
        <button
          className={`m3-chip ${priority ? "active" : ""}`}
          style={{ height: 44, borderRadius: 999 }}
          onClick={() => setPriority(!priority)}
          title="Đánh dấu ưu tiên cao"
        >
          ⭐
        </button>
        <button className="m3-btn-add-task" onClick={submit}>
          Thêm
        </button>
      </div>

      {filtered.length === 0 && <div className="m3-empty-hint">Không có mục nào trong bộ lọc này.</div>}

      {filtered.map((todo) => (
        <div key={todo.id} className="m3-todo-item-row">
          <input
            type="checkbox"
            className="m3-todo-checkbox"
            checked={todo.done}
            onChange={() => onToggle(todo.id)}
            aria-label={`Hoàn thành: ${todo.text}`}
          />
          <div className="m3-todo-body">
            <span className={`m3-todo-text ${todo.done ? "done" : ""}`}>{todo.text}</span>
            <DueBadge due={todo.due} done={todo.done} today={today} />
          </div>
          <button
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              opacity: todo.priority ? 1 : 0.35,
              fontSize: 16,
            }}
            onClick={() => onTogglePriority(todo.id)}
            title="Ưu tiên cao"
            aria-label="Ưu tiên cao"
          >
            ⭐
          </button>
          <button
            style={{ border: "none", background: "transparent", cursor: "pointer", opacity: 0.6, color: "inherit" }}
            onClick={() => onDelete(todo.id)}
            aria-label={`Xóa: ${todo.text}`}
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      ))}
    </>
  );
}

function SettingsPanel({
  darkMode,
  setDarkMode,
  cloudSync,
  setCloudSync,
  fontFamily,
  setFontFamily,
  fontScale,
  setFontScale,
  onRestore,
  onExportJson,
}: {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  cloudSync: boolean;
  setCloudSync: (v: boolean) => void;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontScale: number;
  setFontScale: (v: number) => void;
  onRestore: () => void;
  onExportJson: () => void;
}) {
  const [biometric, setBiometric] = useState(true);
  const [notifyDue, setNotifyDue] = useState(true);

  return (
    <>
      {/* Account card per canvas g_p_set_account */}
      <div className="m3-switch-row">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="account_circle" size={36} />
          <div>
            <div style={{ fontWeight: 700 }}>Tài khoản cá nhân</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>user.ux@gmail.com · Đang lưu trên trình duyệt</div>
          </div>
        </div>
      </div>

      <div className="m3-switch-row">
        <div>
          <div style={{ fontWeight: 600 }}>Chế độ giao diện Tối (Dark Theme)</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Bật nền tối tiết kiệm pin</div>
        </div>
        <button
          className={`m3-switch-btn ${darkMode ? "checked" : ""}`}
          onClick={() => setDarkMode(!darkMode)}
          role="switch"
          aria-checked={darkMode}
        >
          <div className="m3-switch-thumb" />
        </button>
      </div>

      <div className="m3-switch-row">
        <div>
          <div style={{ fontWeight: 600 }}>Tự động sao lưu cục bộ</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Mọi thay đổi được ghi vào bộ nhớ máy</div>
        </div>
        <button
          className={`m3-switch-btn ${cloudSync ? "checked" : ""}`}
          onClick={() => setCloudSync(!cloudSync)}
          role="switch"
          aria-checked={cloudSync}
        >
          <div className="m3-switch-thumb" />
        </button>
      </div>

      <div className="m3-switch-row">
        <div>
          <div style={{ fontWeight: 600 }}>Khóa bảo mật bằng vân tay / FaceID</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Yêu cầu xác thực khi mở ghi chú riêng tư</div>
        </div>
        <button
          className={`m3-switch-btn ${biometric ? "checked" : ""}`}
          onClick={() => setBiometric(!biometric)}
          role="switch"
          aria-checked={biometric}
        >
          <div className="m3-switch-thumb" />
        </button>
      </div>

      <div className="m3-switch-row">
        <div>
          <div style={{ fontWeight: 600 }}>Thông báo nhắc nhở việc đến hạn</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Hiển thị huy hiệu cảnh báo hạn chót</div>
        </div>
        <button
          className={`m3-switch-btn ${notifyDue ? "checked" : ""}`}
          onClick={() => setNotifyDue(!notifyDue)}
          role="switch"
          aria-checked={notifyDue}
        >
          <div className="m3-switch-thumb" />
        </button>
      </div>

      {/* Font selector per canvas g_p_set_font */}
      <div className="m3-switch-row">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="text_fields" size={22} />
          <div>
            <div style={{ fontWeight: 600 }}>Phông chữ hiển thị</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Áp dụng trực tiếp cho toàn bộ Sổ tay</div>
          </div>
        </div>
        <select className="m3-select boxed" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
          <option value="Roboto, system-ui, sans-serif">Roboto (Mặc định Android)</option>
          <option value="'Segoe UI', system-ui, sans-serif">Segoe UI (Windows)</option>
          <option value="Georgia, 'Times New Roman', serif">Serif cổ điển (Đọc dài)</option>
          <option value="Consolas, monospace">Monospace (Kỹ thuật)</option>
        </select>
      </div>

      {/* Font size slider per canvas g_p_set_slider */}
      <div className="m3-switch-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
          <span>Kích thước cỡ chữ</span>
          <span>{fontScale === 100 ? "Chuẩn (100%)" : `${fontScale}%`}</span>
        </div>
        <input
          type="range"
          min={85}
          max={120}
          step={5}
          value={fontScale}
          onChange={(e) => setFontScale(Number(e.target.value))}
          style={{ accentColor: "var(--m3-primary)", width: "100%" }}
        />
      </div>

      <div className="m3-edit-btn-pair" style={{ marginTop: 4 }}>
        <button className="m3-btn-filled" onClick={onExportJson}>
          <Icon name="cloud_upload" size={18} />
          <span>Sao lưu JSON ngay</span>
        </button>
        <button className="m3-btn-tonal" onClick={onRestore}>
          <Icon name="restore" size={18} />
          <span>Khôi phục mẫu M3E</span>
        </button>
      </div>
    </>
  );
}

/* ------------------------------------- Main screen ------------------------------------- */

export default function Notebook() {
  const [deviceMode, setDeviceMode] = useState<"phone" | "desktop">("desktop");
  const [currentTab, setCurrentTab] = useState<TabKey>("notes");
  const [phoneScreen, setPhoneScreen] = useState<PhoneScreen>("list");
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  const [fontFamily, setFontFamily] = useState("Roboto, system-ui, sans-serif");
  const [fontScale, setFontScale] = useState(100);
  const [saveStatus, setSaveStatus] = useState("✓ Đã lưu");
  const [newNoteId, setNewNoteId] = useState("");
  const [today, setToday] = useState("");

  // Load initial data + keep `today` fresh across midnight
  useEffect(() => {
    setToday(toYmd(new Date()));
    const timer = window.setInterval(() => setToday(toYmd(new Date())), 60000);
    try {
      const rawNotes = localStorage.getItem(KEY_NOTES);
      const parsedNotes = rawNotes ? normalizeNotes(JSON.parse(rawNotes)) : null;
      const loadedNotes = parsedNotes ?? makeDefaultNotes();
      setNotes(loadedNotes);
      if (loadedNotes.length > 0) setSelectedNoteId(loadedNotes[0].id);
      if (!parsedNotes) persist(KEY_NOTES, loadedNotes);

      const rawTodos = localStorage.getItem(KEY_TODOS);
      const parsedTodos = rawTodos ? normalizeTodos(JSON.parse(rawTodos)) : null;
      const loadedTodos = parsedTodos ?? makeDefaultTodos();
      setTodos(loadedTodos);
      if (!parsedTodos) persist(KEY_TODOS, loadedTodos);

      const savedDark = localStorage.getItem(KEY_DARK);
      if (savedDark) setDarkMode(savedDark === "true");
      const savedFont = localStorage.getItem(KEY_FONT);
      if (savedFont) setFontFamily(savedFont);
      const savedScale = localStorage.getItem(KEY_SCALE);
      if (savedScale) setFontScale(Number(savedScale) || 100);
    } catch {
      const n = makeDefaultNotes();
      setNotes(n);
      setSelectedNoteId(n[0].id);
      setTodos(makeDefaultTodos());
    }
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(KEY_DARK, String(darkMode));
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_FONT, fontFamily);
      localStorage.setItem(KEY_SCALE, String(fontScale));
    } catch {
      /* ignore */
    }
  }, [fontFamily, fontScale]);

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    setSaveStatus(persist(KEY_NOTES, updated) ? "✓ Đã lưu" : "⚠ Không lưu được");
  };

  const saveTodos = (updated: TodoItem[]) => {
    setTodos(updated);
    persist(KEY_TODOS, updated);
  };

  // Prune empty untitled notes when switching selection
  const selectNote = (id: string) => {
    if (selectedNoteId && selectedNoteId !== id) {
      const cur = notes.find((n) => n.id === selectedNoteId);
      if (cur && !cur.title.trim() && !cur.body.trim()) {
        saveNotes(notes.filter((n) => n.id !== cur.id));
      }
    }
    setSelectedNoteId(id);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => {
        const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
        const matchCat = categoryFilter === "all" || n.category === categoryFilter;
        return matchSearch && matchCat && matchTime(n, timeFilter, today);
      })
      .sort((a, b) => {
        const pin = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        if (pin) return pin;
        if (sortBy === "due") {
          if (a.dueDate && b.dueDate)
            return a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? "").localeCompare(b.dueTime ?? "");
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return b.updatedAt - a.updatedAt;
        }
        if (sortBy === "created") return b.createdAt - a.createdAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, searchQuery, categoryFilter, timeFilter, sortBy, today]);

  const hasActiveFilter = Boolean(searchQuery.trim()) || categoryFilter !== "all" || timeFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setTimeFilter("all");
  };

  const handleCreateNote = () => {
    const now = Date.now();
    const cat: Category =
      categoryFilter !== "all" ? (categoryFilter as Category) : "Công việc";
    const newNote: Note = {
      id: "note-" + now,
      title: "",
      body: "",
      category: cat,
      pinned: false,
      done: false,
      tags: ["M3E"],
      icon: CAT_ICON[cat],
      createdAt: now,
      updatedAt: now,
    };
    saveNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setNewNoteId(newNote.id);
    setSearchQuery("");
    setTimeFilter("all");
    setCurrentTab("notes");
    setPhoneScreen("edit");
  };

  const handleUpdateCurrentNote = (patch: Partial<Note>) => {
    if (!selectedNote) return;
    setSaveStatus("Đang lưu...");
    const nextCat = patch.category ?? selectedNote.category;
    const nextIcon = patch.category ? CAT_ICON[nextCat] : selectedNote.icon;
    saveNotes(
      notes.map((n) =>
        n.id === selectedNote.id ? { ...n, ...patch, icon: nextIcon, updatedAt: Date.now() } : n
      )
    );
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    setSelectedNoteId(updated[0]?.id ?? "");
    setPhoneScreen("list");
  };

  const handlePhoneCancelEdit = () => {
    if (selectedNote && !selectedNote.title.trim() && !selectedNote.body.trim()) {
      handleDeleteNote(selectedNote.id);
      return;
    }
    setPhoneScreen("detail");
  };

  const openNoteOnPhone = (id: string) => {
    selectNote(id);
    setPhoneScreen("detail");
  };

  const goTab = (tab: TabKey) => {
    if (selectedNote && !selectedNote.title.trim() && !selectedNote.body.trim()) {
      saveNotes(notes.filter((n) => n.id !== selectedNote.id));
    }
    setCurrentTab(tab);
    setPhoneScreen("list");
    setDrawerOpen(false);
  };

  const handleToggleTodo = (id: string) =>
    saveTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const handleToggleTodoPriority = (id: string) =>
    saveTodos(todos.map((t) => (t.id === id ? { ...t, priority: !t.priority } : t)));
  const handleAddTodo = (text: string, due?: string, priority?: boolean) =>
    saveTodos([{ id: "td-" + Date.now(), text, done: false, due, priority }, ...todos]);
  const handleDeleteTodo = (id: string) => saveTodos(todos.filter((t) => t.id !== id));

  const handleRestoreDemo = () => {
    const n = makeDefaultNotes();
    saveNotes(n);
    saveTodos(makeDefaultTodos());
    setSelectedNoteId(n[0].id);
    clearFilters();
    setPhoneScreen("list");
  };

  const handleExportMarkdown = () => {
    if (!selectedNote) return;
    const content = `# ${selectedNote.title || "Ghi chú"}\n\n- **Chuyên mục:** ${selectedNote.category}\n${
      selectedNote.dueDate ? `- **Hạn chót:** ${selectedNote.dueDate} ${selectedNote.dueTime ?? ""}\n` : ""
    }\n${selectedNote.body}\n`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedNote.title || "ghi-chu").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ notes, todos }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `m3e-notes-backup-${today || "now"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const phoneTitle =
    currentTab === "notes" ? "Ghi chú của tôi" : currentTab === "todo" ? "Việc cần làm" : "Cài đặt hệ thống";

  const filtersProps = {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    timeFilter,
    setTimeFilter,
    sortBy,
    setSortBy,
    total: notes.length,
  };

  const emptyList = (
    <div className="m3-empty-hint">
      {notes.length === 0 ? "Chưa có ghi chú nào." : "Không có ghi chú phù hợp bộ lọc."}
      {hasActiveFilter && (
        <button className="m3-chip" style={{ marginTop: 10 }} onClick={clearFilters}>
          Xóa bộ lọc
        </button>
      )}
    </div>
  );

  const reminderCount = notes.filter((n) => n.dueDate && !n.done).length;

  return (
    <div className="m3-app-root" style={{ fontFamily, zoom: `${fontScale}%` }}>
      {/* Top Banner Control Bar */}
      <header className="m3-top-control-bar">
        <div className="m3-control-title">
          <Icon name="edit_note" size={24} />
          <span>Material 3 Expressive Notes</span>
          <span className="m3-badge-live">Chạy thật</span>
        </div>

        <div className="m3-control-actions">
          <div className="m3-pill-group">
            <button
              className={`m3-pill-btn ${deviceMode === "desktop" ? "active" : ""}`}
              onClick={() => setDeviceMode("desktop")}
            >
              <Icon name="desktop_windows" size={18} />
              <span>Máy tính (1280dp)</span>
            </button>
            <button
              className={`m3-pill-btn ${deviceMode === "phone" ? "active" : ""}`}
              onClick={() => setDeviceMode("phone")}
            >
              <Icon name="smartphone" size={18} />
              <span>Điện thoại (412dp)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="m3-viewport-container">
        {deviceMode === "phone" ? (
          /* ======================= PHONE SIMULATOR FRAME (412 × 892) ======================= */
          <div className="m3-phone-frame">
            <div className="m3-phone-notch" />

            {/* Navigation Drawer (matches frame 2: phone_drawer) */}
            {drawerOpen && (
              <div className="m3-drawer-overlay" onClick={() => setDrawerOpen(false)}>
                <div className="m3-drawer-sheet" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>Menu & Danh mục</div>
                    <button className="m3-icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu">
                      <Icon name="close" />
                    </button>
                  </div>

                  <div className="m3-drawer-profile">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name="verified_user" size={28} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Nguyễn Văn A · Pro User</div>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>
                          Bộ nhớ cục bộ · {notes.length} ghi chú đang lưu
                        </div>
                      </div>
                    </div>
                    <div className="m3-progress-bar-bg" style={{ marginTop: 8, height: 6 }}>
                      <div className="m3-progress-bar-fill" style={{ width: "28%" }} />
                    </div>
                  </div>

                  <div className="m3-drawer-list">
                    <button
                      className={`m3-drawer-item ${currentTab === "notes" && timeFilter === "all" ? "active" : ""}`}
                      onClick={() => {
                        clearFilters();
                        goTab("notes");
                      }}
                    >
                      <Icon name="description" />
                      <div className="m3-drawer-item-text">
                        <strong>Tất cả ghi chú</strong>
                        <span>{notes.length} ghi chú đang hoạt động</span>
                      </div>
                    </button>

                    <button
                      className={`m3-drawer-item ${currentTab === "todo" ? "active" : ""}`}
                      onClick={() => goTab("todo")}
                    >
                      <Icon name="check_box" />
                      <div className="m3-drawer-item-text">
                        <strong>Việc cần làm & Checklist</strong>
                        <span>{todos.filter((t) => !t.done).length} việc chưa hoàn thành</span>
                      </div>
                    </button>

                    <button
                      className={`m3-drawer-item ${timeFilter === "week" ? "active" : ""}`}
                      onClick={() => {
                        setTimeFilter("week");
                        goTab("notes");
                      }}
                    >
                      <Icon name="alarm" />
                      <div className="m3-drawer-item-text">
                        <strong>Lời nhắc hẹn giờ</strong>
                        <span>{reminderCount} lời nhắc đang đặt</span>
                      </div>
                    </button>
                  </div>

                  <div className="m3-divider" />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--m3-primary)" }}>
                    Nhãn phân loại (Tags)
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.name}
                        className="m3-chip"
                        onClick={() => {
                          setCategoryFilter(c.name);
                          goTab("notes");
                        }}
                      >
                        <Icon name="label" size={15} />
                        <span>#{c.name.replace(/\s/g, "")}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    className="m3-btn-tonal"
                    style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}
                    onClick={() => goTab("settings")}
                  >
                    <Icon name="settings" size={18} />
                    <span>Cài đặt & Đồng bộ hóa</span>
                  </button>
                </div>
              </div>
            )}

            {/* Phone Top App Bar */}
            {currentTab === "notes" && phoneScreen === "detail" && selectedNote ? (
              <div className="m3-top-app-bar" style={{ paddingTop: 18 }}>
                <button className="m3-icon-btn" onClick={() => setPhoneScreen("list")} aria-label="Quay lại">
                  <Icon name="arrow_back" />
                </button>
                <h2 className="m3-top-title">Chi tiết ghi chú</h2>
                <div style={{ display: "flex" }}>
                  <button
                    className="m3-icon-btn"
                    onClick={() => setPhoneScreen("edit")}
                    aria-label="Sửa ghi chú"
                    title="Chỉnh sửa"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    className="m3-icon-btn"
                    style={{ color: "#b3261e" }}
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    aria-label="Xóa ghi chú"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              </div>
            ) : currentTab === "notes" && phoneScreen === "edit" && selectedNote ? (
              <div className="m3-top-app-bar" style={{ paddingTop: 18 }}>
                <button className="m3-icon-btn" onClick={handlePhoneCancelEdit} aria-label="Đóng">
                  <Icon name="close" />
                </button>
                <h2 className="m3-top-title">Soạn thảo ghi chú</h2>
                <div style={{ width: 44 }} />
              </div>
            ) : (
              <div className="m3-top-app-bar" style={{ paddingTop: 18 }}>
                <button
                  className="m3-icon-btn"
                  onClick={() => setDrawerOpen(true)}
                  title="Mở Menu 3 gạch"
                  aria-label="Mở menu"
                >
                  <Icon name="menu" />
                </button>
                <h2 className="m3-top-title">{phoneTitle}</h2>
                <button
                  className="m3-icon-btn"
                  onClick={() => setDarkMode(!darkMode)}
                  title="Bật/Tắt chế độ tối"
                  aria-label="Bật hoặc tắt chế độ tối"
                >
                  <Icon name={darkMode ? "light_mode" : "dark_mode"} />
                </button>
              </div>
            )}

            {/* TAB CONTENT */}
            {currentTab === "notes" && phoneScreen === "detail" && selectedNote && (
              <PhoneDetailScreen
                note={selectedNote}
                today={today}
                onEdit={() => setPhoneScreen("edit")}
                onTogglePin={() => handleUpdateCurrentNote({ pinned: !selectedNote.pinned })}
              />
            )}

            {currentTab === "notes" && phoneScreen === "edit" && selectedNote && (
              <PhoneEditScreen
                key={selectedNote.id}
                note={selectedNote}
                onSave={(patch) => {
                  handleUpdateCurrentNote(patch);
                  setPhoneScreen("detail");
                }}
                onCancel={handlePhoneCancelEdit}
              />
            )}

            {currentTab === "notes" && phoneScreen === "list" && (
              <>
                <div className="m3-phone-scroll">
                  <AgendaSummary
                    notes={notes}
                    today={today}
                    timeFilter={timeFilter}
                    setTimeFilter={setTimeFilter}
                  />
                  <NoteFilters {...filtersProps} placeholder="Tìm nhanh ghi chú..." />
                  <div className="m3-notes-list">
                    {filteredNotes.length === 0
                      ? emptyList
                      : filteredNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            today={today}
                            selected={selectedNote?.id === note.id}
                            onClick={() => openNoteOnPhone(note.id)}
                          />
                        ))}
                  </div>
                </div>

                <button
                  className="m3-fab"
                  onClick={handleCreateNote}
                  title="Tạo ghi chú mới"
                  aria-label="Tạo ghi chú mới"
                >
                  <Icon name="add" size={28} />
                </button>
              </>
            )}

            {currentTab === "todo" && (
              <div className="m3-phone-scroll">
                <TodoPanel
                  todos={todos}
                  today={today}
                  onAdd={handleAddTodo}
                  onToggle={handleToggleTodo}
                  onTogglePriority={handleToggleTodoPriority}
                  onDelete={handleDeleteTodo}
                  placeholder="Thêm việc cần làm..."
                />
              </div>
            )}

            {currentTab === "settings" && (
              <div className="m3-settings-list">
                <SettingsPanel
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                  cloudSync={cloudSync}
                  setCloudSync={setCloudSync}
                  fontFamily={fontFamily}
                  setFontFamily={setFontFamily}
                  fontScale={fontScale}
                  setFontScale={setFontScale}
                  onRestore={handleRestoreDemo}
                  onExportJson={handleExportJson}
                />
              </div>
            )}

            {/* Bottom Nav */}
            <div className="m3-bottom-nav">
              {(
                [
                  ["notes", "description", "Ghi chú"],
                  ["todo", "check_box", "Việc cần làm"],
                  ["settings", "settings", "Cài đặt"],
                ] as [TabKey, string, string][]
              ).map(([key, icon, label]) => (
                <button
                  key={key}
                  className={`m3-bottom-nav-item ${currentTab === key ? "active" : ""}`}
                  onClick={() => goTab(key)}
                >
                  <div className="m3-nav-pill">
                    <Icon name={icon} />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ====================== DESKTOP WORKSPACE FRAME (1280 × 800) ====================== */
          <div className="m3-desktop-frame">
            <aside className="m3-nav-rail">
              {(
                [
                  ["notes", "dashboard", "Không gian"],
                  ["board", "grid_view", "Bảng thẻ"],
                  ["todo", "checklist", "Việc cần làm"],
                  ["settings", "settings", "Cài đặt"],
                ] as [TabKey, string, string][]
              ).map(([key, icon, label]) => (
                <button
                  key={key}
                  className={`m3-rail-item ${currentTab === key ? "active" : ""}`}
                  onClick={() => goTab(key)}
                >
                  <div className="m3-rail-icon-box">
                    <Icon name={icon} />
                  </div>
                  <span>{label}</span>
                </button>
              ))}

              <div style={{ flex: 1 }} />

              <button className="m3-rail-item" onClick={() => setDarkMode(!darkMode)} title="Đổi theme sáng / tối">
                <div className="m3-rail-icon-box">
                  <Icon name={darkMode ? "light_mode" : "dark_mode"} />
                </div>
                <span>Theme</span>
              </button>
            </aside>

            <div className="m3-desktop-main">
              <div className="m3-top-app-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon name={currentTab === "board" ? "grid_view" : "note_alt"} />
                  <h3 className="m3-top-title">
                    {currentTab === "board"
                      ? "Bảng thẻ ghi chú tổng quan (Cards Board)"
                      : "Material 3 Expressive Notes Studio (Desktop)"}
                  </h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--m3-primary)", fontWeight: 600 }}>{saveStatus}</span>
                  <button className="m3-btn-new-note" onClick={handleCreateNote}>
                    <Icon name="add" size={20} />
                    <span>Tạo ghi chú mới</span>
                  </button>
                </div>
              </div>

              <div className="m3-desktop-body">
                {currentTab === "notes" ? (
                  <>
                    <div className="m3-desktop-master-col">
                      <AgendaSummary
                        notes={notes}
                        today={today}
                        timeFilter={timeFilter}
                        setTimeFilter={setTimeFilter}
                      />
                      <NoteFilters {...filtersProps} placeholder="Tìm kiếm ghi chú (Ctrl + K)..." desktop />
                      <div style={{ padding: "0 16px 10px" }}>
                        <button className="m3-btn-master-add" onClick={handleCreateNote}>
                          <Icon name="add" size={20} />
                          <span>Tạo ghi chú mới</span>
                        </button>
                      </div>
                      <div className="m3-notes-list" style={{ paddingBottom: 20 }}>
                        {filteredNotes.length === 0
                          ? emptyList
                          : filteredNotes.map((note) => (
                              <NoteCard
                                key={note.id}
                                note={note}
                                today={today}
                                selected={selectedNote?.id === note.id}
                                onClick={() => selectNote(note.id)}
                              />
                            ))}
                      </div>
                    </div>

                    <div className="m3-desktop-detail-col">
                      {selectedNote ? (
                        <DesktopNoteEditor
                          key={selectedNote.id}
                          note={selectedNote}
                          onChange={handleUpdateCurrentNote}
                          onDelete={() => handleDeleteNote(selectedNote.id)}
                          onExportMarkdown={handleExportMarkdown}
                          saveStatus={saveStatus}
                          autoFocusTitle={selectedNote.id === newNoteId}
                          cloudSync={cloudSync}
                          setCloudSync={setCloudSync}
                        />
                      ) : (
                        <div style={{ textAlign: "center", marginTop: 120 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.3 }}>
                            description
                          </span>
                          <h3>Chưa chọn ghi chú nào</h3>
                          <button
                            className="m3-chip active"
                            style={{ padding: "10px 24px", marginTop: 12 }}
                            onClick={handleCreateNote}
                          >
                            Tạo ghi chú đầu tiên
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : currentTab === "board" ? (
                  <DesktopCardsBoard
                    notes={notes}
                    today={today}
                    onSelectNote={(id) => {
                      selectNote(id);
                      setCurrentTab("notes");
                    }}
                    onCreateNote={handleCreateNote}
                  />
                ) : currentTab === "todo" ? (
                  <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
                    <div style={{ maxWidth: 700, margin: "0 auto" }}>
                      <TodoPanel
                        todos={todos}
                        today={today}
                        onAdd={handleAddTodo}
                        onToggle={handleToggleTodo}
                        onTogglePriority={handleToggleTodoPriority}
                        onDelete={handleDeleteTodo}
                        placeholder="Thêm việc cần làm mới (bấm Enter)..."
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
                    <div style={{ maxWidth: 640, margin: "0 auto" }}>
                      <h3 style={{ marginBottom: 16 }}>Cài đặt hệ thống M3E</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <SettingsPanel
                          darkMode={darkMode}
                          setDarkMode={setDarkMode}
                          cloudSync={cloudSync}
                          setCloudSync={setCloudSync}
                          fontFamily={fontFamily}
                          setFontFamily={setFontFamily}
                          fontScale={fontScale}
                          setFontScale={setFontScale}
                          onRestore={handleRestoreDemo}
                          onExportJson={handleExportJson}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
