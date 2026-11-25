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

  /* ---------- Secret view switch: the title flips between the board and "Applied on mobile" ---------- */

  const page = document.querySelector('.page');
  const toggle = document.querySelector('[data-view-toggle]');
  if (page && toggle) {
    const label = toggle.querySelector('[data-view-label]');
    const baseTitle = document.title;
    const setView = (applied) => {
      page.classList.remove('is-shown');
      page.classList.toggle('is-applied', applied);
      // Next frame, so the screens start hidden and fade in one after another.
      if (applied) requestAnimationFrame(() => requestAnimationFrame(() => page.classList.add('is-shown')));
      label.textContent = applied ? '— Applied on mobile' : '— Creative direction';
      document.title = applied ? 'Lucie — Applied on mobile' : baseTitle;
      history.replaceState(null, '', applied ? '#applied' : location.pathname + location.search);
    };
    if (location.hash === '#applied') setView(true);
    addEventListener('hashchange', () => setView(location.hash === '#applied'));
    toggle.addEventListener('click', async () => {
      const applied = !page.classList.contains('is-applied');
      if (!reduceMotion) {
        page.classList.add('is-swapping');
        await wait(260);
      }
      setView(applied);
      scrollTo(0, 0);
      requestAnimationFrame(() => page.classList.remove('is-swapping'));
    });
  }

  /* ---------- Applied on mobile: one live phone ----------
     Swipe (or arrow keys / trackpad) through the three cold-start covers. Tap "Build a routine" to
     enter the chat: each answer echoes as a bubble, Lucie thinks, asks the next question, and the
     tiles stagger in. After the last answer the routine builds from skeletons into products.
     Back steps back; close returns to the covers. Content and styles from Paper p-1-0. */

  const mob = document.querySelector('[data-mob]');
  if (mob) {
    const phone = mob.querySelector('[data-mob-phone]');
    const cover = mob.querySelector('[data-mob-cover]');
    const track = mob.querySelector('[data-mob-track]');
    const scroll = mob.querySelector('[data-mob-scroll]');
    const convo = mob.querySelector('[data-mob-convo]');
    const W = 402;
    const STAR = 'M9.042 0.003C9.211 0.017 9.374 0.072 9.517 0.164L9.653 0.266C9.779 0.379 9.875 0.521 9.934 0.680L9.964 0.773L11.282 5.885L11.325 6.018C11.377 6.146 11.455 6.264 11.554 6.362C11.685 6.494 11.850 6.588 12.030 6.634L17.142 7.952L17.153 7.954C17.345 8.007 17.517 8.114 17.650 8.262L17.753 8.398C17.860 8.565 17.917 8.759 17.917 8.958C17.917 9.186 17.842 9.408 17.704 9.590C17.566 9.771 17.372 9.902 17.153 9.963L12.030 11.283C11.849 11.329 11.685 11.424 11.554 11.555C11.422 11.687 11.328 11.851 11.282 12.031L9.963 17.144C9.899 17.375 9.768 17.568 9.587 17.705C9.405 17.842 9.184 17.917 8.957 17.917C8.729 17.917 8.508 17.842 8.327 17.705C8.146 17.568 8.015 17.375 7.953 17.156L6.632 12.031C6.586 11.851 6.492 11.687 6.361 11.555C6.229 11.424 6.065 11.329 5.885 11.283L0.771 9.964C0.539 9.899 0.347 9.767 0.211 9.587C0.074 9.406 0 9.185 0 8.958C0 8.732 0.074 8.512 0.211 8.331C0.347 8.151 0.539 8.020 0.757 7.957L5.885 6.633C6.065 6.587 6.229 6.493 6.361 6.361C6.492 6.230 6.586 6.066 6.632 5.885L7.954 0.761C8.015 0.542 8.147 0.349 8.328 0.212C8.509 0.075 8.730 0 8.958 0Z';
    const S = 'fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    const icon = (inner) => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${inner}</svg>`;
    // Focus-question icons come from the single-tap bento on the board, so the two stay identical.
    const boardIcon = (label) => [...document.querySelectorAll('.taps-grid .tap-opt')].find((t) => t.textContent.trim() === label)?.querySelector('svg')?.innerHTML ?? '';
    const SKIN = [
      { label: 'Tight', sub: 'Dry', phrase: 'dry skin', svg: icon(`<path d="M5.7 10.5H12.5M15.6 10.5H25.3M28.5 10.5H34.3M3.0 20H8.1M11.3 20H24.6M27.8 20H37.0M5.7 29.5H15.1M18.1 29.5H23.8M26.8 29.5H34.3" ${S} />`) },
      { label: 'Shiny all over', sub: 'Oily', phrase: 'oily skin', svg: () => icon(boardIcon('Oiliness')) },
      { label: 'Shiny T-zone', sub: 'Combo', phrase: 'a shiny T-zone', svg: icon(`<path d="M3.71 12.93L4.52 12.77L5.34 12.76L6.15 12.89L6.97 13.16L7.78 13.55L8.60 14.04L9.41 14.58L10.23 15.16L11.04 15.72L11.85 16.24L12.67 16.68L13.48 17.00L14.30 17.20L15.11 17.25L15.93 17.16L16.74 16.93L17.56 16.57L18.37 16.10L19.19 15.57L20.00 15.00L20.81 14.43L21.63 13.90L22.44 13.43L23.26 13.07L24.07 12.84L24.89 12.75L25.70 12.80L26.52 13.00L27.33 13.32L28.15 13.76L28.96 14.28L29.77 14.84L30.59 15.42L31.40 15.96L32.22 16.45L33.03 16.84L33.85 17.11L34.66 17.24L35.48 17.23L36.29 17.07" ${S} /><path d="M3.7 25H11.5M14.6 25H26.3M29.5 25H36.3" ${S} />`) },
      { label: 'Easily irritated', sub: 'Sensitive', phrase: 'sensitive skin', svg: icon([10.5, 20, 29.5].map((y, r) => (r === 1 ? [6, 11.6, 17.2, 22.8, 28.4, 34] : [8.8, 14.4, 20, 25.6, 31.2]).map((x) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#813F62" />`).join('')).join('')) },
    ];
    const FOCUS = ['Breakouts', 'Oiliness', 'Texture', 'Blackheads', 'Redness', 'Dry patches'].map((label) => ({ label, svg: () => icon(boardIcon(label)) }));
    const TIME = [
      { label: 'Morning', when: 'morning routine', svg: icon('<path d="M3 28H37" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 28a5.5 5.5 0 0 1 11 0Z" fill="#813F62"/><path d="M9 28a11 11 0 0 1 22 0" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 28a16.5 16.5 0 0 1 33 0" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 3.4"/>') },
      { label: 'Night', when: 'night routine', svg: icon('<path d="M18.56 9.01A12 12 0 1 0 30.75 23.41A9.5 9.5 0 0 1 18.56 9.01Z" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linejoin="round"/><circle cx="31" cy="8" r="1.4" fill="#813F62"/><circle cx="35.5" cy="14.5" r="1" fill="#813F62"/>') },
      { label: 'Both', when: 'routine', svg: icon('<path d="M3 20H37" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 20a5.5 5.5 0 0 1 11 0Z" fill="#813F62"/><path d="M9 20a11 11 0 0 1 22 0" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round"/><path d="M9 20a11 11 0 0 0 22 0" fill="none" stroke="#813F62" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 3.4"/>') },
    ];
    const ROUTINE = [
      ['Cleanse', 'Lifts oil, gentle on cheeks', [['r-cleanser', 'BUBBLE Fresh Start Gel Cleanser', '$25.00'], ['p-cleanse-2', 'CeraVe Blemish Control Cleanser', '$20.79'], ['p-cleanse-3', 'Q+A Niacinamide Exfoliating Cleanser', '$9.59'], ['p-cleanse-4', 'medicube Azelaic Acid Foam Cleanser', '$34.00']]],
      ['Treat', 'Clears pores, calms shine', [['r-serum', 'BUBBLE Super Clear 2% Salicylic Serum', '$29.00'], ['p-treat-2', 'EQQUALBERRY Pore Minimizing Serum', '$38.00'], ['p-treat-3', 'L’Oréal Niacinamide Dark Spot Serum', '$35.99'], ['p-treat-4', 'medicube Azelaic Acid Calming Serum', '$34.00']]],
      ['Moisturise', 'Light, oil-free hydration', [['r-moisturiser', 'La Roche-Posay Effaclar Mattifying', '$30.39'], ['p-moist-2', 'Boring Without You Face Flood Gel', '$27.99'], ['p-moist-3', 'Conserving Beauty Clearing Gel', '$29.25'], ['p-moist-4', 'BUBBLE Slam Dunk Hydrating Moisturiser', '$28.00']]],
      ['Protect', 'SPF that won’t add shine', [['r-spf', 'Avène Sunsitive Fluid SPF 50+', '$23.39'], ['p-protect-2', 'La Roche-Posay Anthelios Ultra', '$32.79'], ['p-protect-3', 'Olay Super SPF 50 Fluid Moisturiser', '$34.99'], ['p-protect-4', 'Bioderma Photoderm Dry-Touch SPF 50', '$27.99']]],
    ];
    const QUESTIONS = [
      { q: 'How does your skin feel by lunchtime?', opts: SKIN },
      { q: 'What would you love to change first?', opts: FOCUS, spread: true },
      { q: 'When will you use it?', opts: TIME, spread: true, three: true },
    ];

    /* Fit the 402 × 874 screen to the space (never larger than 1:1). */
    const fit = () => {
      const s = Math.min(1, mob.parentElement.clientWidth / W, Math.max(0.62, (innerHeight - 150) / 874));
      mob.style.setProperty('--s', s.toFixed(4));
      return s;
    };
    let scale = fit();
    new ResizeObserver(() => { scale = fit(); }).observe(mob.parentElement);

    /* Covers: drag/swipe, trackpad, arrow keys. A tap (no drag) on the first opens the chat. */
    /* Story bars: the current cover's bar fills, then the next cover slides in. Paused while
       dragging, in the chat, or with the phone off-screen; no autoplay with reduced motion. */
    const bars = [...mob.querySelectorAll('[data-mob-bars] b')];
    const coach = mob.querySelector('[data-mob-coach]');
    const STORY = 7000;
    let story = null;
    let onScreen = false;
    let slide = 0;
    const storyRuns = () => onScreen && !drag && !phone.classList.contains('is-chat');
    const syncStory = () => { if (!story) return; storyRuns() ? story.play() : story.pause(); };
    const startStory = () => {
      story?.cancel();
      story = null;
      bars.forEach((b, i) => { b.style.transform = `scaleX(${i < slide || (reduceMotion && i === slide) ? 1 : 0})`; });
      if (reduceMotion) return;
      story = bars[slide].animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: STORY, easing: 'linear', fill: 'forwards' });
      story.onfinish = () => setSlide(slide + 1);
      syncStory();
    };
    const setSlide = (i, animate = true) => {
      slide = (i + 3) % 3;
      track.style.transition = animate && !reduceMotion ? 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1), scale 450ms var(--ease-out)' : 'none';
      track.style.transform = `translateX(${-slide * W}px)`;
      startStory();
    };
    const dismissCoach = () => coach.classList.add('is-gone');
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; syncStory(); }, { threshold: 0.4 }).observe(phone);
    let drag = null;
    cover.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, t: performance.now(), dx: 0 };
      track.style.transition = 'none';
      story?.pause();
      cover.setPointerCapture(e.pointerId);
    });
    cover.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.dx = (e.clientX - drag.x) / scale;
      track.style.transform = `translateX(${-slide * W + drag.dx}px)`;
    });
    const endDrag = () => {
      if (!drag) return;
      const { dx, t } = drag;
      drag = null;
      const fast = Math.abs(dx) / (performance.now() - t) > 0.45;
      if (Math.abs(dx) < 6) {
        track.style.transform = `translateX(${-slide * W}px)`;
        if (slide === 0) enterChat(); else syncStory();
        return;
      }
      if (dx < -60 || (fast && dx < 0)) { dismissCoach(); setSlide(slide + 1); }
      else if (dx > 60 || (fast && dx > 0)) { dismissCoach(); setSlide(slide - 1); }
      else { track.style.transition = 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1)'; track.style.transform = `translateX(${-slide * W}px)`; syncStory(); }
    };
    cover.addEventListener('pointerup', endDrag);
    cover.addEventListener('pointercancel', endDrag);
    let wheelLock = 0;
    cover.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < 25 || Math.abs(e.deltaX) < Math.abs(e.deltaY) || performance.now() < wheelLock) return;
      e.preventDefault();
      wheelLock = performance.now() + 650;
      dismissCoach();
      setSlide(slide + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    phone.addEventListener('keydown', (e) => {
      if (phone.classList.contains('is-chat')) return;
      if (e.key === 'ArrowRight') { dismissCoach(); setSlide(slide + 1); }
      if (e.key === 'ArrowLeft') { dismissCoach(); setSlide(slide - 1); }
      if ((e.key === 'Enter' || e.key === ' ') && slide === 0) { e.preventDefault(); enterChat(); }
    });

    /* Chat */
    const answers = [];
    let step = -1;
    let run = 0;
    let picking = false;
    const el = (tag, cls, html = '') => { const n = document.createElement(tag); n.className = cls; n.innerHTML = html; return n; };
    const show = (n) => requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('on')));
    const pause = (ms) => wait(reduceMotion ? Math.min(ms, 120) : ms);
    const words = (text) => text.split(' ').map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`).join(' ');

    async function render(n) {
      const me = ++run;
      const alive = () => me === run;
      step = n;
      if (convo.childElementCount) {
        convo.classList.add('is-leaving');
        await pause(230);
        if (!alive()) return;
      }
      convo.replaceChildren();
      convo.classList.remove('is-leaving');
      scroll.scrollTop = 0;

      const echo = el('div', 'mob-echo', n === 0 ? 'Build a routine' : answers[n - 1].label);
      convo.append(echo); show(echo);
      await pause(380); if (!alive()) return;

      const q = el('div', 'mob-q is-thinking', `<svg class="mob-star" viewBox="0 0 17.92 17.92" aria-hidden="true"><path d="${STAR}" fill="#ECDDFF"/></svg><span class="mob-q-text"><span class="thinking">Thinking</span></span>`);
      convo.append(q); show(q);
      await pause(n === 3 ? 1100 : 800); if (!alive()) return;

      const text = q.querySelector('.mob-q-text');
      const line = n < 3 ? QUESTIONS[n].q : `Your ${answers[2].when} for ${answers[0].phrase}.`;
      text.innerHTML = words(line);
      q.classList.remove('is-thinking');
      show(text);
      await pause(260); if (!alive()) return;

      if (n < 3) {
        const { opts, spread, three } = QUESTIONS[n];
        const grid = el('div', `mob-opts${three ? ' is-three' : ''}`);
        opts.forEach((o, i) => {
          const b = el('button', `mob-opt${spread ? ' is-spread' : ''}`, `${typeof o.svg === 'function' ? o.svg() : o.svg}<b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}`);
          b.type = 'button';
          b.style.setProperty('--i', i);
          if (answers[n] === o) b.classList.add('is-selected'); // coming back shows the earlier choice
          b.addEventListener('click', () => pick(n, o, b));
          grid.append(b);
        });
        convo.append(grid); show(grid);
      } else {
        const routine = el('div', 'mob-routine');
        ROUTINE.forEach(([title, sub, prods], i) => routine.append(stepEl(title, sub, prods, i)));
        convo.append(routine); show(routine);
        await pause(1000); if (!alive()) return;
        [...routine.children].forEach((s, i) => setTimeout(() => alive() && s.classList.remove('is-loading'), reduceMotion ? 0 : i * 220));
      }
    }

    function stepEl(title, sub, prods, i) {
      const s = el('section', 'mob-step is-loading', `
        <svg class="mob-wave" viewBox="0 0 362 8" aria-hidden="true"><path d="M1 4q5-5 10 0${'t10 0'.repeat(35)}" fill="none" stroke="#DCC4F5" stroke-width="1.5" stroke-linecap="round"/></svg>
        <div class="mob-step-head"><div><b>${title}</b><small>${sub}</small></div>
          <button type="button" class="mob-shuffle" aria-label="Show other ${title.toLowerCase()} picks"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="#813F62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
        <div class="mob-prods">${prods.map(([img, name, price]) => `
          <div class="mob-prod">
            <div class="mob-prod-img"><img src="assets/${img}.webp" alt="" width="500" height="500" />
              <button type="button" class="mob-add" aria-label="Add ${name} to bag" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path class="is-plus" d="M7 1.5v11M1.5 7h11" fill="none" stroke="#5E1F42" stroke-width="1.6" stroke-linecap="round"/><path class="is-tick" d="M2.5 7.3l3 3 6-6.3" fill="none" stroke="#FFFEFE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
            <div class="mob-prod-text"><span>${name}</span><b>${price}</b></div>
          </div>`).join('')}</div>`);
      s.style.setProperty('--i', i);
      s.querySelectorAll('.mob-add').forEach((b) => b.addEventListener('click', () => {
        const on = b.classList.toggle('is-added');
        b.setAttribute('aria-pressed', on);
      }));
      // Shuffle: the icon turns and the four picks rotate, as if Lucie offered the next option first.
      const shuffle = s.querySelector('.mob-shuffle');
      const grid = s.querySelector('.mob-prods');
      let turns = 0;
      shuffle.addEventListener('click', async () => {
        shuffle.querySelector('svg').style.rotate = `${++turns * 360}deg`;
        grid.classList.add('is-shuffling');
        await pause(200);
        grid.append(grid.firstElementChild);
        grid.classList.remove('is-shuffling');
      });
      return s;
    }

    async function pick(n, o, b) {
      if (picking || step !== n) return;
      picking = true;
      b.parentElement.querySelectorAll('.mob-opt').forEach((x) => x.classList.toggle('is-selected', x === b));
      answers[n] = o;
      await pause(480);
      picking = false;
      render(n + 1);
    }

    function enterChat() {
      answers.length = 0;
      phone.classList.add('is-chat');
      syncStory();
      setTimeout(() => render(0), reduceMotion ? 0 : 350);
    }
    function exitChat() {
      run++;
      step = -1;
      phone.classList.remove('is-chat');
      setTimeout(() => { convo.replaceChildren(); setSlide(0, false); }, 450);
    }
    mob.querySelector('[data-mob-back]').addEventListener('click', () => (step <= 0 ? exitChat() : render(step - 1)));
    mob.querySelector('[data-mob-close]').addEventListener('click', exitChat);
    // Leaving the mobile view resets the phone to the first cover.
    document.querySelector('[data-view-toggle]')?.addEventListener('click', () => {
      run++; step = -1; phone.classList.remove('is-chat'); convo.replaceChildren(); setSlide(0, false);
    });
    setSlide(0, false);
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

    const reset = () => thread.querySelectorAll('[data-step]').forEach((el) => el.classList.remove('on'));

    const show = (name, on = true) => step(name).classList.toggle('on', on);
    const whenVisible = watchVisibility(thread);

    // One exchange: question, Lucie thinks (a skeleton of her answer appears in its place), answers
    // word by word, then the real content cross-fades in over the skeleton.
    async function exchange(n, skeleton, content) {
      show(`user${n}`);
      await wait(800);
      show(`answer${n}`);
      step(`answer${n}`).classList.add('is-thinking');
      show(`thinking${n}`);
      await wait(350);
      show(skeleton);
      await wait(1450);
      show(`thinking${n}`, false);
      step(`answer${n}`).classList.remove('is-thinking');
      show(`reply${n}`);
      for (const [i, [name, pause]] of content.entries()) {
        await wait(pause);
        show(name);
        if (i === 0) show(skeleton, false);
      }
    }

    (async function loop() {
      for (;;) {
        await whenVisible();
        thread.classList.remove('is-out');
        await wait(500);
        await exchange('', 'card-sk', [['card', 650], ['feedback', 550]]);
        await wait(250);
        await whenVisible();
        await exchange('2', 'routine-sk', [['routine', 650], ['feedback2', 900]]);
        await wait(5200);
        thread.classList.add('is-out');
        await wait(600);
        reset();
        await wait(700);
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
