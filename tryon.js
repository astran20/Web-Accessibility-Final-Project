(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var FAVORITES_KEY = "rethread-favorites";
  var SIZE_ORDER = { S: 1, M: 2, L: 3, XL: 4 };

  // Mirrors the 8 Explore cards in index.html. Replace with Charlie's items endpoint once it exists.
  // `look` describes how each piece is illustrated on the figure; colours are sampled from the listing photo.
  var ITEMS = [
    { id: "item-01", name: "Brown Leather Jacket", category: "outerwear", size: "M", price: 68, store: "Second Story Vintage", colors: ["brown"], tags: ["warm", "leather", "vintage", "layering", "casual", "going-out"],
      image: "assets/images/brown-jacket.jpg",
      look: { kind: "jacket", fabric: "leather", base: "#6E4130", light: "#93604A", dark: "#4A2A1E", line: "#33190F", hem: 274, open: true, inner: "#7A2E2E", lapels: true, pockets: "welt", buttons: [176, 212] } },
    { id: "item-02", name: "Cream Knit Sweater", category: "tops", size: "M", price: 48, store: "Juniper & Thread", colors: ["cream", "beige", "neutral"], tags: ["warm", "knit", "casual", "layering"],
      image: "assets/images/cream-knit-sweater.jpg",
      look: { kind: "top", fabric: "knit", base: "#CBB99C", dark: "#A8957A", line: "#8A785D", hem: 256, neck: "crew", rib: true } },
    { id: "item-03", name: "Blue Denim Jacket", category: "outerwear", size: "S", price: 84, store: "North Loop Archive", colors: ["blue"], tags: ["denim", "casual", "layering", "warm"],
      image: "assets/images/blue-denim-jacket.jpg",
      look: { kind: "jacket", fabric: "denim", base: "#93AECB", light: "#B3C7DC", dark: "#7894B4", line: "#56708F", hem: 262, collar: "sherpa", chestPockets: true, waistband: true, stitch: "#C9925A", buttons: [122, 152, 182, 212, 242] } },
    { id: "item-04", name: "Blue Stripe Shirt", category: "tops", size: "M", price: 24, store: "Second Story Vintage", colors: ["blue", "white"], tags: ["shirt", "work", "casual", "summer"],
      image: "assets/images/blue-stripe-shirt.jpg",
      look: { kind: "top", fabric: "stripe", base: "#E8EEF7", dark: "#7F98C4", line: "#6A80A8", hem: 262, neck: "high", collar: "shirt", placket: true, cuffs: true } },
    { id: "item-05", name: "Rust Floral Dress", category: "dresses", size: "S", price: 56, store: "Juniper & Thread", colors: ["rust", "orange", "red"], tags: ["floral", "going-out", "summer", "vintage"],
      image: "assets/images/rust-floral-dress.jpg",
      look: { kind: "dress", fabric: "floral", base: "#A9533A", light: "#EFE2CE", dark: "#7E3A26", line: "#5E2716", hem: 340 } },
    { id: "item-06", name: "Vintage Blue Jeans", category: "denim", size: "M", price: 49, store: "North Loop Archive", colors: ["blue"], tags: ["denim", "casual", "vintage"],
      image: "assets/images/vintage-blue-jeans.jpg",
      look: { kind: "jeans", fabric: "denim", base: "#6F8FB2", light: "#A4BCD6", dark: "#56769A", line: "#3F5878", stitch: "#C9925A" } },
    { id: "item-07", name: "Checked Blazer", category: "outerwear", size: "L", price: 74, store: "Second Story Vintage", colors: ["green"], tags: ["tailored", "work", "vintage", "layering"],
      image: "assets/images/checked-blazer.jpg",
      look: { kind: "jacket", fabric: "houndstooth", base: "#9AA677", dark: "#2F3A27", line: "#232C1C", hem: 280, open: true, inner: "#F3EEE2", lapels: true, pockets: "flap", buttons: [186] } },
    { id: "item-08", name: "Olive Utility Jacket", category: "outerwear", size: "L", price: 62, store: "North Loop Archive", colors: ["green", "olive"], tags: ["casual", "layering", "utility"],
      image: "assets/images/olive-utility-jacket.jpg",
      look: { kind: "jacket", fabric: "twill", base: "#5A6D42", light: "#6E8352", dark: "#475932", line: "#2C391C", hem: 268, collar: "shirt", chestPockets: true, stitch: "#7E9160", buttons: [114, 142, 170, 198, 226, 254] } }
  ];

  // figure-geometry:start (also read by tools/generate-tryon-models.js to draw assets/tryon/*.svg)
  var CX = 120;
  var BASE_TEE = "#D9D1C3";
  var BASE_SHORTS = "#8A8274";

  var MODELS = [
    { id: "a", name: "Model A", size: "S", build: "Slim build", image: "assets/tryon/model-a.svg", skin: "#F1C9A5", hair: "#3B2A20", hairStyle: "long", body: { s: 40, w: 27, h: 35, a: 0 } },
    { id: "b", name: "Model B", size: "M", build: "Average build", image: "assets/tryon/model-b.svg", skin: "#8D5A3B", hair: "#1D1A18", hairStyle: "short", body: { s: 46, w: 34, h: 39, a: 1 } },
    { id: "c", name: "Model C", size: "L", build: "Curvy build", image: "assets/tryon/model-c.svg", skin: "#C68B5E", hair: "#2A1D15", hairStyle: "bun", body: { s: 46, w: 38, h: 50, a: 3 } },
    { id: "d", name: "Model D", size: "XL", build: "Plus-size build", image: "assets/tryon/model-d.svg", skin: "#5E3B28", hair: "#141210", hairStyle: "curly", body: { s: 54, w: 49, h: 57, a: 5 } }
  ];

  // Limbs are [x offset from centre, y, half width] joints; the left side mirrors the right.
  function armJoints(b) {
    return [[b.s - 6, 106, 9 + b.a * 0.6], [b.s + 6 + b.a * 0.5, 198, 7.5 + b.a * 0.5], [b.s + 13 + b.a * 0.6, 282, 5.5 + b.a * 0.3]];
  }

  function legJoints(b) {
    return [[b.h * 0.5, 242, b.h * 0.5 + 1], [b.h * 0.36 + 3, 345, 10 + b.h * 0.07], [b.h * 0.28 + 4, 436, 6.5 + b.h * 0.04]];
  }

  function limbAt(joints, y) {
    if (y <= joints[0][1]) return [joints[0][0], joints[0][2]];
    for (var i = 0; i < joints.length - 1; i++) {
      var p = joints[i], q = joints[i + 1];
      if (y <= q[1]) {
        var t = (y - p[1]) / (q[1] - p[1]);
        return [p[0] + (q[0] - p[0]) * t, p[2] + (q[2] - p[2]) * t];
      }
    }
    var last = joints[joints.length - 1];
    return [last[0], last[2]];
  }

  function sampleYs(y0, y1) {
    var ys = [];
    for (var y = y0; y < y1; y += 6) ys.push(y);
    ys.push(y1);
    return ys;
  }

  function fmt(n) { return Math.round(n * 10) / 10; }

  function pointsPath(points) {
    return "M" + points.map(function (p) { return fmt(p[0]) + " " + fmt(p[1]); }).join(" L") + " Z";
  }

  function limbPath(joints, side, e, y0, y1) {
    var ys = sampleYs(y0, y1);
    var outer = ys.map(function (y) { var l = limbAt(joints, y); return [CX + side * (l[0] + l[1] + e), y]; });
    var inner = ys.map(function (y) { var l = limbAt(joints, y); return [CX + side * (l[0] - l[1] - e), y]; }).reverse();
    return pointsPath(outer.concat(inner));
  }

  var NECKLINES = {
    crew: function () { return " Q" + CX + " 104 " + (CX + 13) + " 92"; },
    high: function () { return " Q" + CX + " 99 " + (CX + 13) + " 92"; },
    v: function () { return " L" + CX + " 128 L" + (CX + 13) + " 92"; }
  };

  function upperRight(b, e) {
    return " Q" + (CX + b.s - 8) + " 94 " + (CX + b.s + 2 + e) + " 110" +
      " Q" + (CX + b.s + 1 + e) + " 128 " + (CX + b.s - 5 + e) + " 144" +
      " Q" + (CX + b.w + e - 1) + " 170 " + (CX + b.w + e) + " 196";
  }

  function upperLeft(b, e) {
    return " Q" + (CX - b.w - e + 1) + " 170 " + (CX - b.s + 5 - e) + " 144" +
      " Q" + (CX - b.s - 1 - e) + " 128 " + (CX - b.s - 2 - e) + " 110" +
      " Q" + (CX - b.s + 8) + " 94 " + (CX - 13) + " 92";
  }

  function torsoPath(b, e, hem, neck, flare) {
    flare = flare || 0;
    return "M" + (CX - 13) + " 92" + NECKLINES[neck]() + upperRight(b, e) +
      " Q" + (CX + b.w + e + 1) + " 220 " + (CX + b.h + e) + " 240" +
      " L" + (CX + b.h + e + flare) + " " + hem + " L" + (CX - b.h - e - flare) + " " + hem +
      " L" + (CX - b.h - e) + " 240" +
      " Q" + (CX - b.w - e - 1) + " 220 " + (CX - b.w - e) + " 196" + upperLeft(b, e) + " Z";
  }

  function dressPath(b, e, hem) {
    return "M" + (CX - 13) + " 92" + NECKLINES.v() + upperRight(b, e) +
      " Q" + (CX + b.h + e + 4) + " 252 " + (CX + b.h + e + 18) + " " + hem +
      " Q" + CX + " " + (hem + 8) + " " + (CX - b.h - e - 18) + " " + hem +
      " Q" + (CX - b.h - e - 4) + " 252 " + (CX - b.w - e) + " 196" + upperLeft(b, e) + " Z";
  }

  function bottomsPath(b, e, endY) {
    var legs = legJoints(b);
    var down = sampleYs(244, endY);
    var up = sampleYs(264, endY).reverse();
    function outerX(y) { var l = limbAt(legs, y); return l[0] + l[1] + e; }
    function innerX(y) { var l = limbAt(legs, y); return Math.max(l[0] - l[1] - e, 0.8); }
    var pts = [[CX - b.w - e, 196], [CX + b.w + e, 196], [CX + b.w + e + 1, 218], [CX + b.h + e, 240]];
    down.forEach(function (y) { pts.push([CX + outerX(y), y]); });
    up.forEach(function (y) { pts.push([CX + innerX(y), y]); });
    pts.push([CX, 258]);
    up.slice().reverse().forEach(function (y) { pts.push([CX - innerX(y), y]); });
    down.slice().reverse().forEach(function (y) { pts.push([CX - outerX(y), y]); });
    pts.push([CX - b.h - e, 240], [CX - b.w - e - 1, 218]);
    return pointsPath(pts);
  }
  // figure-geometry:end

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
    fit.ease = diff > 0 ? 2.5 * diff : 1.2 * diff;
    fit.stretch = diff > 0 ? 1 + 0.035 * diff : 1 + 0.04 * diff;
    return fit;
  }

  // ---- Garment illustration ----

  var renderCount = 0;

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function defineFabric(defs, id, look) {
    var f = look.fabric;
    if (f === "leather") {
      var g = el("linearGradient", { id: id, x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
      el("stop", { offset: "0", "stop-color": look.light }, g);
      el("stop", { offset: "0.45", "stop-color": look.base }, g);
      el("stop", { offset: "1", "stop-color": look.dark }, g);
      return;
    }
    var sizes = { knit: [7, 8], denim: [5, 5], twill: [5, 5], stripe: [8, 8], floral: [24, 24], houndstooth: [6, 6] };
    var p = el("pattern", { id: id, width: sizes[f][0], height: sizes[f][1], patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: sizes[f][0], height: sizes[f][1], fill: look.base }, p);
    if (f === "knit") {
      el("path", { d: "M0 0 L3.5 4 L7 0 M0 4 L3.5 8 L7 4", fill: "none", stroke: look.dark, "stroke-width": "1.1" }, p);
    } else if (f === "denim" || f === "twill") {
      el("path", { d: "M0 5 L5 0 M-1 1 L1 -1 M4 6 L6 4", stroke: look.dark, "stroke-width": "0.8", opacity: "0.8" }, p);
      el("path", { d: "M0 2.5 L2.5 0", stroke: look.light, "stroke-width": "0.5", opacity: "0.6" }, p);
    } else if (f === "stripe") {
      el("rect", { x: 0, width: 1.6, height: 8, fill: look.dark }, p);
    } else if (f === "floral") {
      [[6, 7, 1], [18, 18, 0.8]].forEach(function (fl) {
        for (var k = 0; k < 5; k++) {
          var ang = k * 72;
          el("ellipse", { cx: fl[0], cy: fl[1] - 2.2 * fl[2], rx: 1.3 * fl[2], ry: 2.1 * fl[2], fill: look.light, transform: "rotate(" + ang + " " + fl[0] + " " + fl[1] + ")" }, p);
        }
        el("circle", { cx: fl[0], cy: fl[1], r: 0.9 * fl[2], fill: look.dark }, p);
      });
      el("path", { d: "M12 14 q2 -3 5 -2 M2 20 q2 -2 4 0", fill: "none", stroke: look.light, "stroke-width": "0.8", opacity: "0.8" }, p);
    } else if (f === "houndstooth") {
      el("path", { d: "M0 0 H3 V3 H0 Z M3 3 L6 6 H3 Z M3 3 L6 0 V3 Z", fill: look.dark }, p);
    }
  }

  function definePatterns(defs, id, look) {
    defineFabric(defs, id + "-fabric", look);
    var rib = el("pattern", { id: id + "-rib", width: 3, height: 4, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 3, height: 4, fill: look.dark }, rib);
    el("rect", { width: 1.2, height: 4, fill: look.line, opacity: "0.6" }, rib);
    var sherpa = el("pattern", { id: id + "-sherpa", width: 4, height: 4, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 4, height: 4, fill: "#EDE6D8" }, sherpa);
    el("circle", { cx: 1, cy: 1, r: 1, fill: "#D6CCBA" }, sherpa);
    el("circle", { cx: 3, cy: 3, r: 0.9, fill: "#DED5C4" }, sherpa);
    var shade = el("linearGradient", { id: id + "-shade", x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
    [["0", "0.3"], ["0.22", "0"], ["0.78", "0"], ["1", "0.3"]].forEach(function (s) {
      el("stop", { offset: s[0], "stop-color": "#000", "stop-opacity": s[1] }, shade);
    });
    var fade = el("radialGradient", { id: id + "-fade" }, defs);
    el("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": "0.32" }, fade);
    el("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0" }, fade);
  }

  function mirror(points, side) {
    return pointsPath(points.map(function (p) { return [CX + side * p[0], p[1]]; }));
  }

  function line(parent, d, color, width, extra) {
    var attrs = { d: d, fill: "none", stroke: color, "stroke-width": width || 1, "stroke-linecap": "round", "stroke-linejoin": "round" };
    Object.keys(extra || {}).forEach(function (k) { attrs[k] = extra[k]; });
    return el("path", attrs, parent);
  }

  function stitch(parent, d, color) {
    return line(parent, d, color, 0.7, { "stroke-dasharray": "2 1.6", opacity: "0.9" });
  }

  function button(parent, x, y, color, r) {
    el("circle", { cx: x, cy: y, r: r || 2, fill: color, stroke: "rgba(0,0,0,0.35)", "stroke-width": "0.5" }, parent);
  }

  function openingX(y, hem) {
    return y <= 170 ? 12 + (5 - 12) * (y - 92) / 78 : 5 + (9 - 5) * (y - 170) / (hem - 170);
  }

  function drawSleeves(g, b, look, e, fill, cuffY) {
    var arm = armJoints(b);
    [1, -1].forEach(function (side) {
      var top = limbAt(arm, 114);
      el("circle", { cx: CX + side * top[0], cy: 114, r: top[1] + e, fill: fill, stroke: look.line, "stroke-width": "1" }, g);
      el("path", { d: limbPath(arm, side, e, 110, cuffY), fill: fill, stroke: look.line, "stroke-width": "1" }, g);
      var elbow = limbAt(arm, 198);
      var ex = CX + side * elbow[0];
      line(g, "M" + fmt(ex - elbow[1] * 0.6) + " 194 Q" + fmt(ex) + " 201 " + fmt(ex + elbow[1] * 0.6) + " 193", look.line, 0.8, { opacity: "0.45" });
    });
  }

  function drawCuffs(g, b, look, e, cuffY, depth, fill) {
    [1, -1].forEach(function (side) {
      el("path", { d: limbPath(armJoints(b), side, e + 0.4, cuffY - depth, cuffY), fill: fill, stroke: look.line, "stroke-width": "0.8" }, g);
    });
  }

  function drawTop(g, ids, b, look, e) {
    var fabric = "url(#" + ids + "-fabric)";
    var cuffY = 284;
    drawSleeves(g, b, look, e + 2, fabric, cuffY);
    if (look.rib) drawCuffs(g, b, look, e + 2, cuffY, 12, "url(#" + ids + "-rib)");
    if (look.cuffs) drawCuffs(g, b, look, e + 2, cuffY, 9, fabric);
    var body = torsoPath(b, e + 3, look.hem, look.neck, 1);
    el("path", { d: body, fill: fabric, stroke: look.line, "stroke-width": "1.1" }, g);
    var inner = el("g", { "clip-path": "url(#" + ids + "-body)" }, g);
    el("rect", { x: 0, y: 80, width: 240, height: 200, fill: "url(#" + ids + "-shade)" }, inner);
    if (look.rib) {
      el("rect", { x: 0, y: look.hem - 12, width: 240, height: 12, fill: "url(#" + ids + "-rib)" }, inner);
      line(inner, "M0 " + (look.hem - 12) + " H240", look.line, 0.8);
    }
    line(inner, "M" + (CX - b.w * 0.4) + " 204 q6 4 12 0 M" + (CX + b.w * 0.15) + " 210 q6 3 11 -1", look.line, 0.8, { opacity: "0.4" });
    if (look.placket) {
      line(inner, "M" + (CX + 2) + " 100 V" + look.hem + " M" + (CX - 2) + " 100 V" + look.hem, look.line, 0.7);
      [114, 140, 166, 192, 218, 244].forEach(function (y) { button(inner, CX, y, "#F7F6F2", 1.6); });
    }
    if (look.neck === "crew") line(g, "M" + (CX - 13) + " 92 Q" + CX + " 104 " + (CX + 13) + " 92", "url(#" + ids + "-rib)", 5);
    if (look.collar === "shirt") drawShirtCollar(g, look, look.base);
    return body;
  }

  function drawShirtCollar(g, look, fill) {
    [1, -1].forEach(function (side) {
      el("path", { d: mirror([[1, 101], [13, 89], [18, 94], [9, 115]], side), fill: fill, stroke: look.line, "stroke-width": "0.9" }, g);
    });
  }

  function drawJacket(g, ids, b, look, e) {
    var fabric = "url(#" + ids + "-fabric)";
    var cuffY = 286;
    drawSleeves(g, b, look, e + 3, fabric, cuffY);
    drawCuffs(g, b, look, e + 3, cuffY, 8, fabric);
    var body = torsoPath(b, e + 5, look.hem, "high", 2);
    el("path", { d: body, fill: fabric, stroke: look.line, "stroke-width": "1.1" }, g);
    var inner = el("g", { "clip-path": "url(#" + ids + "-body)" }, g);
    var hem = look.hem;

    if (look.open) {
      var opening = [];
      sampleYs(90, hem + 2).forEach(function (y) { opening.push([CX + openingX(y, hem), y]); });
      sampleYs(90, hem + 2).reverse().forEach(function (y) { opening.push([CX - openingX(y, hem), y]); });
      el("path", { d: pointsPath(opening), fill: look.inner, stroke: look.line, "stroke-width": "0.9" }, inner);
    } else {
      line(inner, "M" + CX + " 100 V" + hem, look.line, 1);
      if (look.stitch) stitch(inner, "M" + (CX + 4) + " 102 V" + (hem - 2), look.stitch);
    }
    el("rect", { x: 0, y: 80, width: 240, height: 210, fill: "url(#" + ids + "-shade)" }, inner);
    line(inner, "M" + (CX + b.s - 5 + e) + " 146 Q" + (CX + b.w + e + 2) + " 200 " + (CX + b.h + e + 3) + " " + hem +
      " M" + (CX - b.s + 5 - e) + " 146 Q" + (CX - b.w - e - 2) + " 200 " + (CX - b.h - e - 3) + " " + hem, look.line, 0.6, { opacity: "0.5" });

    if (look.fabric === "leather") {
      line(inner, "M" + (CX - b.w * 0.55) + " 120 Q" + (CX - b.w * 0.7) + " 190 " + (CX - b.w * 0.5) + " 250", "#fff", 3, { opacity: "0.1" });
      line(inner, "M" + (CX + b.w * 0.6) + " 130 Q" + (CX + b.w * 0.75) + " 200 " + (CX + b.w * 0.6) + " 255", "#fff", 2, { opacity: "0.08" });
    }
    if (look.waistband) {
      el("rect", { x: 0, y: hem - 11, width: 240, height: 11, fill: look.dark, opacity: "0.55" }, inner);
      line(inner, "M0 " + (hem - 11) + " H240", look.line, 0.8);
      stitch(inner, "M0 " + (hem - 8) + " H240 M0 " + (hem - 3) + " H240", look.stitch);
    }
    if (look.chestPockets) {
      var pw = Math.min(19, b.s * 0.42);
      [1, -1].forEach(function (side) {
        var x0 = 7, x1 = 7 + pw;
        el("path", { d: mirror([[x0, 126], [x1, 126], [x1, 146], [x0, 146]], side), fill: fabric, stroke: look.line, "stroke-width": "0.8" }, inner);
        el("path", { d: mirror([[x0 - 1, 124], [x1 + 1, 124], [x1 + 1, 132], [(x0 + x1) / 2, 136], [x0 - 1, 132]], side), fill: fabric, stroke: look.line, "stroke-width": "0.8" }, inner);
        if (look.stitch) stitch(inner, "M" + (CX + side * (x0 + 1.5)) + " 133 V144 H" + (CX + side * (x1 - 1.5)) + " V133", look.stitch);
        button(inner, CX + side * (x0 + x1) / 2, 132, look.dark, 1.5);
      });
    }
    if (look.pockets) {
      [1, -1].forEach(function (side) {
        var px = b.w * 0.35 + 4;
        if (look.pockets === "flap") el("path", { d: mirror([[px, 226], [px + 20, 226], [px + 20, 234], [px, 234]], side), fill: fabric, stroke: look.line, "stroke-width": "0.9" }, inner);
        else line(inner, "M" + (CX + side * px) + " 230 L" + (CX + side * (px + 17)) + " 226", look.line, 2.2);
      });
    }
    (look.buttons || []).forEach(function (y) {
      var x = look.open ? CX + openingX(y, hem) + 4 : CX - 3;
      button(look.open ? g : inner, x, y, look.open ? look.dark : "#C9B48A", 2.1);
    });

    if (look.lapels) {
      [1, -1].forEach(function (side) {
        el("path", { d: mirror([[12, 91], [23, 96], [26, 119], [19, 123], [26, 130], [5.5, 170]], side), fill: fabric, stroke: look.line, "stroke-width": "1" }, g);
        line(g, "M" + (CX + side * 19) + " 123 L" + (CX + side * 26) + " 119", look.line, 0.8);
      });
    }
    if (look.collar === "sherpa") {
      [1, -1].forEach(function (side) {
        el("path", { d: mirror([[2, 100], [9, 89], [27, 97], [25, 107], [12, 120]], side), fill: "url(#" + ids + "-sherpa)", stroke: "#BFB4A0", "stroke-width": "0.9" }, g);
      });
    }
    if (look.collar === "shirt") drawShirtCollar(g, look, look.light);
    return body;
  }

  function drawDress(g, ids, b, look, e, model) {
    var fabric = "url(#" + ids + "-fabric)";
    drawSleeves(g, b, look, e + 1.5, fabric, 282);
    var body = dressPath(b, e + 2, look.hem);
    el("path", { d: body, fill: fabric, stroke: look.line, "stroke-width": "1.1" }, g);
    var inner = el("g", { "clip-path": "url(#" + ids + "-body)" }, g);
    el("rect", { x: 0, y: 80, width: 240, height: 270, fill: "url(#" + ids + "-shade)" }, inner);
    line(inner, "M0 197 H240", look.line, 0.9);
    [-1, 1].forEach(function (side) {
      line(inner, "M" + (CX + side * b.w * 0.45) + " 202 Q" + (CX + side * (b.w * 0.5 + 4)) + " 270 " + (CX + side * (b.h * 0.6 + 10)) + " " + (look.hem + 2), look.line, 1, { opacity: "0.35" });
      line(inner, "M" + (CX + side * b.w * 0.9) + " 205 Q" + (CX + side * (b.h + 2)) + " 270 " + (CX + side * (b.h + 14)) + " " + (look.hem + 2), look.line, 0.9, { opacity: "0.3" });
    });
    line(inner, "M" + CX + " 204 Q" + (CX + 2) + " 270 " + CX + " " + (look.hem + 6), look.line, 0.9, { opacity: "0.3" });
    el("path", { d: "M" + (CX - 13) + " 91 L" + CX + " 128 L" + (CX + 13) + " 91 Z", fill: model.skin }, g);
    line(g, "M" + (CX - 13) + " 92 L" + CX + " 128 L" + (CX + 13) + " 92", look.line, 1.2);
    return body;
  }

  function drawJeans(g, ids, b, look, e) {
    var fabric = "url(#" + ids + "-fabric)";
    var body = bottomsPath(b, e + 2, 436);
    el("path", { d: body, fill: fabric, stroke: look.line, "stroke-width": "1.1" }, g);
    var inner = el("g", { "clip-path": "url(#" + ids + "-body)" }, g);
    var legs = legJoints(b);
    [1, -1].forEach(function (side) {
      var thigh = limbAt(legs, 290), knee = limbAt(legs, 345);
      el("ellipse", { cx: CX + side * thigh[0], cy: 292, rx: thigh[1] * 0.75, ry: 42, fill: "url(#" + ids + "-fade)" }, inner);
      el("ellipse", { cx: CX + side * knee[0], cy: 348, rx: knee[1], ry: 20, fill: "url(#" + ids + "-fade)" }, inner);
      el("path", { d: limbPath(legs, side, e + 2.5, 427, 437), fill: look.dark, opacity: "0.6" }, inner);
      stitch(inner, "M" + (CX + side * (b.w * 0.45)) + " 206 Q" + (CX + side * (b.w * 0.55)) + " 222 " + (CX + side * (b.h + e + 1)) + " 227", look.stitch);
    });
    el("rect", { x: 0, y: 196, width: 240, height: 10, fill: look.dark, opacity: "0.7" }, inner);
    line(inner, "M0 206 H240", look.line, 0.8);
    stitch(inner, "M0 199 H240 M0 203.5 H240", look.stitch);
    line(inner, "M" + CX + " 206 V258", look.line, 0.9);
    stitch(inner, "M" + (CX + 3) + " 207 V238 Q" + (CX + 3) + " 248 " + (CX - 1) + " 251", look.stitch);
    [-1, 1].forEach(function (k) {
      var x = CX + k * b.w * 0.62;
      el("rect", { x: x - 1.5, y: 194, width: 3, height: 13, fill: look.dark, stroke: look.line, "stroke-width": "0.5" }, g);
    });
    button(g, CX, 201, "#B08A4E", 2.3);
    return body;
  }

  var DRAW = { top: drawTop, jacket: drawJacket, dress: drawDress, jeans: drawJeans };

  function lookLabel(model, item, fit) {
    return "Illustrated try-on: " + item.name + ", size " + item.size + ", on " + model.name + ", size " + model.size + ", " + model.build.toLowerCase() + ". " + fit.label + ".";
  }

  function renderLook(model, item) {
    var ids = "rt-look-" + (++renderCount);
    var look = item.look;
    var b = model.body;
    var fit = fitFor(model, item);
    var anchorY = look.kind === "jeans" ? 196 : 92;

    var svg = el("svg", { viewBox: "0 0 240 480", role: "img", "aria-label": lookLabel(model, item, fit), class: "rt-look-svg" });
    var defs = el("defs", {}, svg);
    definePatterns(defs, ids, look);
    el("image", { href: model.image, x: 0, y: 0, width: 240, height: 480 }, svg);

    var g = el("g", { class: "rt-look-garment", transform: "translate(0 " + anchorY + ") scale(1 " + fit.stretch + ") translate(0 " + -anchorY + ")" }, svg);
    var clip = el("clipPath", { id: ids + "-body" }, defs);
    var bodyPath = el("path", {}, clip);
    var body = DRAW[look.kind](g, ids, b, look, fit.ease, model);
    bodyPath.setAttribute("d", body);
    if (fit.diff < 0) {
      var strain = el("g", { "clip-path": "url(#" + ids + "-body)" }, g);
      var top = look.kind === "jeans" ? 250 : 150;
      [1, -1].forEach(function (side) {
        var x = look.kind === "jeans" ? b.h * 0.9 : b.s - 4;
        for (var k = 0; k < -fit.diff + 1; k++) {
          line(strain, "M" + (CX + side * (x - k * 3)) + " " + (top + k * 9) + " Q" + (CX + side * (x * 0.6)) + " " + (top + 8 + k * 9) + " " + (CX + side * 9) + " " + (top + 20 + k * 9), look.line, 0.9, { opacity: "0.45" });
        }
      });
    }
    if (look.kind === "jeans") {
      el("path", { d: torsoPath(b, 0.5, 250, "high", 0), fill: BASE_TEE, stroke: "rgba(0,0,0,0.18)", "stroke-width": "0.8" }, svg);
    }

    return { svg: svg, fit: fit };
  }

  window.RETHREAD_TRYON = { items: ITEMS, tryItem: null };

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
    var reference = root.querySelector("[data-tryon-reference]");
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
      reference.src = state.item.image;
      reference.alt = "Listing photo: " + state.item.name;
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

    window.RETHREAD_TRYON.tryItem = function (id) {
      var item = find(ITEMS, id);
      if (!item) return;
      state.item = item;
      runTryOn();
      var stacked = window.matchMedia("(max-width: 760px)").matches;
      root.querySelector(stacked ? ".rt-tryon-result" : ".rt-tryon-layout").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      root.querySelector('input[name="tryon-item"][value="' + id + '"]').focus({ preventScroll: true });
    };

    root.classList.add("is-ready");
    syncChoices();
    showResult(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
