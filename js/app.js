/* SEEK for Microsoft Teams – interactive prototype.
   Plain JS, no build step: state lives in `S`, every view is a function that
   returns an HTML string, and render() redraws the window after each change. */

/* ================= Helpers ================= */

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function ic(name, size = 20, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
const seekLogo = (size) => SEEK_LOGO.replace('<svg ', `<svg width="${size}" height="${size}" `);
const link = (text) => `<a class="a" href="#">${text}</a>`; // decorative links; clicks are swallowed

/* Avatars use Fluent's colorful avatar palette, picked by a hash of the name */
const AVATAR_COLORS = [
  ['#F6D1D5', '#750B1C'], ['#FDDFCB', '#8A3707'], ['#FEF7B2', '#6D5700'], ['#D9F0D3', '#0B4A0B'], ['#CDEDF4', '#004E5C'],
  ['#DCE0FA', '#2D2F82'], ['#E8D9F7', '#4B1F78'], ['#F7D9EE', '#6D1253'], ['#E1DFDD', '#3B3A39'],
];
function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
function initials(name) {
  const [a = '', b = ''] = name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/);
  return (a.charAt(0) + b.charAt(0)).toUpperCase();
}
function avatar(name, size = 32, { presence = false, text } = {}) {
  const [bg, fg] = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  const dot = presence ? `<span class="pres">${ic('checkmark_f')}</span>` : '';
  return `<span class="av av-${size}" style="background:${bg};color:${fg}" title="${esc(name)}">${text || initials(name)}${dot}</span>`;
}

/* Dates are stored as 'YYYY-MM-DD' strings and times as decimal hours */
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const TODAY_KEY = ymd(TODAY);

function fmtTime(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh % 12 || 12}:${pad(mm)} ${hh >= 12 ? 'PM' : 'AM'}`;
}
const chatTime = (minutesLater = 0) => fmtTime((11 * 60 + 21 + minutesLater) / 60); // the chat happens around 11:21 AM

function dayLabel(key) {
  if (key === TODAY_KEY) return 'Today';
  if (key === ymd(addDays(TODAY, 1))) return 'Tomorrow';
  const d = parseYmd(key);
  return `${DOW[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/* ================= Item helpers ================= */

const getItem = (id) => ITEMS.find((i) => i.id === id);
const typeLabel = (it) => (it.type === 'popup' ? 'Pop-up' : 'Event');
const isPast = (it) => it.date < TODAY_KEY || (it.date === TODAY_KEY && it.end <= NOW);
const goingCount = (it) => it.going + (S.added.has(it.id) ? 1 : 0);
const passesFilter = (it) => S.filter === 'all' || (S.filter === 'popups') === (it.type === 'popup');

function timeLabel(it) {
  if (it.date === TODAY_KEY) {
    if (it.rel) return it.rel;
    if (it.start <= NOW && it.end > NOW) return 'Happening now';
  }
  return fmtTime(it.start);
}

function todaySummary() {
  const today = ITEMS.filter((i) => i.date === TODAY_KEY);
  const popups = today.filter((i) => i.type === 'popup').length;
  return `${plural(popups, 'pop-up')} and ${plural(today.length - popups, 'event')} today`;
}

/* ================= State ================= */

const S = {
  // shell
  rail: 'calendar',        // left app bar selection
  meetingTab: 'details',   // chat | details | seek
  installed: false,
  dialog: 'store',         // store | detail | null
  storeQuery: '',
  installing: false,
  // SEEK tab
  seekTab: 'today',        // today | calendar | create
  segment: 'events',       // popups | events
  view: 'cards',           // cards | compact
  calView: 'week',         // agenda | week | month
  filter: 'all',           // all | popups | events
  weekStart: mondayOf(TODAY),
  month: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  added: new Set(),        // item ids the user added to their calendar
  popover: null,           // { id, x, y, side, beakY }
  openDropdown: null,
  flash: null,             // id of a card to highlight once
  form: { name: '', date: TODAY_KEY, time: '', desc: '' },
  errors: {},
  // chat
  chat: initialChat(),
  draft: CHAT_DRAFT,
  typing: null,
  chatBadge: 2,
  scriptPlayed: false,
};

let SCALE = 1; // how much the 1280×800 window is scaled to fit the page

/* ================= Render ================= */

function render() {
  // keep scroll positions of scroll areas that survive a redraw
  const scroll = {};
  document.querySelectorAll('[data-keep]').forEach((el) => { scroll[el.dataset.keep] = el.scrollTop; });

  $('#win').innerHTML =
    titleBar() + appBar() +
    `<section class="main">${mainView()}</section>` +
    dialogView() +
    `<div id="toasts"></div>`;

  document.querySelectorAll('[data-keep]').forEach((el) => {
    if (scroll[el.dataset.keep] != null) el.scrollTop = scroll[el.dataset.keep];
  });
  toasts.forEach((t) => $('#toasts').appendChild(t));

  const flashed = $('.ev.flash');
  if (flashed && !flashed.dataset.seen) {
    flashed.dataset.seen = '1';
    flashed.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const msgs = $('#msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  renderSteps();
}

/* ================= Teams shell ================= */

function titleBar() {
  return `<div class="tb">
    <div class="tb-logo">${TEAMS_MARK}</div>
    <div class="tb-center">
      <button class="icbtn" aria-label="Back">${ic('chevron_left', 16)}</button>
      <button class="icbtn" aria-label="Forward">${ic('chevron_right', 16)}</button>
      <div class="tb-search">${ic('search', 16)}<span>Search</span></div>
    </div>
    <div class="tb-right">
      <button class="icbtn" aria-label="Settings and more">${ic('more_horizontal')}</button>
      <span class="tb-me">${avatar(ME.name, 32, { presence: true })}</span>
      <span class="tb-win">${ic('subtract', 16)}</span>
      <span class="tb-win">${ic('square', 14)}</span>
      <span class="tb-win close">${ic('dismiss', 16)}</span>
    </div>
  </div>`;
}

const RAIL = [
  { id: 'activity', label: 'Activity', icon: 'alert' },
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'teams', label: 'Teams', icon: 'people_team' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar_ltr' },
  { id: 'calls', label: 'Calls', icon: 'call' },
  { id: 'files', label: 'Files', icon: 'document' },
];

function appBar() {
  const item = ({ id, label, icon }) => {
    const sel = S.rail === id;
    const badge = id === 'chat' && S.chatBadge ? `<span class="badge">${S.chatBadge}</span>` : '';
    return `<button class="rail-i ${sel ? 'sel' : ''}" data-act="rail" data-arg="${id}" aria-label="${label}">
      ${ic(sel ? `${icon}_f` : icon, 24)}${badge}<span>${label}</span></button>`;
  };
  const seek = S.installed
    ? `<button class="rail-i" data-act="openSeek" aria-label="SEEK">${seekLogo(24)}<span>SEEK</span></button>`
    : '';
  return `<nav class="rail">
    ${RAIL.map(item).join('')}${seek}
    <button class="rail-i" aria-label="More apps">${ic('more_horizontal', 24)}</button>
    <div class="rail-sep"></div>
    <button class="rail-i" data-act="openStore" aria-label="Apps">${ic('add_square', 24)}<span>Apps</span></button>
  </nav>`;
}

function mainView() {
  if (S.rail === 'chat') return chatView();
  if (S.rail === 'calendar') return meetingView();
  const { label, icon } = RAIL.find((r) => r.id === S.rail);
  return `<div class="empty"><div>${ic(icon, 48)}<h3>${label}</h3>
    <div>This area isn’t part of the SEEK prototype.<br>
    <button class="link" data-act="rail" data-arg="calendar">Back to Marketing review</button></div></div></div>`;
}

const tab = (act, key, label, selected, prefix = '') =>
  `<button class="tab ${selected ? 'sel' : ''}" data-act="${act}" data-arg="${key}">${prefix}${label}</button>`;
const seekTabIcon = () => `<span class="tab-logo">${seekLogo(16)}</span>`;

/* ================= Meeting ================= */

function meetingView() {
  const t = (key, label, prefix) => tab('meetingTab', key, label, S.meetingTab === key, prefix);
  const body = { seek: seekView, details: detailsView, chat: meetingChatView }[S.meetingTab]();
  return `<header class="mh">
      <div class="mh-icon">${ic('calendar_ltr')}</div>
      <div class="mh-title">Marketing review</div>
      <div class="tabs" role="tablist">
        ${t('chat', 'Chat')}${t('details', 'Details')}${S.installed ? t('seek', 'SEEK', seekTabIcon()) : ''}
        <button class="tab tab-add ${!S.installed && !S.dialog ? 'pulse' : ''}" data-act="openStore" aria-label="Add a tab">${ic('add')}</button>
      </div>
      <div class="mh-actions"><button class="btn primary">Join</button><button class="btn">Close</button></div>
    </header>
    ${body}`;
}

function detailsView() {
  return `<div class="det-toolbar">
      <button class="btn subtle brandtext">${ic('checkmark', 16)} Accepted ${ic('chevron_down', 12)}</button>
      <div class="vsep"></div>
      <button class="btn subtle">${ic('link', 16)} Copy link</button>
      <button class="btn subtle">${ic('more_horizontal', 16)}</button>
    </div>
    <div class="scroll" data-keep="details"><div class="det">
      <div class="det-row">${ic('info')}<div>
        <b>Monday, May 11, 2026 &nbsp;11:30 AM – 12:00 PM</b>
        <div class="cap">Organizer: Beth Davis · 8 attendees</div>
      </div></div>
      <div class="det-row">${ic('text_description')}<div>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        <h2>Microsoft Teams meeting</h2>
        <div class="tight">
          <p><b>Join on your computer, mobile app or room device</b></p>
          <p>${link('Click here to join the meeting')}</p>
          <p>Meeting ID: 284 391 552 107 &nbsp; Passcode: Kp7xQ2</p>
          <p class="gap"><b>Or call in (audio only)</b></p>
          <p>${link('+1 555-0100,,333333333#')} &nbsp;United States</p>
          <p>Phone conference ID: 333 333 333#</p>
          <p>${link('Find a local number')} | ${link('Reset PIN')}</p>
          <p class="gap">${link('Learn more')} | ${link('Meeting options')}</p>
        </div>
      </div></div>
    </div></div>`;
}

function meetingChatView() {
  const content = S.installed
    ? `<div class="daysep">Today</div>
       <div class="m"><div class="botav">${SEEK_LOGO}</div><div>
         <div class="hd"><b>SEEK</b><span class="apptag">App</span><span>11:05 AM</span></div>
         <div class="bub">Sarah Lin added <b>SEEK</b> to this meeting. Open the SEEK tab to see what’s happening today.</div>
       </div></div>`
    : `<div class="empty"><div>${ic('chat', 48)}<h3>No messages yet</h3>
       <div>Messages sent before, during and after the meeting show up here.</div></div></div>`;
  return `<div class="cv"><div class="msgs">${content}</div>
    <div class="comp"><div class="comp-box">
      <input placeholder="Type a message" aria-label="Type a message">
      <div class="comp-tools"><span class="icbtn">${ic('emoji')}</span><span class="icbtn">${ic('attach')}</span></div>
      <span class="send">${ic('send')}</span>
    </div></div></div>`;
}

/* ================= SEEK tab ================= */

function seekView() {
  const body = { today: todayView, calendar: calendarView, create: createView }[S.seekTab]();
  const tabs = S.seekTab === 'create' ? '' : `<div class="seek-bar">
      <div class="tabs" role="tablist">
        ${tab('seekTab', 'today', 'Today', S.seekTab === 'today')}${tab('seekTab', 'calendar', 'Calendar', S.seekTab === 'calendar')}
      </div>
      <button class="btn primary" data-act="openCreate">${ic('calendar_add')} Create an event</button>
    </div>`;
  return `<div class="scroll" data-keep="seek-${S.seekTab}"><div class="seek"><div class="seek-in">
    <div class="seek-head">
      <div><h1>Welcome back, Sarah!</h1><div class="sub">Monday, May 11 · ${todaySummary()}</div></div>
      <div class="seek-logo">${SEEK_LOGO}</div>
    </div>
    ${tabs}
    ${body}
  </div></div></div>`;
}

function addButton(it) {
  if (isPast(it)) return `<span class="ended">${ic('checkmark_circle', 16)} Ended</span>`;
  const on = S.added.has(it.id);
  return `<button class="btn sm ${on ? 'on' : 'brandtext'}" data-act="toggleAdd" data-arg="${it.id}" aria-pressed="${on}">
    ${ic(on ? 'checkmark' : 'add_circle', 16)} ${on ? 'Added' : 'Add to calendar'}</button>`;
}

function attendeeStack(it) {
  const offset = hash(it.id) % 3;
  let faces = ATTENDEES.slice(offset, offset + 3);
  if (S.added.has(it.id)) faces = [ME.name, ...faces.slice(0, 2)];
  return `<span class="pile">${faces.map((n) => avatar(n, 20)).join('')}</span>`;
}

const postedBy = (it) => `${avatar(PEOPLE[it.by] || it.by, 20)}<span>Posted by <b>@${esc(it.by)}</b></span>`;

/* badge: show the Pop-up/Event label (hidden in lists already filtered by type)
   preview: static copy used in the create form */
function card(it, { badge = true, preview = false } = {}) {
  const soon = it.date === TODAY_KEY && !isPast(it) && it.start <= NOW + 0.5;
  const action = preview
    ? `<span class="btn sm brandtext">${ic('add_circle', 16)} Add to calendar</span>`
    : addButton(it);
  return `<article class="card ev ${it.type} ${isPast(it) ? 'past' : ''} ${S.flash === it.id ? 'flash' : ''} ${preview ? 'static' : ''}">
    <div class="ev-by">${postedBy(it)}
      ${badge ? `<span class="badge-t ${it.type}">${typeLabel(it)}</span>` : ''}
      ${soon ? `<span class="badge-t live">${it.start <= NOW ? 'Live' : 'Soon'}</span>` : ''}
    </div>
    <div class="ev-emoji" aria-hidden="true">${it.emoji}</div>
    <h3 class="ev-title">${esc(it.title)}</h3>
    <div class="ev-meta">
      <span>${ic('location', 16)}${esc(it.loc)}</span>
      <span>${ic('clock', 16)}${timeLabel(it)}</span>
      ${it.date !== TODAY_KEY ? `<span>${ic('calendar_ltr', 16)}${dayLabel(it.date)}</span>` : ''}
    </div>
    <div class="ev-foot">${attendeeStack(it)}<span class="cap">${goingCount(it)} going${S.added.has(it.id) ? ' · including you' : ''}</span></div>
    <div class="ev-act">${action}</div>
  </article>`;
}

/* compact list row; also used by the calendar's "All" view */
function row(it, timeCell) {
  return `<div class="ag-row ${it.type} ${isPast(it) ? 'past' : ''}">
    <div class="t">${timeCell}</div><div class="bar"></div>
    <div><div class="ttl">${esc(it.title)} ${it.emoji}</div><div class="cap">${esc(it.loc)} · @${esc(it.by)} · ${goingCount(it)} going</div></div>
    ${addButton(it)}
  </div>`;
}

const EMPTY_LIST = `<div class="empty pad">Nothing posted yet.</div>`;

function todayView() {
  const today = ITEMS.filter((i) => i.date === TODAY_KEY).sort((a, b) => (isPast(a) - isPast(b)) || a.start - b.start);
  const popups = today.filter((i) => i.type === 'popup');
  const events = today.filter((i) => i.type === 'event');
  const shown = S.segment === 'popups' ? popups : events;
  const segBtn = (key, label, n) =>
    `<button class="ctab ${S.segment === key ? 'sel' : ''}" data-act="segment" data-arg="${key}">${label} <span class="count">${n}</span></button>`;
  const [noteIcon, noteText] = TYPE_NOTES[S.segment];

  let list = EMPTY_LIST;
  if (shown.length && S.view === 'compact') list = `<div class="cal compact">${shown.map((it) => row(it, timeLabel(it))).join('')}</div>`;
  else if (shown.length) list = `<div class="list">${shown.map((it) => card(it, { badge: false })).join('')}</div>`;

  return `<h2 class="sect">What’s happening today?</h2>
    <div class="row between seg-row">
      <div class="ctabs" role="tablist">${segBtn('popups', 'Pop-ups', popups.length)}${segBtn('events', 'Events', events.length)}</div>
      ${dropdown('view', [['cards', 'Cards'], ['compact', 'Compact']], S.view)}
    </div>
    <div class="type-note ${S.segment}">${ic(noteIcon, 16)}<span>${noteText}</span></div>
    ${list}`;
}

function dropdown(id, options, value, prefix = '') {
  const current = options.find(([v]) => v === value)[1];
  const menu = S.openDropdown !== id ? '' : `<div class="lb" role="listbox">${options.map(([v, label]) =>
    `<button class="opt" role="option" data-act="pick" data-arg="${id}:${v}">${v === value ? ic('checkmark', 16, 'chk') : '<span class="chk"></span>'}${label}</button>`).join('')}</div>`;
  return `<div class="dd-wrap">
    <button class="dd" data-act="toggleDropdown" data-arg="${id}" aria-haspopup="listbox" aria-expanded="${S.openDropdown === id}">
      <span class="v">${prefix ? `<small>${prefix} </small>` : ''}${current}</span>${ic('chevron_down', 16)}
    </button>${menu}</div>`;
}

/* ---------- Calendar ---------- */

function calendarView() {
  let range = 'Upcoming';
  if (S.calView === 'week') {
    const s = S.weekStart, e = addDays(s, 6);
    range = `${MONTHS[s.getMonth()]} ${s.getDate()} – ${s.getMonth() !== e.getMonth() ? MONTHS[e.getMonth()] + ' ' : ''}${e.getDate()}, ${e.getFullYear()}`;
  } else if (S.calView === 'month') {
    range = `${MONTHS[S.month.getMonth()]} ${S.month.getFullYear()}`;
  }
  const viewBtn = ([key, label]) => `<button class="ctab ${S.calView === key ? 'sel' : ''}" data-act="calView" data-arg="${key}">${label}</button>`;
  const nav = S.calView === 'agenda' ? '' : `<span class="vsep"></span>
    <button class="btn fit" data-act="calToday">${ic('calendar_ltr', 16)} Today</button>
    <button class="icbtn" data-act="calNav" data-arg="-1" aria-label="Previous">${ic('chevron_left', 16)}</button>
    <button class="icbtn" data-act="calNav" data-arg="1" aria-label="Next">${ic('chevron_right', 16)}</button>`;
  const body = { week: weekView, month: monthView, agenda: agendaView }[S.calView]();

  return `<div class="cal-tools">
      <div class="ctabs" role="tablist">${[['agenda', 'All'], ['week', 'Week'], ['month', 'Month']].map(viewBtn).join('')}</div>
      ${nav}
      <span class="cal-range">${range}</span>
      <span class="legend">
        <span title="Spur-of-the-moment, posted on the day"><i class="sw popup"></i>Pop-ups</span>
        <span title="Planned ahead"><i class="sw event"></i>Events</span>
      </span>
      ${dropdown('filter', [['all', 'All'], ['popups', 'Pop-ups'], ['events', 'Events']], S.filter, 'Show:')}
    </div>
    ${body}`;
}

const FIRST_HOUR = 8, LAST_HOUR = 22, HOUR_PX = 48;

function weekView() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(S.weekStart, i));
  const head = `<div class="wk-head"><div></div>${days.map((d) =>
    `<div class="wk-day ${ymd(d) === TODAY_KEY ? 'today' : ''}"><div class="n">${d.getDate()}</div><div class="d">${DOW[d.getDay()]}</div></div>`).join('')}</div>`;
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) =>
    `<div>${i ? fmtTime(FIRST_HOUR + i).replace(':00', '') : ''}</div>`).join('');

  const block = (it) => {
    const top = (it.start - FIRST_HOUR) * HOUR_PX + 1;
    const height = Math.max((it.end - it.start) * HOUR_PX - 2, 22);
    const tall = height > 50, medium = height > 34;
    return `<button class="blk ${it.type} ${isPast(it) ? 'past' : ''} ${S.popover?.id === it.id ? 'act' : ''}"
        style="top:${top}px;height:${height}px" data-act="popover" data-arg="${it.id}">
      <b>${esc(it.title)} ${it.emoji}</b>
      ${medium ? `<span>${fmtTime(it.start)}${tall ? '' : ` · ${esc(it.loc)}`}</span>` : ''}
      ${tall ? `<span>${ic('location', 12, 'inline')} ${esc(it.loc)}</span>` : ''}
    </button>`;
  };
  const column = (d) => {
    const key = ymd(d);
    const now = key === TODAY_KEY ? `<div class="now" style="top:${(NOW - FIRST_HOUR) * HOUR_PX}px"></div>` : '';
    return `<div class="wk-col ${key === TODAY_KEY ? 'today' : ''}" style="height:${(LAST_HOUR - FIRST_HOUR) * HOUR_PX}px">
      ${ITEMS.filter((i) => i.date === key && passesFilter(i)).map(block).join('')}${now}</div>`;
  };

  return `<div class="cal" id="calbox">${head}
    <div class="wk-body scroll" data-keep="week"><div class="wk-grid"><div class="wk-times">${hours}</div>${days.map(column).join('')}</div></div>
    ${popoverView()}</div>`;
}

function monthView() {
  const first = new Date(S.month.getFullYear(), S.month.getMonth(), 1);
  const last = new Date(S.month.getFullYear(), S.month.getMonth() + 1, 0);
  const start = mondayOf(first);
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7);

  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), key = ymd(d);
    const items = ITEMS.filter((x) => x.date === key && passesFilter(x)).sort((a, b) => a.start - b.start);
    const chips = items.slice(0, 2).map((it) =>
      `<button class="chip ${it.type}" data-act="popover" data-arg="${it.id}" title="${esc(it.title)}">${it.emoji} ${esc(it.title)}</button>`).join('');
    const more = items.length > 2 ? `<button class="more" data-act="showWeek" data-arg="${key}">+${items.length - 2} more</button>` : '';
    cells += `<div class="mo-cell ${d.getMonth() !== S.month.getMonth() ? 'out' : ''} ${key === TODAY_KEY ? 'today' : ''}">
      <span class="num">${d.getDate()}</span>${chips}${more}</div>`;
  }
  const weekdays = DOW.slice(1).concat(DOW[0]).map((d) => `<div>${d}</div>`).join('');
  return `<div class="cal" id="calbox"><div class="mo-head">${weekdays}</div><div class="mo-grid">${cells}</div>${popoverView()}</div>`;
}

function agendaView() {
  const items = ITEMS.filter((i) => i.date >= TODAY_KEY && passesFilter(i)).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  let out = '', lastDate = '';
  for (const it of items) {
    if (it.date !== lastDate) {
      lastDate = it.date;
      const d = parseYmd(it.date);
      out += `<div class="ag-day">${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${it.date === TODAY_KEY ? '<span class="badge-t event">Today</span>' : ''}</div>`;
    }
    out += row(it, `${fmtTime(it.start)}<br>${fmtTime(it.end)}`);
  }
  return `<div class="cal agenda">${out}</div>`;
}

function popoverView() {
  const it = S.popover && getItem(S.popover.id);
  if (!it) return '';
  const { x, y, side, beakY } = S.popover;
  const on = S.added.has(it.id);
  const action = isPast(it)
    ? `<span class="ended">${ic('checkmark_circle', 16)} Ended</span>`
    : `<button class="btn sm ${on ? 'on' : 'primary'}" data-act="toggleAdd" data-arg="${it.id}">${ic(on ? 'checkmark' : 'calendar_add', 16)} ${on ? 'Added' : 'Add to calendar'}</button>`;
  return `<div class="pop" role="dialog" aria-label="${esc(it.title)}" style="left:${x}px;top:${y}px">
    <span class="beak ${side}" style="top:${beakY}px"></span>
    <div class="row between">
      <div class="ev-by">${postedBy(it)}</div>
      <button class="icbtn sm" data-act="closePopover" aria-label="Close">${ic('dismiss', 16)}</button>
    </div>
    <h4>${esc(it.title)} ${it.emoji}</h4>
    <div class="meta"><span class="badge-t ${it.type}">${typeLabel(it)}</span><span>${esc(it.loc)}</span><span>·</span><span>${DOW[parseYmd(it.date).getDay()]} ${fmtTime(it.start)}</span></div>
    <div class="lbl">Description</div><p>${esc(it.desc)}</p>
    <div class="row going">${attendeeStack(it)}<span class="cap">${goingCount(it)} going</span></div>
    <div class="acts">${action}</div>
  </div>`;
}

/* Position the popover next to the clicked block, inside the calendar box.
   Rects are in screen pixels, so divide by SCALE to get window pixels. */
function openPopover(id, el) {
  const box = $('#calbox');
  if (!box) return;
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
  const rx = (r.left - b.left) / SCALE, ry = (r.top - b.top) / SCALE;
  const rw = r.width / SCALE, rh = Math.min(r.height / SCALE, 60);
  const boxW = b.width / SCALE, boxH = b.height / SCALE;

  let side = 'r', x = rx + rw + 10;
  if (x + 320 > boxW - 8) { side = 'l'; x = rx - 330; }
  const y = Math.min(Math.max(8, ry + rh / 2 - 60), Math.max(8, boxH - 300));
  const beakY = Math.max(14, Math.min(ry + rh / 2 - y - 6, 260));
  S.popover = { id, x, y, side, beakY };
  render();
}

/* ---------- Create ---------- */

function createView() {
  const { form: f, errors: e } = S;
  const error = (k) => (e[k] ? `<div class="errmsg">${ic('info_f', 12)}${e[k]}</div>` : '');
  const field = (k) => `inp ${e[k] ? 'err' : ''}`;
  return `<button class="btn subtle back" data-act="seekTab" data-arg="today">${ic('arrow_left', 16)} Back</button>
  <div class="create">
    <div>
      <h2 class="sect">Create an event</h2>
      <div class="lede">Post an event for everyone at Contoso. It only takes four fields.</div>
      <form class="form" id="createForm" novalidate>
        <div>
          <label class="lbl" for="f-name">Name<span class="req">*</span></label>
          <div class="${field('name')}"><input id="f-name" data-field="name" value="${esc(f.name)}" placeholder="e.g. Pizza in the kitchen" maxlength="60" autocomplete="off"></div>
          ${error('name')}
        </div>
        <div class="f-row">
          <div>
            <label class="lbl" for="f-date">Date</label>
            <div class="inp">${ic('calendar_ltr')}<input id="f-date" type="date" data-field="date" value="${esc(f.date)}"></div>
          </div>
          <div>
            <label class="lbl" for="f-time">Time<span class="req">*</span></label>
            <div class="${field('time')}">${ic('clock')}<input id="f-time" type="time" data-field="time" value="${esc(f.time)}"></div>
            ${error('time')}
          </div>
        </div>
        <div>
          <label class="lbl" for="f-desc">Description<span class="req">*</span></label>
          <div class="${field('desc')} ta"><textarea id="f-desc" data-field="desc" placeholder="Where is it, what should people bring?" maxlength="200">${esc(f.desc)}</textarea></div>
          ${error('desc') || '<div class="hint">Add a location like “in the kitchen” and SEEK will pick it up.</div>'}
        </div>
        <div class="f-acts">
          <button type="button" class="btn" data-act="seekTab" data-arg="today">Cancel</button>
          <button type="submit" class="btn primary">Post event</button>
        </div>
      </form>
    </div>
    <aside>
      <div class="prev-l">Preview</div>
      <div id="preview">${card(draftItem(), { preview: true })}</div>
      <div class="prev-note">${ic('people_community', 16)}<span>Visible to everyone in your organization. Anyone can tap <b>Add to calendar</b>.</span></div>
    </aside>
  </div>`;
}

/* The form as an item. Posting for today makes a pop-up, a later date makes an event. */
function draftItem() {
  const f = S.form;
  const [hh, mm] = (f.time || '12:00').split(':').map(Number);
  const start = hh + mm / 60;
  return {
    id: 'draft',
    type: f.date === TODAY_KEY ? 'popup' : 'event',
    title: f.name.trim() || 'Your event name',
    emoji: pickEmoji(`${f.name} ${f.desc}`),
    by: ME.handle,
    loc: findLocation(f.desc) || 'Location TBD',
    date: f.date || TODAY_KEY,
    start, end: start + 1,
    desc: f.desc,
    going: 0,
  };
}

function submitCreate() {
  const f = S.form, errors = {};
  if (!f.name.trim()) errors.name = 'Give your event a name.';
  if (!f.time) errors.time = 'Pick a time.';
  if (!f.desc.trim()) errors.desc = 'Add a short description.';
  S.errors = errors;
  const firstError = Object.keys(errors)[0];
  if (firstError) { render(); $(`#f-${firstError}`)?.focus(); return; }

  const it = { ...draftItem(), id: `post-${Date.now()}`, going: 1 };
  ITEMS.push(it);
  S.added.add(it.id);
  S.form = { name: '', date: TODAY_KEY, time: '', desc: '' };
  if (it.date === TODAY_KEY) Object.assign(S, { seekTab: 'today', segment: 'popups', view: 'cards' });
  else Object.assign(S, { seekTab: 'calendar', calView: 'agenda' });
  flash(it.id);

  const where = it.loc !== 'Location TBD' ? ` in the ${it.loc.toLowerCase()}` : '';
  showToast('Your event is live', `${it.title} · ${dayLabel(it.date)}, ${fmtTime(it.start)}`, 'Share in TerraSync chat', () => {
    Object.assign(S, { rail: 'chat', chatBadge: 0, draft: `@SEEK ${it.title} at ${fmtTime(it.start)}${where}. Who’s in?` });
    render();
  });
}

/* ================= App store dialog ================= */

function appTile(app, size = 32) {
  const cls = `tile ${size === 32 ? 's32' : ''}`;
  if (app.seek) return `<span class="${cls} seektile">${seekLogo(Math.round(size * 0.62))}</span>`;
  return `<span class="${cls}" style="background:${app.color}">${ic(app.icon, size === 32 ? 18 : 26)}</span>`;
}

function dialogView() {
  if (!S.dialog) return '';
  const body = S.dialog === 'store' ? storeDialog() : seekDetailDialog();
  return `<div class="scrim" data-act="backdrop">${body}</div>`;
}

function storeDialog() {
  const q = S.storeQuery.trim().toLowerCase();
  const sections = STORE.sections
    .map((s) => ({ ...s, apps: s.apps.filter((a) => !q || `${a.name} ${a.desc}`.toLowerCase().includes(q)) }))
    .filter((s) => s.apps.length);

  const appRow = (a) => {
    const act = a.seek ? 'data-act="openSeekDetail"' : '';
    return `<div class="app ${a.seek ? 'hl' : ''}" ${act} role="${a.seek ? 'button' : 'group'}" tabindex="${a.seek ? 0 : -1}">
      ${appTile(a)}
      <div class="app-text"><div class="nm">${a.name}${a.seek ? '<span class="newb">New</span>' : ''}</div><div class="ds">${a.desc}</div></div>
      <button class="btn sm ${a.seek && !S.installed ? 'pulse' : ''}" ${act}>${a.seek && S.installed ? 'Open' : 'Add'}</button>
    </div>`;
  };
  const recent = q ? '' : `<div class="recent">
      ${STORE.recent.map((a) => `<button class="rapp">${appTile(a, 48)}<span>${a.name}</span></button>`).join('')}
      <button class="rapp"><span class="tile ghost">${ic('grid', 24)}</span><span>See all</span></button>
    </div>
    <div class="divtxt">Add a new app</div>`;
  const list = sections.map((s) => `<div class="sec-h"><h3>${s.title}</h3><button class="link">See all</button></div>
      <div class="apps">${s.apps.map(appRow).join('')}</div>`).join('')
    || `<div class="nores">No apps found for “${esc(S.storeQuery)}”</div>`;

  return `<div class="dlg" role="dialog" aria-modal="true" aria-label="Add an app" data-stop>
    <div class="dlg-body scroll" data-keep="store">
      <div class="search-f">${ic('search', 16)}<input id="storeSearch" placeholder="Find an app" value="${esc(S.storeQuery)}" aria-label="Find an app" autocomplete="off"></div>
      ${recent}${list}
    </div>
    <div class="dlg-foot">
      <button class="btn">${ic('settings', 16)} Manage your apps</button><span class="sp"></span>
      <button class="btn" data-act="closeDialog">Close</button><button class="btn primary">Get more apps</button>
    </div>
  </div>`;
}

function seekDetailDialog() {
  const feature = (icon, title, text) => `<div class="feat"><span class="fi">${ic(icon, 18)}</span><div><b>${title}</b><span>${text}</span></div></div>`;
  const installLabel = S.installing ? '<span class="spinner"></span> Adding SEEK…' : 'Add to Marketing review';
  return `<div class="dlg wide" role="dialog" aria-modal="true" aria-label="SEEK" data-stop>
    <div class="dlg-body">
      <div class="ad-head">
        <div class="ad-logo">${seekLogo(52)}</div>
        <div class="grow">
          <h2>SEEK</h2>
          <div class="ad-pub">SEEK Labs · ${ic('shield_checkmark', 16)} Publisher verified</div>
          <div class="ad-tags"><span class="tag">Tabs</span><span class="tag">Bots</span><span class="tag">Meetings</span><span class="tag">Messaging</span></div>
        </div>
        <button class="icbtn top" data-act="closeDialog" aria-label="Close">${ic('dismiss')}</button>
      </div>
      <div class="ad-grid">
        <div>
          <p>See what’s happening around the office, from the quarterly party to leftover cake in the kitchen. Post in four fields, or mention <span class="mention">@SEEK</span> in any chat and it picks up the details for you.</p>
          ${feature('calendar_ltr', 'Today at a glance', 'A meeting or channel tab with everything happening today.')}
          ${feature('calendar_add', 'One-click RSVP', 'Add anything to your Outlook calendar without leaving Teams.')}
          ${feature('sparkle', 'Smart detection in chat', 'The SEEK bot spots plans in a conversation and turns them into events for the team.')}
        </div>
        <div class="perm">
          <h4>${ic('shield_checkmark', 16)} Permissions</h4>
          This app will have permission to:
          <ul>
            <li>Receive messages and data that I provide to it</li>
            <li>Send me messages and notifications</li>
            <li>Access my profile information such as my name and email address</li>
            <li>Read and write to my calendar</li>
          </ul>
          ${link('Learn more')}
        </div>
      </div>
    </div>
    <div class="dlg-foot">
      <span class="legal">By using SEEK, you agree to the ${link('privacy policy')}, ${link('terms of use')} and ${link('permissions')}.</span>
      <button class="btn" data-act="backToStore">Back</button>
      <button class="btn primary install ${S.installing ? '' : 'pulse'}" data-act="install" ${S.installing ? 'aria-busy="true"' : ''}>${installLabel}</button>
    </div>
  </div>`;
}

/* ================= Chat ================= */

function chatView() {
  const listItem = (c) => {
    const preview = c.live ? lastChatPreview() : c.preview;
    const time = c.live ? S.chat[S.chat.length - 1].t : c.time;
    const av = c.live ? avatar(c.name, 32, { text: 'TS' }) : avatar(c.name, 32, { presence: !c.group });
    return `<button class="ci ${c.live ? 'sel' : ''} ${c.unread ? 'unread' : ''}">
      ${av}<span class="nm">${esc(c.name)}</span><span class="tm">${time}</span><span class="pv">${esc(preview)}</span></button>`;
  };
  const sendOn = !!S.draft.trim();
  const sendHint = !S.scriptPlayed && S.draft === CHAT_DRAFT ? 'pulse' : '';
  const tool = (name) => `<span class="icbtn">${ic(name)}</span>`;

  return `<div class="chatv">
    <aside class="cl">
      <div class="cl-h"><h2>Chat ${ic('chevron_down', 16)}</h2>
        <button class="icbtn" aria-label="Filter">${ic('filter')}</button>
        <button class="icbtn" aria-label="New chat">${ic('compose')}</button></div>
      <div class="scroll">
        <div class="cl-sec">${ic('chevron_down', 12)} Pinned</div>${CHATS.pinned.map(listItem).join('')}
        <div class="cl-sec">${ic('chevron_down', 12)} Recent</div>${CHATS.recent.map(listItem).join('')}
      </div>
    </aside>
    <section class="cv">
      <header class="cv-h">
        ${avatar('TerraSync', 32, { text: 'TS' })}<span class="nm">TerraSync</span>
        <div class="tabs">
          <button class="tab sel">Chat</button><button class="tab">Files</button>
          ${S.installed ? `<button class="tab" data-act="openSeek">${seekTabIcon()}SEEK</button>` : ''}
          <button class="tab tab-add">${ic('add_square', 18)}</button>
        </div>
        <div class="acts">
          <div class="callbtn"><button aria-label="Video call">${ic('video')}</button><button aria-label="Audio call">${ic('call')}</button></div>
          <button class="icbtn" aria-label="People">${ic('people_add')}</button><span class="cap">6</span>
        </div>
      </header>
      <div class="msgs scroll" id="msgs">${messagesView()}</div>
      <div class="typing" id="typing">${typingView()}</div>
      <div class="comp"><form class="comp-box" id="chatForm">
        <input id="chatInput" value="${esc(S.draft)}" placeholder="Type a message" aria-label="Type a message" autocomplete="off">
        <div class="comp-tools">${['text_format', 'emoji', 'gif', 'sticker', 'attach', 'add_circle'].map(tool).join('')}</div>
        <button type="submit" class="send ${sendOn ? 'on' : ''} ${sendHint}" aria-label="Send">${ic(sendOn ? 'send_f' : 'send')}</button>
      </form></div>
    </section>
  </div>`;
}

function lastChatPreview() {
  const m = S.chat[S.chat.length - 1];
  const who = m.who === 'me' ? 'You' : m.who === 'bot' ? 'SEEK' : PEOPLE[m.who].split(' ')[0];
  return `${who}: ${(m.text || 'Sent a card').replace(/@SEEK/g, 'SEEK')}`;
}

const formatMessage = (text) => esc(text).replace(/@SEEK\b/g, '<span class="mention">SEEK</span>');
const typingView = () => (S.typing ? `<span class="dots"><i></i><i></i><i></i></span> ${S.typing} is typing…` : '');

function messagesView() {
  let out = '<div class="daysep">Today</div>', prev = null;
  for (const m of S.chat) {
    const grouped = prev && prev.who === m.who && m.who !== 'bot'; // consecutive messages from the same person
    if (m.who === 'me') {
      out += `<div class="m me ${grouped ? 'cont' : ''}"><div>
        <div class="hd">${grouped ? '' : `<span>${m.t}</span>`}</div>
        <div class="bub">${formatMessage(m.text)}</div></div></div>`;
    } else if (m.who === 'bot') {
      out += `<div class="m"><div class="botav">${SEEK_LOGO}</div><div>
        <div class="hd"><b>SEEK</b><span class="apptag">App</span><span>${m.t}</span></div>
        <div class="bub">${m.card ? botCard(getItem(m.card)) : formatMessage(m.text)}</div></div></div>`;
    } else {
      const name = PEOPLE[m.who];
      out += `<div class="m ${grouped ? 'cont' : ''}">${avatar(name, 32, { presence: true })}<div>
        ${grouped ? '' : `<div class="hd"><b>${name}</b><span>${m.t}</span></div>`}
        <div class="bub">${formatMessage(m.text)}</div>
        ${m.react ? `<div class="reacts"><span class="react">${m.react}</span></div>` : ''}</div></div>`;
    }
    prev = m;
  }
  return out;
}

/* Adaptive Card the SEEK bot posts when it detects an event */
function botCard(it) {
  if (!it) return '';
  const on = S.added.has(it.id);
  return `<div class="ac">
    <div class="t1">Thank you for creating an event with SEEK.</div>
    <div class="ac-ev"><span class="em">${it.emoji}</span><div>
      <b>${esc(it.title)} at ${fmtTime(it.start)}</b>
      <span>${ic('calendar_ltr', 12)} ${dayLabel(it.date)} &nbsp;${ic('location', 12)} ${esc(it.loc)}</span>
    </div></div>
    <div class="ac-acts">
      <button class="btn ${on ? 'on' : 'primary'}" data-act="toggleAdd" data-arg="${it.id}">${ic(on ? 'checkmark' : 'calendar_add', 16)} ${on ? 'Added to calendar' : 'Add to calendar'}</button>
      <button class="btn" data-act="viewInSeek" data-arg="${it.id}">View in SEEK</button>
    </div>
    <div class="foot">${ic('people_community', 12)} Posted to SEEK for everyone at Contoso · ${goingCount(it)} going</div>
  </div>`;
}

/* Redraw only the conversation so the composer keeps focus */
function refreshChat() {
  const msgs = $('#msgs');
  if (!msgs) return;
  msgs.innerHTML = messagesView();
  msgs.scrollTop = msgs.scrollHeight;
  $('#typing').innerHTML = typingView();
  const sel = $('.ci.sel');
  if (sel) {
    sel.querySelector('.pv').textContent = lastChatPreview();
    sel.querySelector('.tm').textContent = S.chat[S.chat.length - 1].t;
  }
}

function sendChat(raw) {
  const text = raw.trim();
  if (!text) return;
  S.chat.push({ who: 'me', t: chatTime(), text });
  S.draft = '';
  $('#chatInput').value = '';
  updateSendButton();
  refreshChat();

  const time = parseTime(text);
  if (time == null && !/@SEEK\b/i.test(text)) return; // nothing for the bot to do

  setTimeout(() => { S.typing = 'SEEK'; refreshChat(); }, 350);
  setTimeout(() => {
    S.typing = null;
    if (time == null) {
      S.chat.push({ who: 'bot', t: chatTime(1), text: 'I couldn’t find a time in that message. Try something like “Pizza in the kitchen at 1pm”.' });
      refreshChat();
      return;
    }
    const it = {
      id: `chat-${Date.now()}`, type: 'popup', title: parseTitle(text), emoji: pickEmoji(text), by: ME.handle,
      loc: findLocation(text) || 'TerraSync team', date: TODAY_KEY, start: time, end: time + 1,
      desc: text.replace(/@SEEK\s*/gi, ''), going: 1,
    };
    ITEMS.push(it);
    S.chat.push({ who: 'bot', t: chatTime(1), card: it.id });
    refreshChat();
    if (!S.scriptPlayed) playReplies(it);
  }, 1500);
}

function playReplies(it) {
  S.scriptPlayed = true;
  let firstReply = null; // gets the emoji reaction
  for (const step of CHAT_REPLIES) {
    setTimeout(() => {
      if (step.typing) S.typing = PEOPLE[step.typing];
      if (step.text) {
        const msg = { who: step.who, t: chatTime(step.minute), text: step.text };
        S.typing = null;
        S.chat.push(msg);
        firstReply ??= msg;
        it.going++;
      }
      if (step.react && firstReply) firstReply.react = step.react;
      refreshChat();
    }, step.at);
  }
}

function updateSendButton() {
  const btn = $('.send');
  if (!btn) return;
  const on = !!S.draft.trim();
  btn.classList.toggle('on', on);
  btn.classList.remove('pulse');
  btn.innerHTML = ic(on ? 'send_f' : 'send');
}

/* ================= Bot parsing ================= */

const EMOJI_RULES = [
  [/hot ?dog/i, '🌭'], [/pizza/i, '🍕'], [/taco/i, '🌮'], [/burger/i, '🍔'], [/sushi/i, '🍣'], [/donut|doughnut/i, '🍩'],
  [/bagel/i, '🥯'], [/cake|birthday/i, '🎂'], [/cookie/i, '🍪'], [/ice ?cream/i, '🍦'], [/coffee|latte/i, '☕'], [/tea\b/i, '🍵'],
  [/beer|drinks|pub|bar\b/i, '🍻'], [/wine/i, '🍷'], [/pasta/i, '🍝'], [/mango/i, '🥭'], [/fruit/i, '🍓'], [/lunch|salad/i, '🥗'],
  [/breakfast|pancake/i, '🥞'], [/walk|hike/i, '👟'], [/run\b|5k|jog/i, '🏃'], [/yoga|stretch/i, '🧘'], [/game|board/i, '🎲'],
  [/quiz|trivia/i, '🧠'], [/photo/i, '📸'], [/music|karaoke/i, '🎤'], [/movie|film/i, '🍿'], [/party|celebrat/i, '🎉'],
  [/book/i, '📚'], [/talk|learn|workshop/i, '🎓'],
];
function pickEmoji(text = '') {
  const rule = EMOJI_RULES.find(([re]) => re.test(text));
  return rule ? rule[1] : '📅';
}

const sentenceCase = (s) => { s = s.trim(); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); };

/* "…in the kitchen if you…" → "Kitchen" */
function findLocation(text = '') {
  const m = text.match(/\b(?:in|at|to|on) the ([a-z0-9][a-z0-9 ]{1,24}?)(?=[.,!?]| if| for| at| around| after| before| with| and|$)/i);
  return m ? sentenceCase(m[1]) : '';
}

/* "7pm", "7:00 PM", "19:00", "noon", "at 5" → decimal hours, or null */
function parseTime(text) {
  let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i);
  if (m) return (+m[1] % 12) + (/p/i.test(m[3]) ? 12 : 0) + (+(m[2] || 0)) / 60;
  m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return +m[1] + +m[2] / 60;
  if (/\bnoon\b/i.test(text)) return 12;
  m = text.match(/\bat (\d{1,2})\b(?!:)/i);
  if (m) return +m[1] < 8 ? +m[1] + 12 : +m[1]; // "at 5" most likely means 5 PM
  return null;
}

/* "I am bringing Hot Dogs at 7" → "Hot dogs" */
function parseTitle(text) {
  const t = text.replace(/@SEEK\b/gi, '').trim();
  const m = t.match(/\b(?:bringing|brought|made|baking|baked|have|has|got)\s+(?:some\s+|a\s+few\s+|extra\s+)?(.+?)\s+(?:at|to|for|in|on|@|around)\b/i)
    || t.match(/\b(?:anyone (?:up for|want(?:s)? to|keen for|fancy)|who(?:'s| is) up for|let'?s(?: go)?(?: grab| get| have| do)?|join (?:me|us) for)\s+(?:a\s+|an\s+|some\s+)?(.+?)\s+(?:at|in|on|@|around|today|tonight|after)\b/i);
  if (m) return sentenceCase(m[1].split(/[,.!?;]/)[0]);
  return sentenceCase(t.replace(/\b(at|@)\s*\d.*$/i, '').split(/\s+/).slice(0, 5).join(' ')) || 'Team hangout';
}

/* ================= Toasts ================= */

let toasts = []; // live toast elements, re-attached after each render

function showToast(title, body, actionLabel, onAction) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="ti">${ic('checkmark_circle_f')}</span>
    <div><b>${esc(title)}</b><span>${esc(body)}</span></div>
    <button class="icbtn x" aria-label="Dismiss">${ic('dismiss', 12)}</button>
    ${actionLabel ? `<div class="ta"><button class="link">${esc(actionLabel)}</button></div>` : ''}`;

  const timer = setTimeout(dismiss, 5200);
  function dismiss() {
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => { el.remove(); toasts = toasts.filter((t) => t !== el); }, 200);
  }
  el.querySelector('.x').onclick = dismiss;
  if (actionLabel) el.querySelector('.ta button').onclick = () => { dismiss(); onAction(); };

  $('#toasts').appendChild(el);
  toasts.push(el);
}

/* ================= Actions ================= */

function flash(id) {
  S.flash = id;
  render();
  setTimeout(() => { S.flash = null; }, 2300);
}

function toggleAdd(id) {
  const it = getItem(id);
  if (!it) return;
  if (S.added.has(id)) { S.added.delete(id); render(); return; }
  S.added.add(id);
  render();
  showToast('Added to your calendar', `${it.title} · ${dayLabel(it.date)}, ${fmtTime(it.start)}`, 'Undo', () => { S.added.delete(id); render(); });
}

function install() {
  if (S.installing) return;
  S.installing = true;
  render();
  setTimeout(() => {
    Object.assign(S, { installing: false, installed: true, dialog: null, meetingTab: 'seek', seekTab: 'today', segment: 'events' });
    render();
    showToast('SEEK was added', 'It’s now a tab in Marketing review.');
  }, 1200);
}

/* data-act="name" data-arg="value" → ACTIONS.name(value, element) */
const ACTIONS = {
  rail(id) {
    if (id === 'chat') S.chatBadge = 0;
    Object.assign(S, { rail: id, popover: null });
    render();
  },
  meetingTab(id) { S.meetingTab = id; render(); },
  openStore() { Object.assign(S, { rail: 'calendar', dialog: 'store', storeQuery: '' }); render(); },
  openSeekDetail() {
    if (S.installed) Object.assign(S, { dialog: null, meetingTab: 'seek' });
    else S.dialog = 'detail';
    render();
  },
  backToStore() { S.dialog = 'store'; render(); },
  closeDialog() { if (!S.installing) { S.dialog = null; render(); } },
  backdrop() { ACTIONS.closeDialog(); },
  install,
  openSeek() { Object.assign(S, { rail: 'calendar', meetingTab: 'seek', seekTab: 'today' }); render(); },
  seekTab(id) { Object.assign(S, { seekTab: id, popover: null, errors: {} }); render(); },
  openCreate() {
    Object.assign(S, { seekTab: 'create', errors: {} });
    render();
    $('#f-name')?.focus();
  },
  segment(id) { S.segment = id; render(); },
  toggleDropdown(id) { S.openDropdown = S.openDropdown === id ? null : id; render(); },
  pick(arg) {
    const [id, value] = arg.split(':');
    S.openDropdown = null;
    if (id === 'view') S.view = value;
    if (id === 'filter') S.filter = value;
    render();
  },
  toggleAdd,
  calView(id) { Object.assign(S, { calView: id, popover: null }); render(); },
  calToday() {
    Object.assign(S, { weekStart: mondayOf(TODAY), month: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), popover: null });
    render();
  },
  calNav(dir) {
    if (S.calView === 'week') S.weekStart = addDays(S.weekStart, 7 * dir);
    else S.month = new Date(S.month.getFullYear(), S.month.getMonth() + Number(dir), 1);
    S.popover = null;
    render();
  },
  popover(id, el) {
    if (S.popover?.id === id) { S.popover = null; render(); }
    else openPopover(id, el);
  },
  closePopover() { S.popover = null; render(); },
  showWeek(key) { Object.assign(S, { calView: 'week', weekStart: mondayOf(parseYmd(key)) }); render(); },
  viewInSeek(id) {
    const it = getItem(id);
    Object.assign(S, { rail: 'calendar', meetingTab: 'seek', seekTab: 'today', segment: it?.type === 'popup' ? 'popups' : 'events', view: 'cards' });
    flash(id);
  },
};

/* ================= Portfolio step bar ================= */

function goToStep(n) {
  Object.assign(S, { popover: null, openDropdown: null });
  if (n === 1) Object.assign(S, { rail: 'calendar', meetingTab: 'details', installed: false, dialog: 'store', storeQuery: '', installing: false, seekTab: 'today' });
  if (n === 2) Object.assign(S, { rail: 'calendar', installed: true, dialog: null, meetingTab: 'seek', seekTab: 'today', segment: 'events', view: 'cards' });
  if (n === 3) Object.assign(S, { rail: 'calendar', installed: true, dialog: null, meetingTab: 'seek', seekTab: 'create', errors: {} });
  if (n === 4) {
    Object.assign(S, { rail: 'chat', installed: true, dialog: null, chatBadge: 0 });
    if (S.scriptPlayed) Object.assign(S, { chat: initialChat(), draft: CHAT_DRAFT, scriptPlayed: false }); // replay the demo
  }
  render();
}

function currentStep() {
  if (S.rail === 'chat') return 4;
  if (!S.installed || S.dialog) return 1;
  if (S.meetingTab === 'seek' && S.seekTab === 'create') return 3;
  return 2;
}

function renderSteps() {
  const current = currentStep();
  const [title, caption] = STEPS[current - 1];
  $('#steps').innerHTML = `<div class="steps">${STEPS.map(([name], i) =>
    `<button class="st ${current === i + 1 ? 'sel' : ''}" data-step="${i + 1}"><i>${i + 1}</i>${name}</button>`).join('')}</div>
    <div class="st-cap"><b>${current}. ${title}.</b> ${caption}</div>`;
  requestAnimationFrame(fit); // the caption can wrap to a different height
}

/* ================= Events ================= */

document.addEventListener('click', (e) => {
  if (e.target.closest('a[href="#"]')) e.preventDefault();

  const step = e.target.closest('[data-step]');
  if (step) { goToStep(Number(step.dataset.step)); return; }

  const el = e.target.closest('[data-act]');
  const act = el?.dataset.act;

  // clicking anywhere else closes open menus and popovers
  if (S.openDropdown && act !== 'toggleDropdown' && act !== 'pick') { S.openDropdown = null; render(); }
  if (S.popover && !e.target.closest('.pop') && act !== 'popover') {
    S.popover = null;
    if (!el) { render(); return; }
  }
  if (!el) return;
  if (act === 'backdrop' && e.target.closest('[data-stop]')) return; // click inside the dialog, not on the backdrop

  ACTIONS[act]?.(el.dataset.arg, el);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'storeSearch') {
    S.storeQuery = t.value;
    const caret = t.selectionStart;
    render();
    const input = $('#storeSearch');
    input.focus();
    input.setSelectionRange(caret, caret);
  } else if (t.dataset.field) {
    S.form[t.dataset.field] = t.value;
    if (S.errors[t.dataset.field]) { // clear that field's error without a full redraw
      delete S.errors[t.dataset.field];
      const box = t.closest('.inp');
      box.classList.remove('err');
      box.parentNode.querySelector('.errmsg')?.remove();
    }
    $('#preview').innerHTML = card(draftItem(), { preview: true });
  } else if (t.id === 'chatInput') {
    S.draft = t.value;
    updateSendButton();
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'chatForm') sendChat($('#chatInput').value);
  if (e.target.id === 'createForm') submitCreate();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (S.openDropdown) S.openDropdown = null;
    else if (S.popover) S.popover = null;
    else if (S.dialog && !S.installing) S.dialog = null;
    else return;
    render();
  }
  if (e.key === 'Enter' && e.target.matches('.app[data-act]')) e.target.click();
});

/* ================= Scale to fit ================= */

/* The Teams window is laid out at 1280×800 and scaled to fit the page (or iframe),
   leaving room for the step bar underneath. */
function fit() {
  const embed = document.body.classList.contains('embed');
  const noNav = document.body.classList.contains('nonav');
  const steps = $('#steps');

  // measure what's actually visible (on phones innerWidth can report a widened layout viewport)
  const vv = window.visualViewport;
  const vw = Math.min(innerWidth, document.documentElement.clientWidth, vv ? vv.width : innerWidth);
  const vh = Math.min(innerHeight, vv ? vv.height : innerHeight);

  // shrink the step bar on small screens so the window keeps most of the space
  steps.style.zoom = Math.max(0.62, Math.min(1, vw / 1100));
  const gap = embed ? 10 : 16;
  const padding = embed ? 0 : 32;
  const navHeight = noNav ? 0 : steps.getBoundingClientRect().height + gap;

  SCALE = Math.min((vw - padding) / 1280, (vh - padding - navHeight) / 800, embed ? 10 : 1.2);
  $('#win').style.transform = `scale(${SCALE})`;
  const scaler = $('#scaler');
  scaler.style.width = `${1280 * SCALE}px`;
  scaler.style.height = `${800 * SCALE}px`;
  const wrap = $('#stageWrap');
  wrap.style.gap = `${gap}px`;
  if (embed) wrap.style.padding = '0';
}

/* ================= Boot ================= */

/* URL options:  ?embed=1  transparent, edge-to-edge (for iframes)
                 ?theme=dark  step bar for a dark page
                 ?nav=0  hide the step bar
                 ?step=1..4  open on a step */
const params = new URLSearchParams(location.search);
if (params.get('embed') === '1') {
  document.body.classList.add('embed');
  document.documentElement.classList.add('embed');
  document.documentElement.style.colorScheme = params.get('theme') === 'dark' ? 'dark' : 'light';
}
if (params.get('nav') === '0') document.body.classList.add('nonav');
if (params.get('theme') === 'dark') document.body.classList.add('dark');

render();
if (params.get('step')) goToStep(Number(params.get('step')));
fit();
addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
