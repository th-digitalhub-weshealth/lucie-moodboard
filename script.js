(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Resolves once `el` is on screen; used to pause the demo loops while scrolled away.
  function watchVisibility(el) {
    let visible = false;
    let waiters = [];
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { waiters.forEach((r) => r()); waiters = []; }
    }, { threshold: 0.35 }).observe(el);
    return () => (visible ? Promise.resolve() : new Promise((r) => waiters.push(r)));
  }

  /* ---------- Scroll reveal: stagger whatever enters together ---------- */

  const revealObserver = new IntersectionObserver((entries) => {
    const entering = entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    entering.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${i * 80}ms`);
      el.classList.add('is-in');
      revealObserver.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- Wordmark shimmer + Ask Lucie demo: only run while on screen ---------- */

  if (!reduceMotion) {
    const liveObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting));
    });
    document.querySelectorAll('[data-logo-shimmer], [data-live]').forEach((el) => liveObserver.observe(el));
  }

  /* ---------- Thinking verbs ---------- */

  const verbsTile = document.querySelector('[data-verbs]');
  if (verbsTile) {
    const verbs = [...verbsTile.querySelectorAll('.verb')];
    const whenVisible = watchVisibility(verbsTile);
    let i = 0;
    (async function cycle() {
      for (;;) {
        await wait(2200);
        await whenVisible();
        const out = verbs[i];
        i = (i + 1) % verbs.length;
        out.classList.replace('is-on', 'is-leaving');
        verbs[i].classList.add('is-on');
        await wait(300);
        out.classList.remove('is-leaving');
      }
    })();
  }

  /* ---------- Conversation ---------- */

  const thread = document.querySelector('[data-thread]');
  if (thread) {
    const step = (name) => thread.querySelector(`[data-step="${name}"]`);
    thread.querySelectorAll('.reply').forEach((reply) => {
      reply.innerHTML = reply.textContent.trim().split(' ')
        .map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`).join(' ');
    });

    // The tile resizes in two stages: it's sized for the first exchange from the start, then grows
    // once to fit the whole second exchange before that one plays. Content fades in inside the space.
    const second = ['user2', 'answer2', 'routine', 'feedback2'].map(step);
    const reset = () => thread.querySelectorAll('[data-step]').forEach((el) => el.classList.remove('on'));
    const setSecond = (shown) => second.forEach((el) => { el.hidden = !shown; });

    // Animate the tile from its current height to the height after `change`.
    let settle;
    function grow(change) {
      const from = thread.offsetHeight;
      thread.style.transition = 'none';
      thread.style.height = '';
      change();
      const to = thread.offsetHeight;
      if (reduceMotion || Math.abs(to - from) < 1) { thread.style.transition = ''; return; }
      thread.style.height = `${from}px`;
      void thread.offsetHeight;
      // Inline, because the scroll-reveal class owns this tile's `transition` property.
      thread.style.transition = 'height 750ms cubic-bezier(0.65, 0, 0.35, 1)'; // soft in-out
      thread.style.height = `${to}px`;
      clearTimeout(settle);
      settle = setTimeout(() => { thread.style.height = ''; thread.style.transition = ''; }, 800);
    }

    const show = (name, on = true) => step(name).classList.toggle('on', on);
    const whenVisible = watchVisibility(thread);

    // One exchange: question, Lucie thinks, answers word by word, then her content builds in.
    async function exchange(n, content) {
      show(`user${n}`);
      await wait(800);
      show(`answer${n}`);
      step(`answer${n}`).classList.add('is-thinking');
      show(`thinking${n}`);
      await wait(1800);
      show(`thinking${n}`, false);
      step(`answer${n}`).classList.remove('is-thinking');
      show(`reply${n}`);
      for (const [name, pause] of content) {
        await wait(pause);
        show(name);
      }
    }

    setSecond(false);
    (async function loop() {
      for (;;) {
        await whenVisible();
        thread.classList.remove('is-out');
        await wait(500);
        await exchange('', [['card', 650], ['feedback', 550]]);
        await wait(250);
        await whenVisible();
        grow(() => setSecond(true)); // stage 2: make room for the whole follow-up
        await wait(500); // the question appears as the growth settles
        await exchange('2', [['routine', 650], ['feedback2', 900]]);
        await wait(5200);
        thread.classList.add('is-out');
        await wait(600);
        reset();
        grow(() => setSecond(false)); // back to stage 1
        await wait(1100);
      }
    })();
  }

  /* ---------- Lucie prompt stack: a "user" swipes through the cards, endlessly ---------- */

  const stack = document.querySelector('[data-stack]');
  if (stack) {
    let order = [...stack.querySelectorAll('.lucie-tile')];
    const touch = stack.querySelector('.stack-touch');
    const layout = () => order.forEach((card, i) => { card.dataset.depth = Math.min(i, 3); });
    layout();

    if (!reduceMotion) {
      const whenVisible = watchVisibility(stack);
      const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
      const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
      const move = (el, transform, ms, ease, extra = {}) =>
        el.animate([{ transform, ...extra }], { duration: ms, easing: ease, fill: 'forwards' }).finished;

      (async function swipe() {
        for (;;) {
          await wait(1600);
          await whenVisible();
          const card = order[0];
          // Finger lands on the card.
          touch.animate([{ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }], { duration: 180, easing: EASE_OUT, fill: 'forwards' });
          await wait(260);
          // Drag: card and finger move left together; the card tilts as it's pulled.
          await Promise.all([
            move(card, 'translateX(-38px) rotate(-3deg)', 380, EASE_IN_OUT),
            move(touch, 'translateX(-38px)', 380, EASE_IN_OUT),
          ]);
          // Release: the card glides off the top of the stack and fades, staying above the others
          // the whole way. A soft in-out curve picks up from the drag's stop without a jolt.
          card.dataset.depth = 'out';
          touch.animate([{ transform: 'translateX(-38px)', opacity: 1 }, { transform: 'translateX(-60px)', opacity: 0 }], { duration: 300, easing: EASE_OUT, fill: 'forwards' });
          const exit = card.animate([
            { transform: 'translateX(-38px) rotate(-3deg)', opacity: 1 },
            { transform: 'translateX(-70px) translateY(-6px) rotate(-5deg)', opacity: 1, offset: 0.3 },
            { transform: 'translateX(-150px) translateY(-14px) rotate(-9deg)', opacity: 0 },
          ], { duration: 720, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
          // The next card moves up as the top one leaves.
          await wait(140);
          order = [...order.slice(1), card];
          order.slice(0, -1).forEach((c, i) => { c.dataset.depth = Math.min(i, 3); });
          await exit.finished;
          // Rejoin at the back, hidden, ready to fade in as the stack cycles.
          card.style.transition = 'none';
          card.dataset.depth = 3;
          card.getAnimations().forEach((a) => a.cancel()); // the drag and the exit
          void card.offsetHeight;
          card.style.transition = '';
          touch.getAnimations().forEach((a) => a.cancel());
        }
      })();
    }
  }

  /* ---------- Stardust: the storefront's rising Lucie stars (AtomiaFrontEnd lucie-stardust.js) ----------
     Tiny four-point stars rise from the bottom edge (larger and brighter low down), with a few large
     out-of-focus stars in front. Stars rise, sway, twinkle, and about half drift in and out of focus
     (a sharp and a pre-blurred copy crossfade). Ported with one change: the layout is in the tile's own
     pixels rather than a 290-wide grid, so stars keep the storefront's size on wide tiles. */

  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SINE = 'cubic-bezier(0.37, 0, 0.63, 1)';

  function drawStardust(tile, seed, opts) {
    const rand = seeded(seed);
    const between = (min, max) => min + rand() * (max - min);
    const W = tile.offsetWidth;
    const H = tile.offsetHeight;
    const node = (className, parent) => {
      const n = document.createElement('i');
      n.className = className;
      parent?.append(n);
      return n;
    };
    const place = (n, x, y, scale) => {
      const size = 12 * scale;
      Object.assign(n.style, {
        left: `${((x / W) * 100).toFixed(2)}%`, top: `${((y / H) * 100).toFixed(2)}%`,
        width: `${size.toFixed(1)}px`, margin: `${(-size / 2).toFixed(1)}px 0 0 ${(-size / 2).toFixed(1)}px`,
      });
    };

    const field = node('lucie-stars');
    field.setAttribute('aria-hidden', 'true');
    const stars = [];
    const bands = Math.round(W / 24);
    const placed = [];
    for (let band = 0; band < bands; band++) {
      for (let n = 0, tries = 0; n < opts.perBand && tries < 400; tries++) {
        const x = between(12 + (band * (W - 24)) / bands, 12 + ((band + 1) * (W - 24)) / bands);
        const t = rand() ** 1.4; // 0 = bottom edge, 1 = top of the rise
        const y = H - opts.bottom - t * opts.rise;
        if (placed.some(([a, b]) => (x - a) ** 2 + (y - b) ** 2 < 19 ** 2)) continue;
        placed.push([x, y]);
        const scale = Math.max(0.85, (1 - t) * 2.5 + between(-0.25, 0.3));
        const opacity = Math.max(0.28, (1 - t) * 0.95 + between(-0.05, 0.05));
        const dot = node('lucie-star', field);
        place(dot, x, y, scale);
        const sway = node('lucie-star-sway', dot);
        const twinkle = node('lucie-star-twinkle', sway);
        twinkle.style.opacity = opacity.toFixed(2);
        const sharp = node('lucie-star-img is-sharp', twinkle);
        const soft = rand() < 0.5 ? node('lucie-star-img is-defocus', twinkle) : null;
        stars.push({ kind: 'sharp', dot, sway, twinkle, sharp, soft, opacity });
        n++;
      }
    }
    const near = [];
    for (let tries = 0; near.length < opts.bokeh && tries < 2000; tries++) {
      const x = between(14, W - 14);
      const y = between(H - opts.bokehFrom, H - opts.bokehTo);
      if (near.some(([a, b]) => (x - a) ** 2 + (y - b) ** 2 < 55 ** 2)) continue;
      near.push([x, y]);
      const s = between(3.6, 8.5);
      const dot = node('lucie-star is-near', field);
      place(dot, x, y, s);
      const sway = node('lucie-star-sway', dot);
      const img = node('lucie-star-img is-bokeh', sway);
      const opacity = 0.3 + 0.06 * s;
      img.style.opacity = opacity.toFixed(2);
      stars.push({ kind: 'bokeh', dot, sway, img, opacity });
    }
    opts.insert(field);
    return { stars, rand };
  }

  function animateStardust({ stars, rand }) {
    const anims = [];
    const between = (min, max) => min + rand() * (max - min);
    const loop = (n, keyframes, duration) => {
      const a = n.animate(keyframes, { duration, iterations: Infinity, direction: 'alternate', easing: SINE });
      a.currentTime = rand() * duration * 2;
      a.pause();
      return a;
    };
    for (const star of stars) {
      const near = star.kind === 'bokeh';
      // Rise: a constant float up, fading in over the first 15% and out over the last 30%.
      const climb = between(near ? 80 : 45, near ? 120 : 80);
      const rise = between(near ? 7000 : 8000, near ? 10000 : 13000);
      const lift = star.dot.animate([
        { transform: 'translateY(0)', opacity: 0 },
        { transform: `translateY(${(-climb * 0.15).toFixed(1)}px)`, opacity: 1, offset: 0.15 },
        { transform: `translateY(${(-climb * 0.7).toFixed(1)}px)`, opacity: 1, offset: 0.7 },
        { transform: `translateY(${(-climb).toFixed(1)}px)`, opacity: 0 },
      ], { duration: rise, iterations: Infinity, easing: 'linear' });
      lift.currentTime = rand() * rise;
      lift.pause();
      anims.push(lift);
      // Sway: a few px sideways and a little bob. Near stars move more.
      const dx = between(-1, 1) * (near ? 9 : 6);
      const dy = between(-1, 1) * (near ? 5 : 3);
      anims.push(loop(star.sway, [{ transform: 'translate(0, 0)' }, { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }], between(near ? 3500 : 2500, near ? 6000 : 4500)));
      if (near) {
        anims.push(loop(star.img, [{ opacity: star.opacity }, { opacity: star.opacity * 0.4 }], between(2500, 5000)));
        continue;
      }
      anims.push(loop(star.twinkle, [
        { opacity: star.opacity, transform: 'scale(1)' },
        { opacity: star.opacity * 0.2, transform: 'scale(0.6)' },
      ], between(1200, 3200)));
      if (star.soft) {
        // Focus pull: hold sharp, crossfade to the blurred copy, hold, and back.
        const duration = between(3000, 6000);
        const start = rand() * duration * 2;
        for (const [n, frames] of [[star.sharp, [1, 1, 0, 0]], [star.soft, [0, 0, 1, 1]]]) {
          const a = n.animate(frames.map((opacity, i) => ({ opacity, offset: [0, 0.3, 0.7, 1][i] })),
            { duration, iterations: Infinity, direction: 'alternate', easing: SINE });
          a.currentTime = start;
          a.pause();
          anims.push(a);
        }
      }
    }
    return anims;
  }

  const DUST_OPTS = { perBand: 2, rise: 210, bottom: 12, bokeh: 8, bokehFrom: 240, bokehTo: 40 };
  const dustTiles = [...document.querySelectorAll('[data-stardust]')];
  if (dustTiles.length) {
    const draw = () => {
      const running = new Map();
      dustTiles.forEach((tile, i) => {
        const drawn = drawStardust(tile, 4243 + i * 7919, { ...DUST_OPTS, insert: (field) => tile.querySelector('.lucie-tile-glow').after(field) });
        if (!reduceMotion) running.set(tile, animateStardust(drawn));
      });
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          for (const a of running.get(entry.target) ?? []) entry.isIntersecting ? a.play() : a.pause();
        }
      });
      running.forEach((_, tile) => io.observe(tile));
    };
    (document.fonts?.ready ?? Promise.resolve()).then(draw);
  }

  /* ---------- Picked by Lucie: tap a chip, skeleton, swap products ---------- */

  const SETS = {
    morning: [
      { name: 'Slip Dew Body Highlighter', price: '24.99', img: 'p-highlighter' },
      { name: 'The Big Gripper Power Primer', price: '22.00', img: 'p-primer' },
      { name: 'Lip Sync Matte Lip Cream', price: '19.99', img: 'p-lip' },
      { name: 'CEO of Cleanser', price: '29.99', img: 'p-cleanser' },
    ],
    glam: [
      { name: 'Maybelline SuperStay Matte Ink, Seductress', price: '24.99', img: 'g-lip' },
      { name: "L'Oréal Telescopic Lift Mascara", price: '15.99', img: 'g-mascara' },
      { name: 'Revolution The Cherry Icon Palette', price: '18.00', img: 'g-palette' },
      { name: 'Milani Make It Last Dewy Setting Spray', price: '25.99', img: 'g-spray' },
    ],
  };

  // Warm the cache so the swap after the skeleton never shows a blank image
  Object.values(SETS).flat().forEach((p) => { new Image().src = `assets/${p.img}.webp`; });

  const picks = document.querySelector('[data-picks]');
  if (picks) {
    const grid = picks.querySelector('.products');
    const tap = picks.querySelector('.tap');
    const chips = [...picks.querySelectorAll('button.chip')];
    let current = 'morning';
    let busy = false;

    const productHTML = (p, i) => {
      const [whole, cents] = p.price.split('.');
      return `<article class="product" style="--i:${i}">
        <div class="product-img"><img src="assets/${p.img}.webp" alt="" width="240" height="240"></div>
        <p class="product-name">${p.name}</p>
        <p class="product-price">$${whole}<sup>.${cents}</sup></p>
      </article>`;
    };
    const skeletonHTML = () => Array.from({ length: 4 }, () => `<div class="product">
        <div class="product-img"></div><div class="bar"></div><div class="bar short"></div>
      </div>`).join('');

    function render(set) {
      grid.classList.remove('skeleton', 'is-leaving', 'is-shown');
      grid.innerHTML = SETS[set].map(productHTML).join('');
      grid.offsetHeight; // commit the hidden state so the stagger plays
      grid.classList.add('is-shown');
    }

    async function select(set) {
      if (busy || set === current) return;
      busy = true;
      current = set;
      chips.forEach((c) => c.classList.toggle('is-selected', c.dataset.set === set));
      grid.classList.add('is-leaving');
      await wait(160);
      grid.classList.remove('is-leaving', 'is-shown');
      grid.classList.add('skeleton', 'is-shown');
      grid.innerHTML = skeletonHTML();
      await wait(1000);
      render(set);
      busy = false;
    }

    function showTap(chip) {
      if (reduceMotion) return;
      const box = picks.getBoundingClientRect();
      const r = chip.getBoundingClientRect();
      tap.style.translate = `${r.left - box.left + r.width / 2}px ${r.top - box.top + r.height / 2}px`;
      tap.animate([
        { opacity: 0, transform: 'scale(0.6)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.35 },
        { opacity: 0, transform: 'scale(1.5)' },
      ], { duration: 650, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      chip.classList.add('is-pressed');
      setTimeout(() => chip.classList.remove('is-pressed'), 140);
    }

    let lastManual = 0;
    chips.forEach((chip) => chip.addEventListener('click', () => {
      lastManual = Date.now();
      select(chip.dataset.set);
    }));

    render(current);

    const whenVisible = watchVisibility(picks);
    (async function demo() {
      for (;;) {
        await wait(3200);
        await whenVisible();
        if (Date.now() - lastManual < 6000) continue; // let a real tap breathe
        const next = current === 'morning' ? 'glam' : 'morning';
        const chip = chips.find((c) => c.dataset.set === next);
        showTap(chip);
        await wait(120);
        await select(next);
        await wait(1200);
      }
    })();
  }
})();
