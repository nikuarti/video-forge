  /* --------------------------------------------------------------------------
   * 20-primitives :: the contract-backed motion vocabulary
   *
   * Each primitive does TWO things:
   *   (1) drives the single paused GSAP timeline with REAL tweens (real browser
   *       render — HyperFrames seeks this timeline frame-by-frame), and
   *   (2) registers a machine-checkable promise + a normalized "actor track"
   *       so the outcome can be verified pixel-by-pixel.
   *
   * The actor track (contract._scene) is what the hermetic CI reference
   * renderer replays. In a real browser, place() also OWNS the actor's DOM
   * styling (position/color/text) so composition.js is the single source of
   * truth; index.html only needs an empty placeholder element per actor id.
   * The verifier then checks the REAL rendered frames against the same
   * promises, so the check is adversarial in deployment.
   *
   * GSAP motion uses the transform `x`/`y` properties (framework's allowed
   * animatable set), as pixel offsets from each actor's static placement
   * anchor (set once in place()). This keeps every seek frame-accurate: no
   * `left`/`top` animation, no relative "+=" chaining.
   * ------------------------------------------------------------------------ */

  var _gsap = null; // set by timeline(); primitives tween through it.
  var _tl = null;   // the single paused timeline for the whole video.

  function ease2fn(name) { return name || "power2.out"; }

  // Linear-in-frames interpolation is what the reference renderer uses; the
  // promise only asserts the START and END states (+ optional midpoints), so
  // easing choice never breaks verify, it only shapes in-between motion.
  function track(handle, prop, fromV, toV, startFrame, endFrame, ease) {
    // Tracks live ON THE ACTOR so they survive contract serialization and can
    // be replayed by the reference renderer.
    var t = handle.actor._tracks;
    t[prop] = t[prop] || [];
    t[prop].push({ f0: startFrame, f1: endFrame, v0: fromV, v1: toV, ease: ease });
  }

  /* timeline() :: MUST be called first. Enforces the mandatory single-sentence
   * message and stamps meta. Refuses to proceed without a message.
   * Also requires `compositionId`, matching the STATIC `data-composition-id`
   * on the project's root element (read by HyperFrames before any script
   * runs; see lib/verify/extract_contract.js for the drift check that keeps
   * these in sync). In a real browser, registers the timeline on
   * `window.__timelines[compositionId]` per the framework contract. */
  function timeline(opts) {
    opts = opts || {};
    assert(opts.message && String(opts.message).trim().split(/\s+/).length >= 3,
      "timeline() requires a single-sentence `message` (what the viewer should " +
      "understand after watching). Refusing to build without it.");
    guardCopy(opts.message, "timeline.message");
    assert(opts.compositionId,
      "timeline() requires compositionId, matching the root element's " +
      "static data-composition-id.");
    var c = nowContract();
    c.meta.message = String(opts.message).trim();
    c.meta.compositionId = opts.compositionId;
    c.meta.fps = opts.fps || 30;
    c.meta.width = opts.width || 1920;
    c.meta.height = opts.height || 1080;
    assert(opts.durationFrames || opts.durationSeconds,
      "timeline() needs durationFrames or durationSeconds");
    c.meta.durationFrames = opts.durationFrames ||
      Math.round(opts.durationSeconds * c.meta.fps);
    c.meta.payoffFrame = opts.payoffFrame != null ? opts.payoffFrame
      : c.meta.durationFrames - 1;
    c.meta.proofFrames = (opts.proofFrames || []).map(function (t) {
      return seconds2frames(t, c.meta.fps);
    });
    c.meta.background = opts.background || "#0b0b0f";
    c._scene = { actors: [], cuts: [] };

    _gsap = opts.gsap || (win().gsap);
    // Create the timeline SYNCHRONOUSLY, paused, never played: HyperFrames
    // seeks it frame-by-frame (determinism-rules.md). Under Node (headless
    // contract extraction) gsap may be a stub; paused:true keeps it inert.
    _tl = _gsap ? _gsap.timeline({ paused: true }) : null;

    var d = doc();
    if (d && _tl) {
      var root = d.querySelector('[data-composition-id="' + opts.compositionId + '"]');
      if (root) {
        root.style.background = c.meta.background;
        // The HyperFrames png-sequence capture is RGBA and does NOT paint the
        // root element's own background: undrawn pixels come out transparent
        // and flatten to BLACK when encoded. Paint the background as a real
        // full-frame layer beneath all content (isolate makes root the
        // stacking context so z-index -1 stays inside it).
        root.style.isolation = "isolate";
        var bg = d.getElementById("__kit-bg");
        if (!bg) {
          bg = d.createElement("div");
          bg.id = "__kit-bg";
          root.insertBefore(bg, root.firstChild);
        }
        bg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;" +
          "z-index:-1;pointer-events:none;background:" + c.meta.background + ";";
      }
      win().__timelines = win().__timelines || {};
      win().__timelines[opts.compositionId] = _tl;
    }
    // Every frame must be fully opaque (see __kit-bg above); assert first/last.
    registerPromise({ id: "opaque@0", type: "opaque", atFrame: 0 });
    registerPromise({ id: "opaque@" + (c.meta.durationFrames - 1), type: "opaque",
      atFrame: c.meta.durationFrames - 1 });
    return {
      _tl: _tl,
      duration: c.meta.durationFrames,
      fps: c.meta.fps,
    };
  }

  function f(t) { return seconds2frames(t, nowContract().meta.fps); }

  /* place() :: introduce a visual actor. Returns a handle other primitives
   * animate. `target` is the DOM selector for the real render. In a real
   * browser this OWNS the element's initial styling (position, size, color,
   * text) from the SAME geometry that drives the reference renderer and the
   * promises, so composition.js is the single source of truth: index.html
   * only needs an empty element with a matching id. The placed position
   * becomes the GSAP transform anchor for all subsequent moveTo() calls. */
  function place(id, spec) {
    spec = spec || {};
    guardCopy(spec.text, "place(" + id + ").text");
    var c = nowContract();
    var actor = {
      id: id,
      target: spec.target || ("#" + id),
      shape: spec.shape || "rect",           // rect | ellipse | text
      color: spec.color || "#e6e6ef",
      text: spec.text != null ? spec.text : null,
      fontPx: spec.fontPx || 64,
      // geometry is normalized 0..1 of the frame (resolution independent).
      x: spec.x != null ? spec.x : 0.5,
      y: spec.y != null ? spec.y : 0.5,
      w: spec.w != null ? spec.w : 0.2,
      h: spec.h != null ? spec.h : 0.2,
      opacity: spec.opacity != null ? spec.opacity : 1,
      enterFrame: spec.enterFrame != null ? spec.enterFrame : 0,
      _tracks: {},
    };
    // The GSAP x/y transform anchor: subsequent moveTo() pixel offsets are
    // computed relative to THIS placed position, never to wherever a prior
    // tween left off, so every seek is order-independent.
    actor.anchorX = actor.x;
    actor.anchorY = actor.y;
    var handle = { id: id, actor: actor };
    c._scene.actors.push(actor);

    var d = doc();
    if (d) {
      var el = d.querySelector(actor.target);
      if (el) {
        el.style.position = "absolute";
        el.style.left = (actor.x * 100) + "%";
        el.style.top = (actor.y * 100) + "%";
        // Centering MUST go through GSAP's own xPercent/yPercent, not a raw
        // CSS transform string: GSAP's x/y tweens (moveTo) fully own the
        // translate() and would silently discard a plain
        // `transform: translate(-50%, -50%)` set outside its tracking,
        // un-centering the actor by half its own size the instant a move
        // tween runs. gsap.set() registers the offset as a persistent
        // component GSAP composes with animated x/y.
        if (_gsap) {
          _gsap.set(el, { xPercent: -50, yPercent: -50 });
        } else {
          el.style.transform = "translate(-50%, -50%)";
        }
        el.style.opacity = String(actor.opacity);
        // No class="clip": these actors are continuously present for the
        // whole composition and their visibility is purely GSAP-opacity
        // driven, which is exactly what an unmarked element gets under the
        // framework's clip-visibility contract (data-attributes.md).
        if (actor.shape === "text") {
          el.style.color = actor.color;
          el.style.fontSize = actor.fontPx + "px";
          el.style.fontWeight = "700";
          el.style.whiteSpace = "nowrap";
          el.style.fontFamily = "Inter, system-ui, sans-serif";
          if (actor.text != null) el.textContent = actor.text;
        } else {
          el.style.width = (actor.w * 100) + "%";
          el.style.height = (actor.h * 100) + "%";
          el.style.background = actor.color;
          el.style.borderRadius = actor.shape === "ellipse" ? "50%" : "0";
        }
      }
    }
    return handle;
  }

  /* moveTo() :: translate an actor between two states over a frame span.
   * Registers a POSITION promise: at endFrame the actor centroid is at (to).
   * Drives a real GSAP x/y tween (pixel offsets from the place() anchor). */
  function moveTo(handle, o) {
    o = o || {};
    var c = nowContract();
    var s = f(o.start != null ? o.start : 0);
    var e = f(o.end != null ? o.end : c.meta.durationFrames - 1);
    var fromX = o.fromX != null ? o.fromX : handle.actor.x;
    var fromY = o.fromY != null ? o.fromY : handle.actor.y;
    var toX = o.toX != null ? o.toX : handle.actor.x;
    var toY = o.toY != null ? o.toY : handle.actor.y;
    track(handle, "x", fromX, toX, s, e, o.ease);
    track(handle, "y", fromY, toY, s, e, o.ease);
    handle.actor.x = toX; handle.actor.y = toY;
    if (_tl && _gsap) {
      var W = c.meta.width, H = c.meta.height;
      var ax = handle.actor.anchorX, ay = handle.actor.anchorY;
      _tl.fromTo(handle.actor.target,
        { x: (fromX - ax) * W, y: (fromY - ay) * H },
        { x: (toX - ax) * W, y: (toY - ay) * H,
          duration: (e - s) / c.meta.fps, ease: ease2fn(o.ease) },
        s / c.meta.fps);
    }
    registerPromise({
      id: handle.id + ":pos@" + e,
      type: "centroid",
      target: handle.id,
      atFrame: e,
      expect: { x: toX, y: toY },
      tol: o.tol != null ? o.tol : 0.04, // fraction of frame diagonal
    });
    return handle;
  }

  /* fade() :: opacity ramp. Registers an OPACITY promise at the end state.
   * Drives a real GSAP opacity tween. */
  function fade(handle, o) {
    o = o || {};
    var c = nowContract();
    var s = f(o.start != null ? o.start : 0);
    var e = f(o.end != null ? o.end : s + c.meta.fps);
    var from = o.from != null ? o.from : handle.actor.opacity;
    var to = o.to != null ? o.to : 1;
    track(handle, "opacity", from, to, s, e, o.ease);
    handle.actor.opacity = to;
    if (s <= handle.actor.enterFrame) handle.actor.enterFrame = s;
    if (_tl && _gsap) {
      _tl.fromTo(handle.actor.target,
        { opacity: from },
        { opacity: to, duration: (e - s) / c.meta.fps, ease: ease2fn(o.ease) },
        s / c.meta.fps);
    }
    registerPromise({
      id: handle.id + ":opacity@" + e,
      type: "presence",
      target: handle.id,
      atFrame: e,
      expect: { present: to > 0.5 },
    });
    return handle;
  }

  /* revealText() :: set/animate an actor's text and assert the text region is
   * non-empty (ink present) at the reveal frame. Copy is dash-guarded. Drives
   * a real GSAP opacity tween on the (already text-styled) actor element. */
  function revealText(handle, o) {
    o = o || {};
    guardCopy(o.text, "revealText(" + handle.id + ")");
    var c = nowContract();
    var at = f(o.at != null ? o.at : 0);
    var riseFrames = Math.round(c.meta.fps * (o.rise || 0.4));
    if (o.text != null) handle.actor.text = o.text;
    handle.actor.shape = "text";
    track(handle, "opacity", 0, 1, at, at + riseFrames, o.ease);
    handle.actor.opacity = 1;
    var d = doc();
    if (d) {
      var el = d.querySelector(handle.actor.target);
      if (el && o.text != null) el.textContent = o.text;
    }
    if (_tl && _gsap) {
      _tl.fromTo(handle.actor.target,
        { opacity: 0 },
        { opacity: 1, duration: riseFrames / c.meta.fps, ease: ease2fn(o.ease) },
        at / c.meta.fps);
    }
    registerPromise({
      id: handle.id + ":ink@" + (at + riseFrames),
      type: "ink",           // rendered text region must contain ink (non-bg pixels)
      target: handle.id,
      atFrame: at + riseFrames,
      expect: { nonEmpty: true },
    });
    return handle;
  }

  /* cut() :: a camera cut/move INSIDE the single timeline. Never a new MP4.
   * Records the cut boundary so the reviewer's proof/contact tooling can find
   * scene edges, and adds a GSAP label at the same time for readability when
   * inspecting the real timeline (e.g. `hyperframes inspect`). */
  function cut(o) {
    o = o || {};
    var c = nowContract();
    var at = f(o.at != null ? o.at : 0);
    var label = guardCopy(o.label, "cut.label") || ("cut@" + at);
    c._scene.cuts.push({ atFrame: at, label: label });
    if (_tl && _tl.addLabel) {
      try { _tl.addLabel(label, at / c.meta.fps); } catch (e) { /* stub timeline under Node */ }
    }
    return at;
  }

  /* colorGuard() :: "what must NOT appear early." Asserts a forbidden color is
   * absent from a region before a frame (e.g. no payoff logo before the hook
   * lands). A pure emergent-property check: not derivable from any tween. */
  function colorGuard(o) {
    o = o || {};
    assert(o.forbidHex, "colorGuard needs forbidHex");
    var c = nowContract();
    registerPromise({
      id: "guard:" + o.forbidHex + "<" + (o.beforeFrame != null ? f(o.beforeFrame) : "?"),
      type: "absent-color",
      forbidHex: o.forbidHex,
      beforeFrame: f(o.beforeFrame),
      region: o.region || { x: 0, y: 0, w: 1, h: 1 }, // normalized
      tol: o.tol != null ? o.tol : 24,               // per-channel 0..255
    });
  }

  /* payoff() :: mark the payoff frame + assert it is not blank (ink present
   * somewhere). firstFrame is asserted non-blank too. */
  function payoff(o) {
    o = o || {};
    var c = nowContract();
    if (o.at != null) c.meta.payoffFrame = f(o.at);
    registerPromise({
      id: "payoff:nonblank@" + c.meta.payoffFrame,
      type: "nonblank",
      atFrame: c.meta.payoffFrame,
      expect: { nonBlank: true },
    });
    registerPromise({
      id: "first:nonblank@" + c.meta.firstFrame,
      type: "nonblank",
      atFrame: c.meta.firstFrame,
      expect: { nonBlank: true },
    });
  }
