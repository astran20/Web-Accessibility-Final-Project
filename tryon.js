(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var FAVORITES_KEY = "rethread-favorites";
  var SIZE_ORDER = { S: 1, M: 2, L: 3, XL: 4 };

  // Mirrors the 8 Explore cards in index.html. Replace with Charlie's items endpoint once it exists.
  var ITEMS = [
    { id: "item-01", name: "Brown Leather Jacket", short: "Brown jacket", category: "outerwear", size: "M", price: 68, condition: "Good", store: "Second Story Vintage", image: "assets/images/brown-jacket.jpg", alt: "Brown leather jacket", color: "#7A4A35", crop: [0.06, 0.78, 0.18, 0.16] },
    { id: "item-02", name: "Cream Knit Sweater", short: "Cream knit", category: "tops", size: "M", price: 48, condition: "Excellent", store: "Juniper & Thread", image: "assets/images/cream-knit-sweater.jpg", alt: "Cream knit sweater", color: "#B9A88F", crop: [0.36, 0.5, 0.16, 0.18] },
    { id: "item-03", name: "Blue Denim Jacket", short: "Denim jacket", category: "outerwear", size: "S", price: 84, condition: "Very good", store: "North Loop Archive", image: "assets/images/blue-denim-jacket.jpg", alt: "Light blue denim jacket", color: "#8FA9C4", crop: [0.41, 0.5, 0.08, 0.2] },
    { id: "item-04", name: "Blue Stripe Shirt", short: "Stripe shirt", category: "tops", size: "M", price: 24, condition: "Good", store: "Second Story Vintage", image: "assets/images/blue-stripe-shirt.jpg", alt: "Blue stripe shirt", color: "#A9B8D6", crop: [0.47, 0.5, 0.08, 0.25] },
    { id: "item-05", name: "Rust Floral Dress", short: "Floral dress", category: "dresses", size: "S", price: 56, condition: "Excellent", store: "Juniper & Thread", image: "assets/images/rust-floral-dress.jpg", alt: "Rust-colored floral dress", color: "#B0563B", crop: [0.38, 0.55, 0.18, 0.15] },
    { id: "item-06", name: "Vintage Blue Jeans", short: "Blue jeans", category: "denim", size: "M", price: 49, condition: "Good", store: "North Loop Archive", image: "assets/images/vintage-blue-jeans.jpg", alt: "Vintage blue jeans", color: "#6D8DB0", crop: [0.1, 0.5, 0.14, 0.2] },
    { id: "item-07", name: "Checked Blazer", short: "Checked blazer", category: "outerwear", size: "L", price: 74, condition: "Very good", store: "Second Story Vintage", image: "assets/images/checked-blazer.jpg", alt: "Green checked blazer", color: "#5B6B48", crop: [0.22, 0.74, 0.1, 0.14] },
    { id: "item-08", name: "Olive Utility Jacket", short: "Utility jacket", category: "outerwear", size: "L", price: 62, condition: "Good", store: "North Loop Archive", image: "assets/images/olive-utility-jacket.jpg", alt: "Olive utility jacket", color: "#54683F", crop: [0.6, 0.5, 0.14, 0.2] }
  ];

  // Body measurements must match the figures drawn in assets/tryon/*.svg.
  var MODELS = [
    { id: "a", name: "Model A", size: "S", build: "Slim build", image: "assets/tryon/model-a.svg", body: { s: 40, w: 26, h: 34, a: 0 } },
    { id: "b", name: "Model B", size: "M", build: "Average build", image: "assets/tryon/model-b.svg", body: { s: 46, w: 33, h: 38, a: 1 } },
    { id: "c", name: "Model C", size: "L", build: "Curvy build", image: "assets/tryon/model-c.svg", body: { s: 46, w: 38, h: 50, a: 3 } },
    { id: "d", name: "Model D", size: "XL", build: "Plus-size build", image: "assets/tryon/model-d.svg", body: { s: 54, w: 48, h: 56, a: 5 } }
  ];

  var GARMENT_TYPE = { outerwear: "outer", tops: "top", dresses: "dress", denim: "legs" };

  // ---- Garment geometry (240 x 480 figure space, centre line x = 120) ----

  var CX = 120;

  function torsoPath(b, e, bottom) {
    var s = b.s + e, w = b.w + e, h = b.h + e;
    return "M" + (CX - 12) + " 94 L" + (CX + 12) + " 94" +
      " Q" + (CX + s - 6) + " 98 " + (CX + s) + " 116" +
      " L" + (CX + s - 6) + " 150" +
      " Q" + (CX + w - 1) + " 172 " + (CX + w) + " 196" +
      " Q" + (CX + w + 1) + " 220 " + (CX + h) + " 242" +
      " L" + (CX + h) + " " + bottom + " L" + (CX - h) + " " + bottom +
      " L" + (CX - h) + " 242" +
      " Q" + (CX - w - 1) + " 220 " + (CX - w) + " 196" +
      " Q" + (CX - w + 1) + " 172 " + (CX - s + 6) + " 150" +
      " L" + (CX - s) + " 116" +
      " Q" + (CX - s + 6) + " 98 " + (CX - 12) + " 94 Z";
  }

  function dressPath(b, e) {
    var s = b.s + e, w = b.w + e, h = b.h + e;
    return "M" + (CX - 12) + " 94 L" + (CX + 12) + " 94" +
      " Q" + (CX + s - 6) + " 98 " + (CX + s) + " 116" +
      " L" + (CX + s - 6) + " 150" +
      " Q" + (CX + w - 1) + " 172 " + (CX + w) + " 196" +
      " Q" + (CX + h + 4) + " 250 " + (CX + h + 20) + " 338" +
      " L" + (CX - h - 20) + " 338" +
      " Q" + (CX - h - 4) + " 250 " + (CX - w) + " 196" +
      " Q" + (CX - w + 1) + " 172 " + (CX - s + 6) + " 150" +
      " L" + (CX - s) + " 116" +
      " Q" + (CX - s + 6) + " 98 " + (CX - 12) + " 94 Z";
  }

  function jeansPath(b, e) {
    var w = b.w + e, h = b.h + e, ankle = b.h * 0.55 + 8 + e;
    return "M" + (CX - w) + " 196 L" + (CX + w) + " 196" +
      " Q" + (CX + w + 1) + " 220 " + (CX + h) + " 242" +
      " L" + (CX + ankle) + " 438 L" + (CX + 4) + " 438 L" + CX + " 262" +
      " L" + (CX - 4) + " 438 L" + (CX - ankle) + " 438" +
      " L" + (CX - h) + " 242" +
      " Q" + (CX - w - 1) + " 220 " + (CX - w) + " 196 Z";
  }

  function lerpY(points, y) {
    for (var i = 0; i < points.length - 1; i++) {
      var p = points[i], q = points[i + 1];
      if (y <= q[1]) {
        var t = Math.max(0, (y - p[1]) / (q[1] - p[1]));
        return [p[0] + (q[0] - p[0]) * t, y];
      }
    }
    return points[points.length - 1];
  }

  function sleevePaths(b, e, endY) {
    var s = b.s, a = b.a;
    var outer = [[s + 4 + a + e, 118], [s + 12 + a + e, 206], [s + 15 + a + e, 292]];
    var inner = [[s - 8 - e, 150], [s - e, 206], [s + 3 - e, 294]];
    var pts = [[s - 16, 102], [s - 4 + e, 104], outer[0]];
    outer.forEach(function (p) { if (p[1] > outer[0][1] && p[1] < endY) pts.push(p); });
    pts.push(lerpY(outer, endY), lerpY(inner, endY));
    inner.slice().reverse().forEach(function (p) { if (p[1] < endY && p[1] > inner[0][1]) pts.push(p); });
    pts.push(inner[0]);
    function toPath(sign) {
      return "M" + pts.map(function (p) { return (CX + sign * p[0]).toFixed(1) + " " + p[1].toFixed(1); }).join(" L") + " Z";
    }
    return [toPath(1), toPath(-1)];
  }

  function garmentShapes(type, b) {
    if (type === "legs") return { fills: [jeansPath(b, 2)], details: ["M" + CX + " 198 L" + CX + " 232"] };
    if (type === "dress") return { fills: [dressPath(b, 3)].concat(sleevePaths(b, 2, 288)), details: ["M" + (CX - 10) + " 96 Q" + CX + " 112 " + (CX + 10) + " 96"] };
    if (type === "top") return { fills: [torsoPath(b, 3, 250)].concat(sleevePaths(b, 2, 286)), details: ["M" + (CX - 11) + " 96 Q" + CX + " 106 " + (CX + 11) + " 96"] };
    return {
      fills: [torsoPath(b, 6, 270)].concat(sleevePaths(b, 3, 290)),
      details: [
        "M" + CX + " 120 L" + CX + " 270",
        "M" + (CX - 12) + " 95 L" + CX + " 120 L" + (CX + 12) + " 95",
        "M" + (CX - 12) + " 95 L" + (CX - 20) + " 130 L" + (CX - 4) + " 150",
        "M" + (CX + 12) + " 95 L" + (CX + 20) + " 130 L" + (CX + 4) + " 150"
      ]
    };
  }

  function garmentBox(type, b) {
    var half = b.s + b.a + 22;
    if (type === "legs") return { x: CX - b.h - 12, y: 190, w: (b.h + 12) * 2, h: 252 };
    if (type === "dress") return { x: CX - Math.max(half, b.h + 26), y: 90, w: Math.max(half, b.h + 26) * 2, h: 252 };
    return { x: CX - half, y: 90, w: half * 2, h: 206 };
  }

  // ---- Fit estimate (simulated) ----

  function fitFor(model, item) {
    var diff = SIZE_ORDER[item.size] - SIZE_ORDER[model.size];
    var fit;
    if (diff === 0) fit = { label: "True to size", note: "This size " + item.size + " piece matches " + model.name + "'s usual size " + model.size + ", so it should fit as intended." };
    else if (diff === 1) fit = { label: "Relaxed fit", note: "This piece is size " + item.size + "; " + model.name + " usually wears " + model.size + ", so expect a looser, roomier fit." };
    else if (diff >= 2) fit = { label: "Oversized", note: "This piece is " + diff + " sizes up from " + model.name + "'s usual " + model.size + ". Expect a slouchy, oversized look with longer sleeves." };
    else if (diff === -1) fit = { label: "Snug fit", note: "This piece is size " + item.size + "; " + model.name + " usually wears " + model.size + ", so it may feel tight across the shoulders or hips." };
    else fit = { label: "Likely too small", note: "This piece is " + (-diff) + " sizes smaller than " + model.name + "'s usual " + model.size + ". Try it in store before deciding." };
    fit.diff = diff;
    fit.score = Math.max(35, 96 - 22 * Math.abs(diff));
    fit.scale = diff > 0 ? 1 + 0.05 * diff : 1 + 0.025 * diff;
    fit.stretch = diff > 0 ? 1 + 0.03 * diff : 1;
    return fit;
  }

  // ---- Rendering ----

  var renderCount = 0;

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function lookLabel(model, item, fit) {
    return "Simulated try-on: " + item.name + ", size " + item.size + ", on " + model.name + ", size " + model.size + ", " + model.build.toLowerCase() + ". " + fit.label + ".";
  }

  function renderLook(model, item) {
    var id = "rt-look-" + (++renderCount);
    var type = GARMENT_TYPE[item.category];
    var b = model.body;
    var fit = fitFor(model, item);
    var shapes = garmentShapes(type, b);
    var box = garmentBox(type, b);
    var c = item.crop;

    var svg = el("svg", { viewBox: "0 0 240 480", role: "img", "aria-label": lookLabel(model, item, fit), class: "rt-look-svg" });
    var defs = el("defs", {}, svg);
    var clip = el("clipPath", { id: id + "-clip" }, defs);
    shapes.fills.forEach(function (d) { el("path", { d: d }, clip); });
    var shade = el("linearGradient", { id: id + "-shade", x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
    [["0", "#000", "0.28"], ["0.3", "#000", "0"], ["0.7", "#000", "0"], ["1", "#000", "0.28"]].forEach(function (s) {
      el("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] }, shade);
    });

    el("image", { href: model.image, x: 0, y: 0, width: 240, height: 480 }, svg);

    var garment = el("g", { class: "rt-look-garment", transform: "translate(" + CX + " " + box.y + ") scale(" + fit.scale + " " + fit.stretch + ") translate(" + -CX + " " + -box.y + ")" }, svg);
    var clipped = el("g", { "clip-path": "url(#" + id + "-clip)" }, garment);
    el("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: item.color }, clipped);
    el("image", {
      href: item.image,
      x: box.x - c[0] * box.w / c[2], y: box.y - c[1] * box.h / c[3],
      width: box.w / c[2], height: box.h / c[3],
      preserveAspectRatio: "none", opacity: "0.9"
    }, clipped);
    el("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: "url(#" + id + "-shade)" }, clipped);
    shapes.fills.forEach(function (d) { el("path", { d: d, fill: "none", stroke: "rgba(36,60,50,0.55)", "stroke-width": "1.2" }, garment); });
    shapes.details.forEach(function (d) { el("path", { d: d, fill: "none", stroke: "rgba(20,20,20,0.45)", "stroke-width": "1.4", "stroke-linecap": "round" }, garment); });

    return { svg: svg, fit: fit };
  }

  // ---- Favorites (shared localStorage key so other pages can read it) ----

  function readFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch (err) { return []; }
  }

  function writeFavorites(ids) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch (err) { /* storage unavailable: keep in-page state only */ }
  }

  // ---- Page wiring ----

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function init() {
    var root = document.querySelector("[data-tryon]");
    if (!root) return;

    var modelList = root.querySelector("[data-tryon-models]");
    var itemList = root.querySelector("[data-tryon-items]");
    var stage = root.querySelector("[data-tryon-stage]");
    var progress = root.querySelector("[data-tryon-progress]");
    var status = root.querySelector("[data-tryon-status]");
    var fitLabel = root.querySelector("[data-tryon-fit-label]");
    var fitScore = root.querySelector("[data-tryon-fit-score]");
    var fitNote = root.querySelector("[data-tryon-fit-note]");
    var caption = root.querySelector("[data-tryon-caption]");
    var saveButton = root.querySelector("[data-tryon-save]");
    var viewLink = root.querySelector("[data-tryon-view]");
    var bookLink = root.querySelector("[data-tryon-book]");
    var pinButton = root.querySelector("[data-tryon-pin]");
    var compare = root.querySelector("[data-tryon-compare]");
    var pinnedSlot = root.querySelector("[data-tryon-pinned]");
    var currentSlot = root.querySelector("[data-tryon-current]");
    var unpinButton = root.querySelector("[data-tryon-unpin]");

    var params = new URLSearchParams(window.location.search);
    var state = {
      model: find(MODELS, params.get("model")) || MODELS[1],
      item: find(ITEMS, params.get("item")) || ITEMS[0],
      pinned: null,
      timer: null
    };
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    MODELS.forEach(function (model) {
      var label = document.createElement("label");
      label.className = "rt-choice rt-choice-model";
      label.innerHTML =
        '<input type="radio" name="tryon-model" value="' + model.id + '">' +
        '<img src="' + model.image + '" alt="">' +
        '<span class="rt-choice-name">' + model.name + '</span>' +
        '<span class="rt-choice-meta">Size ' + model.size + ' · ' + model.build + '</span>';
      modelList.appendChild(label);
    });

    ITEMS.forEach(function (item) {
      var label = document.createElement("label");
      label.className = "rt-choice rt-choice-item";
      label.innerHTML =
        '<input type="radio" name="tryon-item" value="' + item.id + '">' +
        '<img src="' + item.image + '" alt="">' +
        '<span class="rt-choice-name">' + item.name + '</span>' +
        '<span class="rt-choice-meta">Size ' + item.size + ' · $' + item.price + '</span>';
      itemList.appendChild(label);
    });

    function syncChoices() {
      root.querySelectorAll('input[name="tryon-model"]').forEach(function (input) { input.checked = input.value === state.model.id; });
      root.querySelectorAll('input[name="tryon-item"]').forEach(function (input) { input.checked = input.value === state.item.id; });
    }

    function updateSave() {
      var saved = readFavorites().indexOf(state.item.id) !== -1;
      saveButton.setAttribute("data-favorite-toggle", state.item.id);
      saveButton.setAttribute("aria-pressed", String(saved));
      saveButton.classList.toggle("is-saved", saved);
      saveButton.textContent = saved ? "Saved to Favorites" : "Save to Favorites";
    }

    function showResult(quiet) {
      var look = renderLook(state.model, state.item);
      stage.replaceChildren(look.svg);
      stage.classList.remove("is-loading");
      progress.hidden = true;
      caption.textContent = state.item.name + " (size " + state.item.size + ") on " + state.model.name + " (size " + state.model.size + ")";
      fitLabel.textContent = look.fit.label;
      fitLabel.setAttribute("data-fit", look.fit.diff === 0 ? "match" : Math.abs(look.fit.diff) === 1 ? "near" : "far");
      fitScore.textContent = look.fit.score + "% simulated fit match";
      fitNote.textContent = look.fit.note;
      viewLink.href = "item.html#" + state.item.id;
      bookLink.href = "booking.html?item=" + state.item.id;
      updateSave();
      if (!quiet) status.textContent = "Showing " + caption.textContent + ". " + look.fit.label + ". " + look.fit.note;
      if (state.pinned) renderCompare();
    }

    function runTryOn() {
      clearTimeout(state.timer);
      syncChoices();
      if (reduceMotion) { showResult(); return; }
      var steps = ["Detecting body landmarks…", "Mapping the garment to the body…", "Estimating fit…"];
      var step = 0;
      stage.classList.add("is-loading");
      progress.hidden = false;
      progress.textContent = steps[0];
      (function next() {
        state.timer = setTimeout(function () {
          step += 1;
          if (step < steps.length) { progress.textContent = steps[step]; next(); }
          else showResult();
        }, 380);
      })();
    }

    function lookCard(slot, model, item) {
      var look = renderLook(model, item);
      slot.querySelector("[data-look-figure]").replaceChildren(look.svg);
      slot.querySelector("[data-look-caption]").textContent = item.name + " on " + model.name;
      slot.querySelector("[data-look-fit]").textContent = look.fit.label + " · " + look.fit.score + "% match";
    }

    function renderCompare() {
      lookCard(pinnedSlot, state.pinned.model, state.pinned.item);
      lookCard(currentSlot, state.model, state.item);
    }

    modelList.addEventListener("change", function (event) {
      state.model = find(MODELS, event.target.value) || state.model;
      runTryOn();
    });

    itemList.addEventListener("change", function (event) {
      state.item = find(ITEMS, event.target.value) || state.item;
      runTryOn();
    });

    saveButton.addEventListener("click", function () {
      var ids = readFavorites();
      var index = ids.indexOf(state.item.id);
      if (index === -1) ids.push(state.item.id); else ids.splice(index, 1);
      writeFavorites(ids);
      updateSave();
      status.textContent = state.item.name + (index === -1 ? " saved to Favorites." : " removed from Favorites.");
    });

    pinButton.addEventListener("click", function () {
      state.pinned = { model: state.model, item: state.item };
      compare.hidden = false;
      renderCompare();
      status.textContent = "Pinned " + state.item.name + " on " + state.model.name + ". Choose another model or piece to compare.";
    });

    unpinButton.addEventListener("click", function () {
      state.pinned = null;
      compare.hidden = true;
      status.textContent = "Comparison cleared.";
      pinButton.focus();
    });

    root.classList.add("is-ready");
    syncChoices();
    showResult(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
