(function () {
  "use strict";

  // Simulated "AI" style assistant: keyword matching over the catalog (a basic form of content-based filtering).

  var CATEGORY_WORDS = [
    [/\b(jackets?|coats?|outerwear|blazers?|outer layers?)\b/, "outerwear"],
    [/\b(sweaters?|jumpers?|knits?|pullovers?|shirts?|blouses?|tops?|tees?|t-shirts?|button[- ]?ups?)\b/, "tops"],
    [/\b(dress|dresses)\b/, "dresses"],
    [/\b(jeans|pants|trousers)\b/, "denim"]
  ];

  var TAG_WORDS = [
    [/\b(warm|cozy|cosy|winter|cold|chilly)\b/, "warm"],
    [/\b(work|office|interview|professional|business|smart|formal)\b/, "work"],
    [/\b(casual|everyday|relaxed|weekend|laid[- ]back)\b/, "casual"],
    [/\b(date|party|night out|going out|dinner|evening)\b/, "going-out"],
    [/\b(summer|spring|hot weather|breezy)\b/, "summer"],
    [/\b(vintage|retro|classic)\b/, "vintage"],
    [/\b(layer|layers|layering)\b/, "layering"],
    [/\bdenim\b/, "denim"],
    [/\b(knit|knitted|wool)\b/, "knit"],
    [/\bleather\b/, "leather"],
    [/\b(floral|flowers?|flowery)\b/, "floral"],
    [/\b(shirt|button[- ]?up)\b/, "shirt"],
    [/\b(blazer|tailored)\b/, "tailored"],
    [/\b(utility|pockets)\b/, "utility"]
  ];

  var COLOR_WORDS = [
    [/\b(brown|tan|camel|chocolate)\b/, "brown"],
    [/\b(cream|beige|ivory|oatmeal)\b/, "cream"],
    [/\bneutrals?\b/, "neutral"],
    [/\b(blue|navy|indigo)\b/, "blue"],
    [/\b(green|sage|forest)\b/, "green"],
    [/\b(olive|khaki)\b/, "olive"],
    [/\b(rust|orange|terracotta)\b/, "rust"],
    [/\b(red|burgundy)\b/, "red"],
    [/\bwhite\b/, "white"],
    [/\b(black|charcoal)\b/, "black"]
  ];

  var CATEGORY_LABEL = { outerwear: "a jacket or outer layer", tops: "a top", dresses: "a dress", denim: "jeans" };
  var TAG_LABEL = {
    warm: "warm", work: "good for work", casual: "casual", "going-out": "good for going out", summer: "light for warm weather",
    vintage: "vintage", layering: "easy to layer", denim: "denim", knit: "knit", leather: "leather", floral: "floral",
    shirt: "button-up", tailored: "tailored", utility: "utility pockets"
  };
  var SIZE_WORDS = { xs: "XS", s: "S", small: "S", m: "M", medium: "M", l: "L", large: "L", xl: "XL", "extra large": "XL", "extra-large": "XL" };

  function collect(list, q) {
    var found = [];
    list.forEach(function (entry) { if (entry[0].test(q) && found.indexOf(entry[1]) === -1) found.push(entry[1]); });
    return found;
  }

  function parse(text) {
    var q = " " + text.toLowerCase().replace(/[“”"]/g, " ") + " ";
    var request = {
      categories: collect(CATEGORY_WORDS, q),
      tags: collect(TAG_WORDS, q),
      colors: collect(COLOR_WORDS, q),
      size: null, min: null, max: null
    };

    var size = q.match(/\bsize\s*(xs|s|m|l|xl|small|medium|large)\b/) || q.match(/\b(extra[- ]large|xl|small|medium|large)\b/) || q.match(/\b(?:in an?|in)\s+(s|m|l)\b/);
    if (size) request.size = SIZE_WORDS[size[1]];

    var range = q.match(/\$?\s*(\d+)\s*(?:-|–|to)\s*\$?\s*(\d+)/);
    var under = q.match(/(?:under|below|less than|max|maximum|up to|no more than|<)\s*\$?\s*(\d+)/);
    var over = q.match(/(?:over|above|more than|at least)\s*\$?\s*(\d+)/);
    var bare = q.match(/\$\s*(\d+)/);
    if (range) { request.min = +range[1]; request.max = +range[2]; }
    else if (under) request.max = +under[1];
    else if (over) request.min = +over[1];
    else if (bare) request.max = +bare[1];
    if (request.max === null && /\b(cheap|budget|affordable|inexpensive)\b/.test(q)) request.max = 50;

    request.understood = request.categories.length + request.tags.length + request.colors.length +
      (request.size ? 1 : 0) + (request.min !== null || request.max !== null ? 1 : 0) > 0;
    return request;
  }

  // Words that carry meaning but that none of the word lists above understand
  var FILLER = /^(a|an|the|for|to|of|in|on|at|with|and|or|but|my|me|i|im|i'm|want|need|looking|look|find|show|something|some|anything|any|piece|pieces|clothes|clothing|outfit|please|thanks|like|would|could|can|you|that|this|is|it|be|good|nice|new|wear|go|going|get|dollars|size|under|below|over|above|less|more|than|max|maximum|up|least|no|between|cheap|budget|affordable|inexpensive)$/;
  function unknownWords(text) {
    var words = text.toLowerCase().replace(/[“”"$.,!?]/g, " ").split(/\s+/).filter(Boolean);
    return words.filter(function (word) {
      if (FILLER.test(word) || /^\d/.test(word) || word.length < 3) return false;
      var padded = " " + word + " ";
      var lists = [CATEGORY_WORDS, TAG_WORDS, COLOR_WORDS];
      for (var i = 0; i < lists.length; i++) {
        for (var j = 0; j < lists[i].length; j++) { if (lists[i][j][0].test(padded)) return false; }
      }
      return !SIZE_WORDS[word];
    }).filter(function (word, i, all) { return all.indexOf(word) === i; });
  }

  function passes(item, request, rules) {
    if (rules.category && request.categories.length && request.categories.indexOf(item.category) === -1) return false;
    if (rules.size && request.size && item.size !== request.size) return false;
    if (rules.price && request.max !== null && item.price > request.max) return false;
    if (rules.price && request.min !== null && item.price < request.min) return false;
    return true;
  }

  var SIZE_ORDER = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };

  function score(item, request) {
    var colorHits = request.colors.filter(function (c) { return item.colors.indexOf(c) !== -1; }).length;
    var tagHits = request.tags.filter(function (t) { return item.tags.indexOf(t) !== -1; }).length;
    var sizeGap = request.size ? Math.abs(SIZE_ORDER[item.size] - SIZE_ORDER[request.size]) : 0;
    return colorHits * 2 + tagHits * 1.5 - sizeGap * 0.5;
  }

  function recommend(items, request) {
    var steps = [
      { rules: { category: true, size: true, price: true }, note: "" },
      { rules: { category: true, size: false, price: true }, note: "Nothing in size " + request.size + " matched, so I included other sizes." },
      { rules: { category: true, size: false, price: false }, note: "Nothing matched your budget, so these are the closest pieces over it." },
      { rules: { category: false, size: false, price: false }, note: "I couldn't find that exact type of piece, so here are the closest matches." }
    ];
    var hasSoftTerms = request.colors.length + request.tags.length > 0;
    for (var i = 0; i < steps.length; i++) {
      if (i === 1 && !request.size) continue;
      if (i === 2 && request.max === null && request.min === null) continue;
      var matches = items.filter(function (item) { return passes(item, request, steps[i].rules); })
        .map(function (item) { return { item: item, score: score(item, request), soft: score(item, { colors: request.colors, tags: request.tags }) }; });
      var onlySoft = !request.categories.length && !request.size && request.max === null && request.min === null;
      if (onlySoft || (i === 3 && hasSoftTerms)) matches = matches.filter(function (m) { return m.soft > 0; });
      if (matches.length) {
        matches.sort(function (a, b) { return b.score - a.score || a.item.price - b.item.price; });
        return { results: matches.slice(0, 3).map(function (m) { return m.item; }), note: steps[i].note, total: matches.length };
      }
      if (onlySoft) break;
    }
    return { results: [], note: "", total: 0 };
  }

  function reasonsFor(item, request) {
    var reasons = [];
    if (request.categories.indexOf(item.category) !== -1) reasons.push(CATEGORY_LABEL[item.category]);
    if (request.size) reasons.push(item.size === request.size ? "size " + item.size : "size " + item.size + " (you asked for " + request.size + ")");
    if (request.max !== null) reasons.push("$" + item.price + (item.price <= request.max ? " (under $" + request.max + ")" : " (over your $" + request.max + " budget)"));
    else if (request.min !== null) reasons.push("$" + item.price);
    request.colors.forEach(function (c) { if (item.colors.indexOf(c) !== -1) reasons.push(c); });
    request.tags.forEach(function (t) { if (item.tags.indexOf(t) !== -1) reasons.push(TAG_LABEL[t]); });
    return reasons.length ? reasons : ["a close overall match"];
  }

  function summary(request) {
    var parts = [];
    if (request.categories.length) parts.push(request.categories.map(function (c) { return CATEGORY_LABEL[c]; }).join(" or "));
    if (request.size) parts.push("size " + request.size);
    if (request.min !== null && request.max !== null) parts.push("$" + request.min + "–$" + request.max);
    else if (request.max !== null) parts.push("under $" + request.max);
    else if (request.min !== null) parts.push("over $" + request.min);
    request.colors.forEach(function (c) { parts.push(c); });
    request.tags.forEach(function (t) { parts.push(TAG_LABEL[t]); });
    return parts.join(", ");
  }

  // ---- Chat UI ----

  function init() {
    var root = document.querySelector("[data-assistant]");
    var catalog = window.RETHREAD_TRYON && window.RETHREAD_TRYON.items;
    if (!root || !catalog) return;

    var log = root.querySelector("[data-assistant-log]");
    var form = root.querySelector("[data-assistant-form]");
    var input = root.querySelector("[data-assistant-input]");
    var field = root.querySelector("[data-assistant-field]");
    var error = root.querySelector("[data-assistant-error]");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pending = null;

    function node(tag, className, text) {
      var n = document.createElement(tag);
      if (className) n.className = className;
      if (text) n.textContent = text;
      return n;
    }

    function addMessage(role, children) {
      var li = node("li", "rt-msg rt-msg-" + role);
      li.appendChild(node("span", "rt-visually-hidden", role === "user" ? "You said:" : "Assistant:"));
      children.forEach(function (c) { li.appendChild(typeof c === "string" ? node("p", "", c) : c); });
      log.appendChild(li);
      log.scrollTop = Math.max(0, li.offsetTop - 12);
      return li;
    }

    function resultCard(item, request) {
      var li = node("li", "rt-rec");
      var img = node("img");
      img.src = item.image;
      img.alt = "";
      li.appendChild(img);
      var body = node("div", "rt-rec-body");
      body.appendChild(node("p", "rt-rec-name", item.name));
      body.appendChild(node("p", "rt-rec-meta", "Size " + item.size + " · $" + item.price + " · " + item.store));
      body.appendChild(node("p", "rt-rec-why", "Why: " + reasonsFor(item, request).join(", ") + "."));
      var actions = node("div", "rt-rec-actions");
      var tryButton = node("button", "rt-button rt-button-primary rt-rec-button", "Try it on");
      tryButton.type = "button";
      tryButton.setAttribute("aria-label", "Try on " + item.name);
      tryButton.addEventListener("click", function () {
        if (!window.RETHREAD_TRYON.tryItem) { window.location.href = "virtual-try-on.html?item=" + item.id; return; }
        closePanel(false);
        window.RETHREAD_TRYON.tryItem(item.id);
      });
      var view = node("a", "rt-button rt-button-secondary rt-rec-button", "View");
      view.href = "item.html#" + item.id;
      view.setAttribute("aria-label", "View " + item.name);
      actions.appendChild(tryButton);
      actions.appendChild(view);
      body.appendChild(actions);
      li.appendChild(body);
      return li;
    }

    function reply(text) {
      var request = parse(text);
      if (!request.understood) {
        return ["I couldn't pick out a type of piece, size, color, budget or occasion in that. Try something like “warm jacket under $70” or tap a suggestion below."];
      }
      var found = recommend(catalog, request);
      if (!found.results.length) {
        return ["I looked for " + summary(request) + ", but nothing in the current edit matches. Try a different color or occasion, or browse everything on the Explore page."];
      }
      var parts = ["I looked for " + summary(request) + "."];
      // Part C (HE-20): be upfront when a color or word didn't match, instead of calling everything a match
      var missingColors = request.colors.filter(function (c) {
        return !found.results.some(function (item) { return item.colors.indexOf(c) !== -1; });
      });
      var closeOnly = missingColors.length > 0;
      if (found.note) parts.push(node("p", "rt-msg-note", found.note));
      if (closeOnly) parts.push(node("p", "rt-msg-note", "Nothing in " + missingColors.join(" or ") + " right now, so these are the closest pieces in other colors."));
      var unknown = unknownWords(text);
      if (unknown.length) parts.push(node("p", "rt-msg-note", "I don't know how to search for “" + unknown.join("”, “") + "” yet, so I left that out."));
      if (closeOnly) parts.push(found.results.length === 1 ? "Here's the closest one:" : "Here are the closest " + found.results.length + ":");
      else parts.push(found.results.length === 1 ? "Here's the best match:" : "Here are the top " + found.results.length + " matches:");
      var list = node("ul", "rt-rec-list");
      found.results.forEach(function (item) { list.appendChild(resultCard(item, request)); });
      parts.push(list);
      return parts;
    }

    function ask(text) {
      clearTimeout(pending);
      var old = log.querySelector(".rt-msg-typing");
      if (old) old.remove();
      addMessage("user", [text]);
      if (reduceMotion) { addMessage("bot", reply(text)); return; }
      var typing = addMessage("bot", [node("p", "rt-typing", "Thinking…")]);
      typing.classList.add("rt-msg-typing");
      typing.setAttribute("aria-hidden", "true");
      pending = setTimeout(function () {
        typing.remove();
        addMessage("bot", reply(text));
      }, 650);
    }

    function setError(show) {
      error.hidden = !show;
      field.classList.toggle("is-invalid", show);
      input.setAttribute("aria-invalid", String(show));
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text) { setError(true); input.focus(); return; }
      setError(false);
      input.value = "";
      ask(text);
    });

    input.addEventListener("input", function () { if (input.value.trim()) setError(false); });

    root.querySelectorAll("[data-assistant-chip]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        setError(false);
        ask(chip.textContent.trim());
      });
    });

    var openers = document.querySelectorAll("[data-assistant-open]");
    var launcher = document.querySelector(".rt-assistant-launcher");
    var lastOpener = launcher;

    function openPanel(opener) {
      lastOpener = opener || launcher;
      root.hidden = false;
      document.body.classList.add("rt-assistant-open");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
      var last = log.lastElementChild;
      if (last) log.scrollTop = Math.max(0, last.offsetTop - 12);
      input.focus();
    }

    function closePanel(returnFocus) {
      if (root.hidden) return;
      root.hidden = true;
      document.body.classList.remove("rt-assistant-open");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
      setError(false);
      if (returnFocus && lastOpener) lastOpener.focus();
    }

    openers.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b === launcher && !root.hidden) closePanel(true);
        else openPanel(b);
      });
    });
    root.querySelector("[data-assistant-close]").addEventListener("click", function () { closePanel(true); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !root.hidden) closePanel(true);
    });

    addMessage("bot", ["Hi! Tell me what you're looking for: a type of piece, size, color, budget or occasion. I'll suggest pieces from the local shops, and you can put any of them on a model in the preview."]);
    launcher.hidden = false;

    // Part C (HE-19): tuck the floating button away while the in-page "Ask" button or the
    // preview's action buttons are on screen, so it never covers "Book an in-store fitting".
    var covered = document.querySelectorAll(".rt-assistant-prompt, [data-tryon-book]");
    if ("IntersectionObserver" in window && covered.length) {
      var visible = new Set();
      var watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
        });
        launcher.classList.toggle("is-tucked", visible.size > 0);
      }, { rootMargin: "0px 0px -40px 0px" });
      covered.forEach(function (el) { watcher.observe(el); });
    }
    var prompt = document.querySelector("[data-assistant-prompt]");
    if (prompt) prompt.hidden = false;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
