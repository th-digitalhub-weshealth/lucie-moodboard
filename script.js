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
      thread.style.transition = 'height 450ms var(--ease-out)';
      thread.style.height = `${to}px`;
      clearTimeout(settle);
      settle = setTimeout(() => { thread.style.height = ''; thread.style.transition = ''; }, 500);
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
        await wait(1600);
        await whenVisible();
        grow(() => setSecond(true)); // stage 2: make room for the whole follow-up
        await wait(550);
        await exchange('2', [['routine', 650], ['feedback2', 900]]);
        await wait(5200);
        thread.classList.add('is-out');
        await wait(450);
        reset();
        grow(() => setSecond(false)); // back to stage 1
        await wait(900);
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
          // Flick: the card flies off, the finger lifts, the stack moves up a place.
          card.animate([{ transform: 'translateX(-38px) rotate(-3deg)' }, { transform: 'translateX(-135%) rotate(-14deg)' }], { duration: 420, easing: EASE_OUT, fill: 'forwards' });
          touch.animate([{ transform: 'translateX(-38px)', opacity: 1 }, { transform: 'translateX(-90px)', opacity: 0 }], { duration: 260, easing: EASE_OUT, fill: 'forwards' });
          order = [...order.slice(1), card];
          layout();
          await wait(460);
          // The swiped card rejoins at the back, hidden, ready to fade in as the stack cycles.
          card.style.transition = 'none';
          card.getAnimations().forEach((a) => a.cancel());
          void card.offsetHeight;
          card.style.transition = '';
          touch.getAnimations().forEach((a) => a.cancel());
        }
      })();
    }
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
