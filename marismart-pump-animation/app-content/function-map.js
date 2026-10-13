// Reference renderer for marismart_function_map.json (vanilla JS, no dependencies).
// Usage:
//   import { mountFunctionMap } from './function-map.js';
//   const data = await (await fetch('./marismart_function_map.json')).json();
//   mountFunctionMap(document.getElementById('map'), data, { arSupported: false, videoBase: './videos/' });
// Progress persists in localStorage when available; the page still works without it.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mountFunctionMap(root, data, opts = {}) {
  const KEY = `marismart.${data.object.id}.progress`;
  const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
    save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } },
  };
  const fresh = () => ({ lang: data.object.defaultLanguage, explored: [], checked: [], selected: null, answers: {}, scenarioAnswers: {} });
  let st = { ...fresh(), ...(store.load() || {}) };

  const t = (o) => (o ? o[st.lang] ?? o.en : '');
  const ui = data.ui;
  const fmt = (o, vars) => t(o).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const pointById = (id) => data.points.find((p) => p.id === id);
  const stateOf = (id) => (st.checked.includes(id) ? 'checked' : st.explored.includes(id) ? 'explored' : 'notExplored');
  const track = (event, payload) => { if (data.analytics.enabled && typeof opts.onEvent === 'function') opts.onEvent(event, payload); };
  const update = (patch) => { st = { ...st, ...patch }; store.save(st); render(); };

  function quiz(qid, q, chosen, onPick) {
    return `<div class="fm-q"><p class="fm-qtext">${esc(t(q.question || q.situation))}</p>${q.options.map((o, i) => {
      const picked = chosen === i;
      const cls = picked ? (o.correct ? 'ok' : 'bad') : '';
      return `<button class="fm-opt ${cls}" data-q="${qid}" data-i="${i}" ${chosen != null && q.options[chosen].correct ? 'disabled' : ''}>${esc(t(o.text))}</button>
        ${picked ? `<p class="fm-fb ${cls}"><b>${esc(t(o.correct ? ui.feedback.correct : ui.feedback.incorrect))}.</b> ${esc(t(o.feedback))}${o.correct ? '' : ' ' + esc(t(ui.feedback.tryAgain)) + '.'}</p>` : ''}`;
    }).join('')}</div>`;
  }
  const list = (items) => `<ul>${items.map((x) => `<li>${esc(t(x))}</li>`).join('')}</ul>`;
  const section = (label, body, open = false) => `<details class="fm-sec" ${open ? 'open' : ''}><summary>${esc(t(label))}</summary>${body}</details>`;

  function detail(p) {
    const s = ui.sections;
    const vids = p.links.video.map((v) => `<a href="${esc((opts.videoBase || '') + v.file)}#t=${v.startSeconds}" target="_blank" rel="noopener">▶ ${esc(t(v.label))}</a>`).join('');
    const docs = (p.links.documents || []).map((d) => `<a href="${esc((opts.docBase || '') + d.file)}" target="_blank" rel="noopener">📄 ${esc(t(d.label))}</a>`).join('');
    return `<div class="fm-detail" style="--c:${p.colour}">
      <div class="fm-eyebrow">${esc(fmt(ui.pointHeading, { id: p.id }))}</div>
      <h3>${esc(t(p.title))}</h3>
      <div class="fm-k">${esc(t(s.function))}</div><p>${esc(t(p.function))}</p>
      <div class="fm-k">${esc(t(s.purpose))}</div><p>${esc(t(p.purpose))}</p>
      ${section(s.observe, list(p.observe), true)}
      ${section(s.evidence, `<div class="fm-chips">${p.evidence.map((e) => `<span>${esc(t(data.evidenceFields[e]))}</span>`).join('')}</div>`)}
      ${section(s.doNot, list(p.doNot))}
      ${section(s.commonMistakes, list(p.commonMistakes))}
      ${section(s.quickCheck, quiz(`p${p.id}`, p.quickCheck, st.answers[p.id], null), true)}
      ${section(s.verification, `<p><span class="fm-badge ${p.verification.status}">${esc(t(ui.verificationStatus[p.verification.status]))}</span> ${esc(t(p.verification.note))}</p>`)}
      ${section(s.links, `<div class="fm-links">${vids}${docs}${opts.arSupported ? `<button class="fm-ar" data-ar="${esc(p.links.ar.glbNode)}">${esc(t(ui.openInAR))}</button>` : ''}</div>`)}
    </div>`;
  }

  function render() {
    const total = data.points.length;
    const unlocked = st.explored.length >= data.progression.selfCheck.unlockAfterExplored;
    const sel = st.selected ? pointById(st.selected) : null;
    const m = data.metadata;
    const ML = ui.metaLabels;
    const aw = (v) => (v ? esc(v) : `<i>${esc(t(ui.awaiting))}</i>`);
    root.innerHTML = `<div class="fm" lang="${st.lang}">
      <header class="fm-head"><div><h2>${esc(t(data.object.title))}</h2><p class="fm-sub">${esc(t(data.object.subtitle))}</p></div>
        <div class="fm-tools">${opts.arSupported ? '' : `<span class="fm-fallback" title="${esc(t(ui.fallbackExplain))}">${esc(t(ui.fallbackBadge))}</span>`}
        <button class="fm-lang">${esc(t(ui.languageToggle))}</button></div></header>
      ${opts.arSupported ? '' : `<p class="fm-note">${esc(t(ui.fallbackExplain))}</p>`}
      <div class="fm-grid">${data.points.map((p) => {
        const s = stateOf(p.id);
        return `<button class="fm-card ${s} ${st.selected === p.id ? 'sel' : ''}" data-point="${p.id}" style="--c:${p.colour}">
          <span class="fm-id">${p.id}</span><span class="fm-title">${esc(t(p.title))}</span><span class="fm-state">${esc(t(ui.state[s]))}</span></button>`;
      }).join('')}
        <button class="fm-card self ${unlocked ? '' : 'locked'}" data-self ${unlocked ? '' : 'disabled'}>
          <span class="fm-id">${data.progression.selfCheck.id}</span><span class="fm-title">${esc(t(data.progression.selfCheck.title))}</span>
          <span class="fm-state">${esc(t(unlocked ? ui.selfCheckOpen : ui.selfCheckLocked))}</span></button>
      </div>
      ${st.selected === 'self' ? `<div class="fm-detail"><h3>${esc(t(data.progression.selfCheck.title))}</h3>${data.progression.selfCheck.questionOrder.map((id, n) => `<p class="fm-k">${n + 1}.</p>${quiz(`p${id}`, pointById(id).quickCheck, st.answers[id])}`).join('')}</div>` : sel ? detail(sel) : ''}
      ${section(ui.sections.scenarios, data.scenarios.map((sc) => quiz(`s${sc.id}`, sc, st.scenarioAnswers[sc.id])).join(''))}
      <footer class="fm-foot"><span>${esc(fmt(ui.progress, { explored: st.explored.length, total, checked: st.checked.length }))}</span>
        <button class="fm-reset">↺ ${esc(t(ui.resetPractice))}</button></footer>
      ${section(ui.sections.metadata, `<dl class="fm-meta">
        <dt>${esc(t(ML.id))}</dt><dd>${esc(data.object.id)} · v${esc(data.object.version)}</dd>
        <dt>${esc(t(ML.contentOwner))}</dt><dd>${aw(m.contentOwner)}</dd><dt>${esc(t(ML.smeReviewer))}</dt><dd>${aw(m.smeReviewer)}</dd>
        <dt>${esc(t(ML.reviewDate))}</dt><dd>${aw(m.reviewDate)}</dd><dt>${esc(t(ML.nextReviewDate))}</dt><dd>${aw(m.nextReviewDate)}</dd></dl>
        <p class="fm-k">${esc(t(ML.unverified))}</p>${list(m.unverifiedItems)}
        <p class="fm-k">${esc(t(ML.sources))}</p>${m.sources.length ? list(m.sources) : `<p>${esc(t(m.sourcesNote))}</p>`}
        <p class="fm-k">${esc(t(ML.stcw))}</p><p>${esc(t(m.alignment.stcw))}</p>
        <p class="fm-k">${esc(t(ML.ai))}</p><p>${esc(t(m.aiDisclosure))}</p><p class="fm-sub">${esc(t(m.disclaimer))}</p>`)}
    </div>`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.classList.contains('fm-lang')) return update({ lang: st.lang === 'ms' ? 'en' : 'ms' });
    if (b.classList.contains('fm-reset')) return update({ ...fresh(), lang: st.lang });
    if (b.dataset.self !== undefined) return update({ selected: 'self' });
    if (b.dataset.point) {
      const id = b.dataset.point;
      track('point_opened', { id });
      return update({ selected: id, explored: st.explored.includes(id) ? st.explored : [...st.explored, id] });
    }
    if (b.dataset.ar) return opts.onOpenAR && opts.onOpenAR(b.dataset.ar);
    if (b.dataset.q) {
      const i = Number(b.dataset.i), q = b.dataset.q, id = q.slice(1);
      if (q[0] === 'p') {
        const ok = pointById(id).quickCheck.options[i].correct;
        track('quick_check_answered', { id, response: i, success: ok });
        return update({ answers: { ...st.answers, [id]: i }, checked: ok && !st.checked.includes(id) ? [...st.checked, id] : st.checked });
      }
      const sc = data.scenarios.find((x) => x.id === id);
      track('scenario_answered', { id, response: i, success: sc.options[i].correct });
      return update({ scenarioAnswers: { ...st.scenarioAnswers, [id]: i } });
    }
  });
  render();
  return { getState: () => ({ ...st }), reset: () => update(fresh()) };
}
