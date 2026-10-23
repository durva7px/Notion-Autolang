
/**
 * Notion DOM adapter.
 *
 * Experimental: Notion does not guarantee stable
 * DOM selectors for third-party browser extensions.
 */

const CODE_BLOCK_SELECTOR =
  '[data-block-id] .notion-code-block';

const wait = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

const LANGUAGE_ALIASES = {
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  python: ["python", "py"],
  java: ["java"],
  "c++": ["c++", "cpp"],
  sql: ["sql"],
  json: ["json"],
  shell: ["shell", "bash", "sh", "zsh"],
  css: ["css"],
  xml: ["xml"],
  "plain text": ["plain text", "plaintext"]
};

const normalizeLanguage = value =>
  value.trim().toLowerCase().replace(/[^a-z0-9+#]/g, "");

function matchesLanguage(value, language) {
  const aliases = LANGUAGE_ALIASES[language] ?? [language];
  const normalized = normalizeLanguage(value);

  return aliases.some(
    alias => normalizeLanguage(alias) === normalized
  );
}

function getVisibleLanguageOptions() {
  const optionSelector =
    'button, [role="option"], [role="menuitem"], ' +
    '[role="menuitemradio"], [role="menuitemcheckbox"]';
  const menus = Array.from(document.querySelectorAll(
    '[role="menu"], [role="listbox"], [role="dialog"]'
  ));
  const menuOptions = menus.flatMap(menu =>
    Array.from(menu.querySelectorAll(optionSelector))
  );
  const options = menuOptions.length > 0
    ? menuOptions
    : Array.from(document.querySelectorAll(
        '[role="option"], [role="menuitem"], ' +
        '[role="menuitemradio"], [role="menuitemcheckbox"], button'
      )).filter(element =>
        !element.closest(CODE_BLOCK_SELECTOR)
      );

  return options.filter(element => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0;
  });
}

function getBlockId(element) {
  const parent = element.closest("[data-block-id]");

  return parent?.getAttribute("data-block-id") ?? null;
}

function getCodeText(element) {
  // Notion commonly uses contenteditable elements
  // inside its editor.
  const editor = element.querySelector(
    '[contenteditable="true"]'
  );

  if (!editor) return "";

  return editor.innerText?.trim() ?? "";
}

function getLanguageButton(element) {
  const buttons = Array.from(
    element.querySelectorAll("button, [role='button']")
  );

  return buttons.find(button => {
    const label = (
      button.getAttribute("aria-label") ||
      button.innerText ||
      ""
    ).trim().toLowerCase();

    return label.includes("language") ||
      Object.keys(LANGUAGE_ALIASES).some(language =>
        matchesLanguage(label, language)
      );
  }) ?? null;
}

export function getCodeBlocks() {
  const elements = document.querySelectorAll(
    CODE_BLOCK_SELECTOR
  );

  return Array.from(elements)
    .map(element => ({
      id: getBlockId(element),
      code: getCodeText(element),
      currentLanguage:
        getLanguageButton(element)?.innerText?.trim() ?? null
    }))
    .filter(block => block.id && block.code);
}

function findBlockById(blockId) {
  const elements = document.querySelectorAll(
    CODE_BLOCK_SELECTOR
  );

  return Array.from(elements).find(
    element => getBlockId(element) === blockId
  );
}

export async function updateBlockLanguage(
  blockId,
  language
) {
  const block = findBlockById(blockId);

  if (!block) {
    throw new Error("Code block not found.");
  }

  const button = getLanguageButton(block);

  if (!button) {
    throw new Error(
      "Language selector not found. Inspect Notion's DOM."
    );
  }

  // Open the native language dropdown.
  button.click();

  let option = null;
  const deadline = Date.now() + 3000;

  while (!option && Date.now() < deadline) {
    option = getVisibleLanguageOptions().find(item => {
      const label =
        item.getAttribute("aria-label") ||
        item.innerText ||
        item.textContent ||
        "";

      return matchesLanguage(label, language);
    });

    if (!option) {
      await wait(100);
    }
  }

  if (!option) {
    throw new Error(
      `Could not find the "${language}" option in Notion's language menu.`
    );
  }

  option.click();

  await wait(500);

  return true;
}
