/* Demo data for the SEEK prototype.
   "Today" is pinned so the demo always looks the same. */

const TODAY = new Date(2026, 4, 11); // Monday 11 May 2026
const NOW = 11;                      // 11:00 AM, in decimal hours
const ME = { name: 'Sarah Lin', handle: 'sarah' };

const PEOPLE = {
  sarah: 'Sarah Lin',
  tom123: 'Tom Ito',
  ellen: 'Ellen Park',
  HR_tom: 'Tom Bradley',
  HR_sarah: 'Sarah Okafor',
  HR_ellen: 'Ellen Ward',
  // the team behind SEEK
  marie: 'Marie Cabibihan',
  hir: 'Hir Israni',
  steven: 'Steven Chen',
  jiwan: 'Jiwan Park',
  priyanshi: 'Priyanshi Jain',
};

/* type:  'popup' – spur of the moment, posted on the day it happens
          'event' – planned ahead
   start/end are decimal hours (12.5 = 12:30 PM) */
const ITEMS = [
  // today
  { id: 'p1', type: 'popup', title: 'Mango Chaat!', emoji: '🥭', by: 'ellen', loc: 'Floor 2 kitchen', date: '2026-05-11', start: 11.25, end: 11.75, rel: 'In 15 mins', going: 6,
    desc: 'Made a big batch of mango chaat. Grab a bowl from the Floor 2 kitchen before it’s gone.' },
  { id: 'p2', type: 'popup', title: 'Pasta Bake Up for Grabs', emoji: '🍝', by: 'sarah', loc: 'Rooftop', date: '2026-05-11', start: 12, end: 12.5, going: 3,
    desc: 'Way too much pasta bake left over from the client lunch. Plates and forks are by the rooftop door.' },
  { id: 'p3', type: 'popup', title: 'Anyone want to grab a walk at lunch?', emoji: '👟', by: 'tom123', loc: 'Lobby', date: '2026-05-11', start: 12.5, end: 13, going: 2,
    desc: 'Quick 30-minute loop around the park. Meet by the front desk.' },
  { id: 'e1', type: 'event', title: 'Monday Morning Kickoff', emoji: '☕', by: 'HR_ellen', loc: 'Cafeteria', date: '2026-05-11', start: 9, end: 10, going: 35,
    desc: 'Coffee, pastries and a quick look at the week ahead.' },
  { id: 'e2', type: 'event', title: 'Team Photo Day', emoji: '📸', by: 'HR_tom', loc: 'Lobby', date: '2026-05-11', start: 13, end: 14, going: 31,
    desc: 'Updated headshots and a group shot for the company page. Look cute.' },
  { id: 'e3', type: 'event', title: 'End of Quarter Celebration', emoji: '🎉', by: 'HR_tom', loc: 'Rooftop', date: '2026-05-11', start: 15, end: 17, going: 48,
    desc: 'Drinks, snacks and a few words from leadership to wrap up Q2.' },
  { id: 'e4', type: 'event', title: 'New Joiner Welcome Drinks', emoji: '🍾', by: 'HR_sarah', loc: 'Floor 1 Lobby', date: '2026-05-11', start: 19, end: 21, going: 22,
    desc: 'Come say hi to the six people who joined us this month.' },

  // rest of the week
  { id: 'e5', type: 'event', title: 'Book Club: The Design of Everyday Things', emoji: '📚', by: 'HR_sarah', loc: 'Library', date: '2026-05-12', start: 17, end: 18, going: 11,
    desc: 'Chapters 1–3. New members welcome.' },
  { id: 'e6', type: 'event', title: 'Lunch & Learn: Design Systems', emoji: '🎓', by: 'HR_tom', loc: 'Room 321', date: '2026-05-13', start: 12, end: 13, going: 27,
    desc: 'How we scaled our component library across three products. Lunch provided.' },
  { id: 'e7', type: 'event', title: 'Rooftop Yoga', emoji: '🧘', by: 'HR_ellen', loc: 'Rooftop', date: '2026-05-14', start: 8, end: 9, going: 14,
    desc: 'All levels. Mats provided.' },
  { id: 'e8', type: 'event', title: 'Board game lunch', emoji: '🎲', by: 'tom123', loc: 'Room 204', date: '2026-05-15', start: 12, end: 13, going: 6,
    desc: 'Bringing Codenames and Ticket to Ride.' },
  { id: 'e9', type: 'event', title: 'Friday Drinks', emoji: '🍻', by: 'HR_sarah', loc: 'Bar area', date: '2026-05-15', start: 16, end: 18, going: 40,
    desc: 'End-of-week drinks. Non-alcoholic options available.' },
  { id: 'e10', type: 'event', title: 'Charity 5K', emoji: '🏃', by: 'HR_tom', loc: 'Riverside Park', date: '2026-05-16', start: 9, end: 11, going: 18,
    desc: 'Running for the local food bank. Walkers welcome.' },

  // the rest of May, for the month view (pop-ups only in the past)
  { id: 'p4', type: 'popup', title: 'Bagels in the kitchen', emoji: '🥯', by: 'ellen', loc: 'Kitchen, Floor 2', date: '2026-05-06', start: 9, end: 9.5, going: 8,
    desc: 'A dozen everything bagels and cream cheese.' },
  { id: 'p5', type: 'popup', title: 'Plant swap', emoji: '🪴', by: 'ellen', loc: 'Floor 3 lounge', date: '2026-05-07', start: 13, end: 13.5, going: 7,
    desc: 'Bring a cutting, take a cutting.' },
  { id: 'e11', type: 'event', title: 'Hackathon demos', emoji: '🚀', by: 'HR_tom', loc: 'Auditorium', date: '2026-05-20', start: 14, end: 16, going: 64,
    desc: 'Twelve teams, five minutes each.' },
  { id: 'e12', type: 'event', title: 'Town hall', emoji: '📣', by: 'HR_sarah', loc: 'Auditorium', date: '2026-05-27', start: 10, end: 11, going: 120,
    desc: 'Quarterly company update and Q&A.' },
];

// recurring events
for (const day of [4, 18, 25]) {
  ITEMS.push({ id: `kickoff-${day}`, type: 'event', title: 'Monday Morning Kickoff', emoji: '☕', by: 'HR_ellen', loc: 'Cafeteria',
    date: `2026-05-${String(day).padStart(2, '0')}`, start: 9, end: 10, going: 30, desc: 'Coffee, pastries and a quick look at the week ahead.' });
}
for (const day of [1, 8, 22, 29]) {
  ITEMS.push({ id: `drinks-${day}`, type: 'event', title: 'Friday Drinks', emoji: '🍻', by: 'HR_sarah', loc: 'Bar area',
    date: `2026-05-${String(day).padStart(2, '0')}`, start: 16, end: 18, going: 36, desc: 'End-of-week drinks. Non-alcoholic options available.' });
}

/* Explainer shown under the Pop-ups / Events filter */
const TYPE_NOTES = {
  popups: ['sparkle', 'Spur-of-the-moment things coworkers post on the day, like leftover food, a coffee run or a lunch walk. No RSVP, just show up.'],
  events: ['calendar_ltr', 'Planned ahead by teams and HR. Add them to your calendar so you don’t miss out.'],
};

/* Teams "Add an app" dialog */
const STORE = {
  recent: [
    { name: 'Tasks', icon: 'task_list_ltr', color: '#0F6CBD' },
    { name: 'Whiteboard', icon: 'whiteboard', color: '#2D7D9A' },
    { name: 'Polls', icon: 'poll', color: '#5B5FC7' },
    { name: 'Forms', icon: 'form', color: '#038387' },
    { name: 'Notes', icon: 'notebook', color: '#7719AA' },
    { name: 'Insights', icon: 'data_bar_vertical', color: '#C3501D' },
  ],
  sections: [
    { title: 'Popular in your org', apps: [
      { name: 'SEEK', desc: 'Create and join events', seek: true },
      { name: 'Polls', desc: 'Get your team’s opinion by creating a poll in a meeting', icon: 'poll', color: '#5B5FC7' },
      { name: 'Approvals', desc: 'Create, manage and share approvals', icon: 'checkmark_circle', color: '#0F6CBD' },
      { name: 'Q&A', desc: 'Engage your audience with live questions and answers', icon: 'chat_bubbles_question', color: '#8764B8' },
    ] },
    { title: 'Productivity', apps: [
      { name: 'Forms', desc: 'Easily create surveys, quizzes and polls.', icon: 'form', color: '#038387' },
      { name: 'Lists', desc: 'Track information and organize work', icon: 'clipboard_task_list_ltr', color: '#C239B3' },
      { name: 'Whiteboard', desc: 'Ideate and collaborate on a shared canvas', icon: 'whiteboard', color: '#2D7D9A' },
      { name: 'Insights', desc: 'Make your meetings more interactive with live data', icon: 'data_bar_vertical', color: '#C3501D' },
    ] },
    { title: 'Education', apps: [
      { name: 'Reading Coach', desc: 'Personalized reading practice for every learner', icon: 'book', color: '#0078D4' },
      { name: 'Wiki', desc: 'Build a shared knowledge base with your team', icon: 'slide_text', color: '#605E5C' },
    ] },
  ],
};

/* Chat list (Microsoft's sample personas) */
const CHATS = {
  pinned: [
    { name: 'Ray Tanaka', preview: 'Louisa will send the initial list of attendees', time: '10:40 AM' },
    { name: 'Beth Davis', preview: 'Thanks, that would be nice.', time: '10:43 AM' },
    { name: 'Kayo Miwa', preview: 'I reviewed with the client on Tuesday, she…', time: '4/17' },
    { name: 'Will, Kayo, Eric, +2', preview: 'Kayo: It would be great to sync with…', time: '9:12 AM', group: true },
    { name: 'August Bergman', preview: 'I haven’t checked available times yet', time: '9:20 AM', unread: true },
  ],
  recent: [
    { name: 'TerraSync', live: true, group: true }, // the demo conversation; preview and time come from the chat itself
    { name: 'Charlotte and Babak', preview: 'Babak: I asked the client to send her feedback…', time: 'Yesterday', group: true },
    { name: 'Emiliano Ceballos', preview: '😂😂', time: 'Yesterday', unread: true },
    { name: 'Marie Beaudouin', preview: 'Sounds good?', time: 'Yesterday' },
    { name: 'Oscar Krogh', preview: 'You: Thanks! Have a nice weekend', time: 'Fri' },
    { name: 'Daichi Fukuda', preview: 'No, I think there are other alternatives we c…', time: 'Fri' },
    { name: 'Kian Lambert', preview: 'Have you ran this by Beth? Make sure she is…', time: 'Thu' },
    { name: 'Team Design Template', preview: 'Reta: Let’s set up a brainstorm session for…', time: 'Thu', group: true },
    { name: 'Reviewers', preview: 'Darren: Thats fine with me', time: 'Wed', group: true },
  ],
};

/* Faces shown in the "going" avatar stacks */
const ATTENDEES = ['Kian Lambert', 'Beth Davis', 'Daichi Fukuda', 'Marie Beaudouin', 'Oscar Krogh', 'Ray Tanaka'];

/* TerraSync group chat (step 4) */
const CHAT_DRAFT = '@SEEK I am bringing Hot Dogs at 7:00 PM. Come to the cafeteria if you wanna join.';
const initialChat = () => [
  { who: 'hir', t: '10:52 AM', text: 'Morning team! Big push on the TerraSync launch this week 💪' },
  { who: 'jiwan', t: '10:55 AM', text: 'Final QA pass is done on my end ✅' },
  { who: 'steven', t: '10:58 AM', text: 'Nice! Demo deck is ready for Thursday too' },
  { who: 'priyanshi', t: '11:02 AM', text: 'Let’s do something fun after if we hit the deadline 😄' },
  { who: 'marie', t: '11:04 AM', text: '+1, we deserve it' },
  { who: 'me', t: '11:20 AM', text: 'Hey guys...' },
];

/* Scripted reactions after the first event SEEK detects (ms after the bot card) */
const CHAT_REPLIES = [
  { at: 900, typing: 'marie' },
  { at: 2400, who: 'marie', text: 'Yayy. I am in!', minute: 1 },
  { at: 3000, typing: 'priyanshi' },
  { at: 4300, who: 'priyanshi', text: 'Save me one 🙋‍♀️', minute: 2 },
  { at: 5000, react: '🌭 3' }, // reaction on Marie's reply
];

/* Portfolio step bar */
const STEPS = [
  ['Install', 'SEEK is added from the Teams app store, so there is no new software to approve.'],
  ['Browse', 'Today’s events, each one click away from the employee’s calendar.'],
  ['Create', 'Anyone can post an event in four fields.'],
  ['Detect', 'A shortcut on top of event creation: the SEEK bot spots an event in a chat and offers to post it.'],
];
