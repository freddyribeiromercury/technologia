/* ============================================================
   technologIA — site interactions
   ============================================================ */
(function () {
  "use strict";

  /* mark JS active so reveal hidden-state engages */
  document.documentElement.classList.add("js");

  /* ------------------------------------------------------------------ */
  /* NAV — scrolled state                                                */
  /* ------------------------------------------------------------------ */
  const nav = document.querySelector(".nav");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------ */
  /* THEME TOGGLE                                                        */
  /* ------------------------------------------------------------------ */
  const themeBtn = document.getElementById("theme-toggle");
  const iconSun  = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");
  let isDark = true;

  function applyTheme(dark) {
    isDark = dark;
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      if (iconSun)  iconSun.style.display  = "none";
      if (iconMoon) iconMoon.style.display = "block";
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      if (iconSun)  iconSun.style.display  = "block";
      if (iconMoon) iconMoon.style.display = "none";
    }
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
  }

  /* restore persisted preference */
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light") applyTheme(false);
    else applyTheme(true);
  } catch (e) { applyTheme(true); }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => applyTheme(!isDark));
  }

  /* ------------------------------------------------------------------ */
  /* SCROLL REVEAL                                                       */
  /* ------------------------------------------------------------------ */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

  /* fallback for hidden/offscreen rendering contexts */
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.05 && r.bottom > 0) {
        el.classList.add("in");
      }
    });
  }, 1400);

  /* ------------------------------------------------------------------ */
  /* SERVICE CARDS — glow follows cursor                                 */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll(".svc-card").forEach((card) => {
    card.addEventListener("mousemove", (ev) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((ev.clientX - r.left) / r.width) * 100 + "%");
    });
  });


  /* ------------------------------------------------------------------ */
  /* AGENT CHAT DEMO                                                     */
  /* ------------------------------------------------------------------ */
  const chat = document.getElementById("chat");
  if (chat) {
    const script = [
      { who: "bot",  text: "Olá! Sou a Nova, a assistente da Clínica Sorriso. Como posso ajudar? 😊", delay: 600 },
      { who: "user", text: "Queria marcar uma limpeza dentária", delay: 1400 },
      { who: "bot",  text: "Com certeza! Temos vaga quinta-feira às 15h ou sexta às 10h30. Qual prefere?", delay: 1600 },
      { who: "user", text: "Sexta às 10h30 é perfeito", delay: 1300 },
      { who: "bot",  text: "Marcado ✅ Enviei a confirmação por SMS e adicionei ao calendário da clínica. Mais alguma coisa?", delay: 1700 },
      { who: "user", text: "Não, obrigado!", delay: 1100 },
      { who: "bot",  text: "De nada! Até sexta. 👋", delay: 1000 },
    ];

    let started = false;

    function makeTyping() {
      const t = document.createElement("div");
      t.className = "typing";
      for (let i = 0; i < 3; i++) t.appendChild(document.createElement("span"));
      chat.appendChild(t);
      chat.scrollTop = chat.scrollHeight;
      return t;
    }

    function addBubble(who, text) {
      const b = document.createElement("div");
      b.className = "bubble " + who;
      b.textContent = text;
      /* reset animation so it replays */
      b.style.animation = "none";
      chat.appendChild(b);
      /* force reflow */
      void b.offsetWidth;
      b.style.animation = "";
      chat.scrollTop = chat.scrollHeight;
    }

    function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

    async function run() {
      chat.innerHTML = "";
      for (const line of script) {
        if (line.who === "bot") {
          const t = makeTyping();
          await wait(line.delay);
          t.remove();
          addBubble(line.who, line.text);
        } else {
          await wait(line.delay);
          addBubble(line.who, line.text);
        }
        await wait(350);
      }
      await wait(3200);
      run();
    }

    const phoneIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true;
            run();
          }
        });
      },
      { threshold: 0.4 }
    );
    phoneIO.observe(chat);
  }

  /* ------------------------------------------------------------------ */
  /* SMOOTH ANCHOR SCROLL                                                */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          const top = el.getBoundingClientRect().top + window.scrollY - 64;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* SHADER BACKGROUND (WebGL plasma lines)                              */
  /* ------------------------------------------------------------------ */
  (function initShader() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.getElementById("shader-bg");
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
      attribute vec4 aVertexPosition;
      void main() { gl_Position = aVertexPosition; }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2  iResolution;
      uniform float iTime;
      uniform float iDarkMode;   /* 1.0 = dark, 0.0 = light (animated) */

      const float overallSpeed    = 0.2;
      const float gridSmoothWidth = 0.015;
      const float scale           = 5.0;
      const float minLineWidth    = 0.01;
      const float maxLineWidth    = 0.2;
      const float lineSpeed       = 1.0 * overallSpeed;
      const float lineAmplitude   = 1.0;
      const float lineFrequency   = 0.2;
      const float warpSpeed       = 0.2 * overallSpeed;
      const float warpFrequency   = 0.5;
      const float warpAmplitude   = 1.0;
      const float offsetFrequency = 0.5;
      const float offsetSpeed     = 1.33 * overallSpeed;
      const float minOffsetSpread = 0.6;
      const float maxOffsetSpread = 2.0;
      const int   linesPerGroup   = 16;

      #define drawCircle(pos,radius,coord) smoothstep(radius+gridSmoothWidth,radius,length(coord-(pos)))
      #define drawSmoothLine(pos,hw,t)     smoothstep(hw,0.0,abs(pos-(t)))
      #define drawCrispLine(pos,hw,t)      smoothstep(hw+gridSmoothWidth,hw,abs(pos-(t)))

      float random(float t) {
        return (cos(t) + cos(t*1.3+1.3) + cos(t*1.4+1.4)) / 3.0;
      }

      float getPlasmaY(float x, float hFade, float offset) {
        return random(x * lineFrequency + iTime * lineSpeed) * hFade * lineAmplitude + offset;
      }

      void main() {
        vec2 uv    = gl_FragCoord.xy / iResolution.xy;
        vec2 space = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.x * 2.0 * scale;

        float hFade = 1.0 - (cos(uv.x * 6.28318) * 0.5 + 0.5);
        float vFade = 1.0 - (cos(uv.y * 6.28318) * 0.5 + 0.5);

        space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + hFade);
        space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * hFade;

        /* per-mode palette */
        vec4 bg1 = mix(vec4(0.965, 0.953, 0.988, 1.0), vec4(0.10, 0.10, 0.30, 1.0), iDarkMode);
        vec4 bg2 = mix(vec4(0.937, 0.918, 0.965, 1.0), vec4(0.30, 0.10, 0.50, 1.0), iDarkMode);
        vec4 linCol = vec4(0.40, 0.20, 0.80, 1.0);

        vec4 lines = vec4(0.0);
        for (int l = 0; l < 16; l++) {
          float nl        = float(l) / float(linesPerGroup);
          float offPos    = float(l) + space.x * offsetFrequency;
          float rand      = random(offPos + iTime * offsetSpeed) * 0.5 + 0.5;
          float halfWidth = mix(minLineWidth, maxLineWidth, rand * hFade) * 0.5;
          float offset    = random(offPos + iTime * offsetSpeed * (1.0 + nl)) * mix(minOffsetSpread, maxOffsetSpread, hFade);
          float linePos   = getPlasmaY(space.x, hFade, offset);
          float line      = drawSmoothLine(linePos, halfWidth, space.y) * 0.5
                          + drawCrispLine(linePos, halfWidth * 0.15, space.y);

          float cx        = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
          vec2  cPos      = vec2(cx, getPlasmaY(cx, hFade, offset));
          float circle    = drawCircle(cPos, 0.01, space) * 4.0;

          lines += (line + circle) * linCol * rand;
        }

        /* edge fade: dark→black, light→bg colour (no dark edges in day mode) */
        vec4 edgeCol = mix(bg1, vec4(0.0, 0.0, 0.0, 1.0), iDarkMode);
        vec4 bg      = mix(bg1, bg2, uv.x);
        bg           = mix(edgeCol, bg, vFade);
        bg.a         = 1.0;

        /* dark: additive blend (lines glow bright on dark bg)          */
        /* light: tint blend   (lines tint the bg toward linCol so the  */
        /*        purple hue stays visible instead of saturating white)  */
        float linScalar = clamp(dot(lines.rgb, vec3(0.333)), 0.0, 0.9);
        vec4  linTint   = mix(bg, linCol, linScalar * 0.8);
        bg = mix(linTint, bg + lines, iDarkMode);

        gl_FragColor = bg;
      }
    `;

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("Shader error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(prog));
      return;
    }

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos  = gl.getAttribLocation(prog, "aVertexPosition");
    const uRes  = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");
    const uDark = gl.getUniformLocation(prog, "iDarkMode");

    function resize() {
      const w = canvas.parentElement.offsetWidth;
      const h = canvas.parentElement.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    resize();

    /* smooth dark↔light transition (1.0 = dark, 0.0 = light) */
    let targetDark  = document.documentElement.dataset.theme === "light" ? 0.0 : 1.0;
    let currentDark = targetDark;

    /* watch data-theme attribute set by the theme toggle */
    new MutationObserver(() => {
      targetDark = document.documentElement.dataset.theme === "light" ? 0.0 : 1.0;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let rafId = null;
    const startTime = Date.now();

    function render() {
      /* lerp toward target — ~0.7s transition at 60 fps */
      currentDark += (targetDark - currentDark) * 0.07;

      const t = (Date.now() - startTime) / 1000;
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uDark, currentDark);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aPos);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    }

    /* pause when hero is off-screen for performance */
    const heroSection = canvas.closest(".hero");
    if (heroSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (!rafId) rafId = requestAnimationFrame(render);
          } else {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
          }
        });
      }, { threshold: 0 });
      io.observe(heroSection);
    } else {
      rafId = requestAnimationFrame(render);
    }
  })();

  /* ------------------------------------------------------------------ */
  /* CONTACT FORM — fake submit feedback                                 */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById("diag-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const original = btn.innerHTML;
      btn.innerHTML = "Enviado ✓";
      btn.style.background = "var(--violet)";
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = "";
        btn.disabled = false;
        form.reset();
      }, 2600);
    });
  }

})();
