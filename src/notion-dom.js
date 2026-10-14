
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
  // Candidate selector. Validate against the
  // actual Notion DOM in Chrome DevTools.
  const buttons = Array.from(
    element.querySelectorAll("button, [role='button']")
  );

  return buttons.find(button => {
    const label = (
      button.getAttribute("aria-label") ||
      button.innerText ||
      ""
    ).trim().toLowerCase();

    return (
      label.includes("language") ||
      label.includes("javascript") ||
      label.includes("typescript") ||
      label.includes("python") ||
      label.includes("plain text") ||
      label.includes("java") ||
      label.includes("sql")
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

  await wait(250);

  // Search the currently visible dropdown.
  const options = Array.from(
    document.querySelectorAll(
      '[role="option"], [role="menuitem"]'
    )
  );

  const normalize = value =>
    value.trim().toLowerCase();

  const option = options.find(
    item => normalize(item.innerText || "") ===
      normalize(language)
  );

  if (!option) {
    throw new Error(
      `Could not find language option: ${language}`
    );
  }

  option.click();

  await wait(250);

  return true;
}
