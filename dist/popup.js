(() => {
  // src/popup.js
  var scanBtn = document.getElementById("scanBtn");
  var applyBtn = document.getElementById("applyBtn");
  var status = document.getElementById("status");
  var blockList = document.getElementById("blockList");
  var blockCount = document.getElementById("blockCount");
  var detectedBlocks = [];
  function setStatus(message) {
    status.textContent = message;
  }
  async function sendMessage(message) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    if (!tab?.id || !tab.url?.startsWith(
      "https://www.notion.so/"
    )) {
      throw new Error("Please open a Notion page first.");
    }
    return chrome.tabs.sendMessage(tab.id, message);
  }
  function renderBlocks(blocks) {
    blockList.replaceChildren();
    blockCount.textContent = String(blocks.length);
    if (blocks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No code blocks detected.";
      blockList.appendChild(empty);
      applyBtn.disabled = true;
      return;
    }
    blocks.forEach((block) => {
      const item = document.createElement("div");
      item.className = "block-item";
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = block.id;
      checkbox.className = "block-checkbox";
      checkbox.disabled = !block.suggestedLanguage;
      checkbox.checked = Boolean(block.suggestedLanguage);
      const title = document.createElement("span");
      title.textContent = block.suggestedLanguage ? `Detected: ${block.suggestedLanguage}` : "Language uncertain";
      label.append(checkbox, title);
      const preview = document.createElement("pre");
      preview.textContent = block.code.slice(0, 140);
      const current = document.createElement("p");
      current.className = "language";
      current.textContent = `Current: ${block.currentLanguage ?? "Unknown"}`;
      item.append(label, preview, current);
      blockList.appendChild(item);
    });
    applyBtn.disabled = !blocks.some(
      (block) => block.suggestedLanguage
    );
  }
  scanBtn.addEventListener("click", async () => {
    scanBtn.disabled = true;
    applyBtn.disabled = true;
    setStatus("Scanning code blocks...");
    try {
      const response = await sendMessage({
        type: "SCAN_PAGE"
      });
      if (!response?.success) {
        throw new Error("Unable to scan page.");
      }
      detectedBlocks = response.blocks;
      renderBlocks(detectedBlocks);
      setStatus(
        `Found ${detectedBlocks.length} code block(s).`
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      scanBtn.disabled = false;
    }
  });
  applyBtn.addEventListener("click", async () => {
    const selected = Array.from(
      document.querySelectorAll(
        ".block-checkbox:checked"
      )
    ).map((input) => input.value);
    if (selected.length === 0) {
      setStatus("Select at least one suggestion.");
      return;
    }
    applyBtn.disabled = true;
    scanBtn.disabled = true;
    setStatus("Applying suggestions...");
    try {
      const response = await sendMessage({
        type: "APPLY_SUGGESTIONS",
        blockIds: selected
      });
      if (!response?.success) {
        throw new Error(
          response?.error ?? "Update failed."
        );
      }
      const applied = response.results.filter(
        (result) => result.status === "applied"
      ).length;
      const failed = response.results.filter(
        (result) => result.status === "failed"
      );
      setStatus(
        `${applied} update(s) attempted, ${failed.length} failed.`
      );
      if (failed.length > 0) {
        console.warn("AutoLang failures:", failed);
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      scanBtn.disabled = false;
      applyBtn.disabled = false;
    }
  });
})();
//# sourceMappingURL=popup.js.map
