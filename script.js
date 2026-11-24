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
    const reply = step('reply');
    reply.innerHTML = reply.textContent.trim().split(' ')
      .map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`).join(' ');

    const show = (name, on = true) => step(name).classList.toggle('on', on);
    const whenVisible = watchVisibility(thread);

    (async function loop() {
      for (;;) {
        await whenVisible();
        thread.classList.remove('is-out');
        await wait(500);
        show('user');
        await wait(800);
        thread.classList.add('is-thinking');
        show('thinking');
        await wait(1800);
        show('thinking', false);
        thread.classList.remove('is-thinking');
        show('reply');
        await wait(650);
        show('card');
        await wait(550);
        show('feedback');
        await wait(4200);
        thread.classList.add('is-out');
        await wait(500);
        ['user', 'reply', 'card', 'feedback'].forEach((n) => show(n, false));
        await wait(700);
      }
    })();
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
