import { vi } from "vitest";

export function codeBlock(id, code, language = "plain text") {
  return {
    object: "block",
    id,
    type: "code",
    has_children: false,
    code: { language, rich_text: [{ plain_text: code }] }
  };
}

export function paragraph(id) {
  return { object: "block", id, type: "paragraph", has_children: false, paragraph: {} };
}

export function toggle(id) {
  return { object: "block", id, type: "toggle", has_children: true, toggle: {} };
}

/**
 * In-memory stand-in for the Notion SDK client.
 * `children` maps a block/page id to its child blocks; `pageSize` forces pagination.
 */
export function fakeNotionClient({ children = {}, pages = [], pageSize = 100 } = {}) {
  return {
    search: vi.fn(async () => ({ results: pages, has_more: false, next_cursor: null })),
    pages: {
      retrieve: vi.fn(async ({ page_id }) => {
        if (!(page_id in children)) {
          throw Object.assign(new Error("Could not find page"), { status: 404 });
        }
        return { object: "page", id: page_id };
      })
    },
    blocks: {
      children: {
        list: vi.fn(async ({ block_id, start_cursor }) => {
          const all = children[block_id] ?? [];
          const start = start_cursor ? Number(start_cursor) : 0;
          const end = start + pageSize;
          return {
            results: all.slice(start, end),
            has_more: end < all.length,
            next_cursor: end < all.length ? String(end) : null
          };
        })
      },
      update: vi.fn(async ({ block_id, code }) => ({ id: block_id, type: "code", code }))
    }
  };
}
