// ─── Unicode Font Maps ───
const FONTS = {
  bold: {
    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
    digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'
  },
  italic: {
    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
    digits: '0123456789'
  },
  boldItalic: {
    upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
    lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
    digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'
  },
  monospace: {
    upper: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
    lower: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
    digits: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿'
  },
  script: {
    upper: '𝒜𝒝𝒞𝒟𝒠𝒡𝒢𝒣𝒤𝒥𝒦𝒧𝒨𝒩𝒪𝒫𝒬𝒭𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
    lower: '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
    digits: '0123456789'
  },
  fraktur: {
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
    digits: '0123456789'
  },
  doubleStruck: {
    upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
    lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
    digits: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡'
  },
  circled: {
    upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
    lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
    digits: '⓪①②③④⑤⑥⑦⑧⑨'
  },
  squared: {
    upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
    lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
    digits: '0123456789'
  },
  smallCaps: {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ',
    digits: '0123456789'
  }
};

function convertFont(text, fontName) {
  if (fontName === 'strikethrough') {
    return [...text].map(c => c + '\u0336').join('');
  }
  if (fontName === 'underline') {
    return [...text].map(c => c + '\u0332').join('');
  }

  const font = FONTS[fontName];
  if (!font) return text;

  const upperChars = [...font.upper];
  const lowerChars = [...font.lower];
  const digitChars = [...font.digits];

  return [...text].map(char => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return upperChars[code - 65] || char;
    if (code >= 97 && code <= 122) return lowerChars[code - 97] || char;
    if (code >= 48 && code <= 57) return digitChars[code - 48] || char;
    return char;
  }).join('');
}

// ─── Emoji Data ───
const EMOJIS = {
  'Popular': ['🔥','💡','🚀','✅','❌','👉','👇','💪','🎯','⚡','💰','🏆','📌','🔑','💎','⭐','🙌','👏','🎉','❤️','🧠','📈','📊','🛠️','💬','📢','🤝','🌟','✨','🎁'],
  'Business': ['📊','📈','📉','💹','💼','🏢','🏦','💳','🧾','📋','📑','📝','✍️','🖊️','📧','📬','🤵','👔','🎓','🏅','📱','💻','⌨️','🖥️','🔒','🔓','⚙️','🔧','📡','🌐'],
  'People': ['👋','🤔','😊','😎','🤩','💭','🗣️','👥','🫂','🙏','💯','🎯','🧑‍💻','👨‍💼','👩‍💼','🧑‍🏫','🧑‍🎓','🦾','🧑‍🤝‍🧑','🤷','🙋','✋','👆','☝️','🫡','🤓','😤','🔥','💪','🏃'],
  'Arrows': ['→','←','↑','↓','↗','↘','↙','↖','⟶','⟵','⇒','⇐','⇧','⇩','⟹','⟸','➡️','⬅️','⬆️','⬇️','↩️','↪️','🔄','🔃','▶️','◀️','🔽','🔼','➤','➜'],
  'Symbols': ['•','◆','◇','▪','▫','★','☆','○','●','□','■','△','▲','▽','▼','♦','♠','♣','♥','✦','✧','⟡','⊕','⊗','✓','✗','⟐','⌁','꘎','║']
};

// ─── Templates ───
const HOOKS = [
  { title: 'Hot Take', tag: 'hook', text: 'Unpopular opinion:\n\n[Your controversial take]\n\nHere\'s why 👇' },
  { title: 'Story Hook', tag: 'hook', text: 'I was [situation] when [unexpected thing happened].\n\nIt changed everything I knew about [topic].\n\nHere\'s the story:' },
  { title: 'Number Hook', tag: 'hook', text: 'I spent [X hours/days/years] doing [activity].\n\nHere are [N] things I wish I knew from day one:\n\n↓' },
  { title: 'Myth Buster', tag: 'hook', text: '"[Common belief]"\n\nThis is the biggest lie in [industry].\n\nThe truth? ↓' },
  { title: 'Before/After', tag: 'hook', text: '6 months ago: [bad situation]\nToday: [great result]\n\nHere\'s the exact playbook:' },
  { title: 'Controversial Q', tag: 'hook', text: 'Why does nobody talk about [topic]?\n\nI\'ve been thinking about this for weeks.\n\nHere\'s what I\'ve realized:' },
];

const FRAMEWORKS = [
  { title: 'Listicle', tag: 'list', text: '[Hook — 1 sentence]\n\n1. [Point 1]\n2. [Point 2]\n3. [Point 3]\n4. [Point 4]\n5. [Point 5]\n\n─────────\n\nTL;DR: [Key takeaway]\n\n♻️ Repost if this was helpful\n👉 Follow [Name] for more' },
  { title: 'Story + Lesson', tag: 'story', text: '[Hook — what happened]\n\nSome context:\n[2-3 sentences of background]\n\nHere\'s what I did:\n→ [Step 1]\n→ [Step 2]\n→ [Step 3]\n\nThe result?\n[Outcome]\n\nThe lesson:\n[1-2 sentences]\n\n─────────\n\nAgree? Let me know 👇' },
  { title: 'Do This Not That', tag: 'list', text: 'Stop doing [bad thing].\nStart doing [good thing].\n\n❌ [Bad approach 1]\n✅ [Better approach 1]\n\n❌ [Bad approach 2]\n✅ [Better approach 2]\n\n❌ [Bad approach 3]\n✅ [Better approach 3]\n\nThe difference?\n[Explanation]\n\n─────────\n\nWhich one resonated most? 👇' },
  { title: 'CTA Post', tag: 'cta', text: '[Bold claim or announcement]\n\nI\'m looking for [N] [type of people] who want to:\n\n✦ [Benefit 1]\n✦ [Benefit 2]\n✦ [Benefit 3]\n\nHere\'s the deal:\n[What you\'re offering]\n\n→ Comment "[word]" and I\'ll DM you the details.\n\n(Serious inquiries only)' },
];

// ─── Init ───
const editor = document.getElementById('mainEditor');
const charCount = document.getElementById('charCount');
const lineCount = document.getElementById('lineCount');
const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function updateCounts() {
  const len = editor.value.length;
  const lines = editor.value.split('\n').length;
  charCount.textContent = `${len.toLocaleString()} / 3,000`;
  charCount.className = 'char-count' + (len > 2800 ? ' warn' : '') + (len > 3000 ? ' over' : '');
  lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;

  // Update preview
  document.getElementById('previewBox').textContent = editor.value || 'Start typing in the Format tab...';
  document.getElementById('previewCharCount').textContent = `${len.toLocaleString()} / 3,000`;
}

editor.addEventListener('input', updateCounts);

// ─── Tabs ───
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── Font buttons ───
document.getElementById('fontToolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-font]');
  if (!btn) return;
  const fontName = btn.dataset.font;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  if (start === end) {
    // No selection — convert entire text
    editor.value = convertFont(editor.value, fontName);
  } else {
    // Convert selection only
    const selected = editor.value.substring(start, end);
    const converted = convertFont(selected, fontName);
    editor.value = editor.value.substring(0, start) + converted + editor.value.substring(end);
    editor.setSelectionRange(start, start + converted.length);
  }
  editor.focus();
  updateCounts();
});

// ─── Separator buttons ───
document.getElementById('sepGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sep]');
  if (!btn) return;
  const sep = btn.dataset.sep;
  const pos = editor.selectionStart;
  editor.value = editor.value.substring(0, pos) + sep + editor.value.substring(pos);
  editor.selectionStart = editor.selectionEnd = pos + sep.length;
  editor.focus();
  updateCounts();
});

// ─── Hashtags ───
document.getElementById('hashtagRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.hashtag');
  if (!btn) return;
  const tag = btn.textContent;
  const val = editor.value;
  if (val && !val.endsWith('\n') && !val.endsWith(' ')) {
    editor.value += ' ';
  }
  editor.value += tag + ' ';
  editor.focus();
  updateCounts();
});

// ─── Emojis ───
const emojiCatsEl = document.getElementById('emojiCats');
const emojiGridEl = document.getElementById('emojiGrid');
let activeEmojiCat = 'Popular';

function renderEmojiCats() {
  emojiCatsEl.innerHTML = '';
  for (const cat of Object.keys(EMOJIS)) {
    const btn = document.createElement('button');
    btn.className = 'emoji-cat' + (cat === activeEmojiCat ? ' active' : '');
    btn.textContent = EMOJIS[cat][0] + ' ' + cat;
    btn.style.fontSize = '12px';
    btn.addEventListener('click', () => {
      activeEmojiCat = cat;
      renderEmojiCats();
      renderEmojiGrid();
    });
    emojiCatsEl.appendChild(btn);
  }
}

function renderEmojiGrid() {
  emojiGridEl.innerHTML = '';
  for (const emoji of EMOJIS[activeEmojiCat]) {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      const pos = editor.selectionStart;
      editor.value = editor.value.substring(0, pos) + emoji + editor.value.substring(pos);
      editor.selectionStart = editor.selectionEnd = pos + emoji.length;
      updateCounts();
      showToast(`${emoji} inserted`);
    });
    emojiGridEl.appendChild(btn);
  }
}

renderEmojiCats();
renderEmojiGrid();

// ─── Templates ───
function renderTemplates() {
  const hookContainer = document.getElementById('hookTemplates');
  const fwContainer = document.getElementById('frameworkTemplates');

  HOOKS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `<h3><span class="template-tag ${t.tag}">${t.tag}</span> ${t.title}</h3><p>${t.text.substring(0, 80)}...</p>`;
    card.addEventListener('click', () => {
      editor.value = t.text;
      updateCounts();
      // Switch to format tab
      document.querySelectorAll('.tab').forEach(tb => tb.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-tab="format"]').classList.add('active');
      document.getElementById('tab-format').classList.add('active');
      showToast('Template loaded — customize it!');
    });
    hookContainer.appendChild(card);
  });

  FRAMEWORKS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `<h3><span class="template-tag ${t.tag}">${t.tag}</span> ${t.title}</h3><p>${t.text.substring(0, 90)}...</p>`;
    card.addEventListener('click', () => {
      editor.value = t.text;
      updateCounts();
      document.querySelectorAll('.tab').forEach(tb => tb.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-tab="format"]').classList.add('active');
      document.getElementById('tab-format').classList.add('active');
      showToast('Template loaded — customize it!');
    });
    fwContainer.appendChild(card);
  });
}
renderTemplates();

// ─── Copy buttons ───
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!editor.value.trim()) { showToast('Nothing to copy!'); return; }
  await copyText(editor.value);
  const btn = document.getElementById('copyBtn');
  btn.textContent = 'Copied!';
  btn.classList.add('btn-success');
  setTimeout(() => { btn.textContent = 'Copy to Clipboard'; btn.classList.remove('btn-success'); }, 1500);
  showToast('Copied to clipboard — paste in LinkedIn!');
});

document.getElementById('previewCopyBtn').addEventListener('click', async () => {
  if (!editor.value.trim()) { showToast('Nothing to copy!'); return; }
  await copyText(editor.value);
  showToast('Copied to clipboard!');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  editor.value = '';
  updateCounts();
  editor.focus();
});

// ─── Persist draft ───
chrome.storage.local.get(['draft'], (data) => {
  if (data.draft) {
    editor.value = data.draft;
    updateCounts();
  }
});

editor.addEventListener('input', () => {
  chrome.storage.local.set({ draft: editor.value });
});
