/*
 * claude-shim.js
 *
 * These apps were first built as Claude artifacts, where the page gets
 * `window.claude.use("sample")` (model calls) and `window.claude.use("db")`
 * (saved data) from the Claude runtime.
 *
 * This shim provides the same two APIs when the page runs anywhere else
 * (GitHub Pages, a local file, any static host):
 *   - sample -> Anthropic Messages API, called straight from the browser with
 *               an API key the visitor enters. The key is kept in this
 *               browser's localStorage and is only ever sent to api.anthropic.com.
 *   - db     -> a small document store backed by localStorage.
 *
 * Inside claude.ai the real runtime is present and this file does nothing.
 */
(function () {
  "use strict";
  if (window.claude && typeof window.claude.use === "function") return;

  var MODEL = "claude-sonnet-5-5";
  var API_URL = "https://api.anthropic.com/v1/messages";
  var KEY_STORAGE = "claude-shim:anthropic-key";
  var DB_PREFIX = "claude-shim:db:";

  function store(op, key, value) {
    try {
      if (op === "get") return localStorage.getItem(key);
      if (op === "set") localStorage.setItem(key, value);
      if (op === "del") localStorage.removeItem(key);
    } catch (e) { /* storage blocked: degrade quietly */ }
    return null;
  }

  function getKey() { return store("get", KEY_STORAGE); }

  function askForKey() {
    var key = window.prompt(
      "This demo calls Claude with your own Anthropic API key.\n\n" +
      "The key is stored only in this browser and sent only to api.anthropic.com.\n\n" +
      "Paste your API key:"
    );
    if (key && key.trim()) {
      store("set", KEY_STORAGE, key.trim());
      return key.trim();
    }
    return null;
  }

  function errorFromStatus(status, body) {
    if (status === 401 || status === 403) {
      store("del", KEY_STORAGE);
      return { code: "not_granted", message: "API key was rejected." };
    }
    if (status === 429) return { code: "rate_limited", message: "Rate limited." };
    return { code: "error", message: (body && body.error && body.error.message) || ("HTTP " + status) };
  }

  async function complete(prompt, opts) {
    opts = opts || {};
    var key = getKey() || askForKey();
    if (!key) throw { code: "not_granted", message: "No API key provided." };

    var res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: opts.maxTokens || 1024,
          messages: [{ role: "user", content: prompt }]
        })
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "network_error", message: String(e && e.message || e) };
    }

    var body = null;
    try { body = await res.json(); } catch (e) { /* non-JSON error body */ }
    if (!res.ok) throw errorFromStatus(res.status, body);

    var text = (body.content || [])
      .filter(function (b) { return b.type === "text"; })
      .map(function (b) { return b.text; })
      .join("");
    if (typeof opts.onText === "function") opts.onText({ text: text });
    return { text: text, truncated: body.stop_reason === "max_tokens" };
  }

  function parseJson(text) {
    var start = text.search(/[\[{]/);
    var end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start === -1 || end < start) throw { code: "invalid_json", message: "No JSON in response." };
    try { return JSON.parse(text.slice(start, end + 1)); }
    catch (e) { throw { code: "invalid_json", message: e.message }; }
  }

  function makeSample() {
    var sample = function (prompt, opts) { return complete(prompt, opts); };
    sample.json = async function (prompt, opts) {
      var res = await complete(prompt + "\n\nRespond with valid JSON only.", opts);
      return parseJson(res.text);
    };
    return sample;
  }

  function makeDb() {
    return {
      doc: function (path) {
        var storageKey = DB_PREFIX + path;
        return {
          get: async function () {
            var raw = store("get", storageKey);
            var value = null;
            try { value = raw ? JSON.parse(raw) : null; } catch (e) { value = null; }
            return { exists: value !== null, data: function () { return value; } };
          },
          set: async function (value) {
            store("set", storageKey, JSON.stringify(value));
          }
        };
      }
    };
  }

  // A small corner button to add, change or remove the key. Saving reloads
  // the page so the app re-initialises with model calls switched on.
  function addKeyButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = getKey() ? "API key ✓" : "Set API key";
    btn.title = "Use your own Anthropic API key for the AI features";
    btn.style.cssText =
      "position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 12px;" +
      "border-radius:999px;border:1px solid rgba(0,0,0,.2);background:#fff;color:#222;" +
      "font:600 12px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)";
    btn.addEventListener("click", function () {
      if (getKey()) {
        if (window.confirm("Remove the saved API key from this browser?")) {
          store("del", KEY_STORAGE);
          window.location.reload();
        }
      } else if (askForKey()) {
        window.location.reload();
      }
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addKeyButton);
  } else {
    addKeyButton();
  }

  window.claude = {
    use: async function (capability) {
      // Without a key, report the capability as unavailable so each app falls
      // back to what it can do offline instead of failing on first use.
      if (capability === "sample") return getKey() ? makeSample() : null;
      if (capability === "db") return makeDb();
      return null;
    }
  };
})();
