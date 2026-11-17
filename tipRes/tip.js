const editorElement = document.querySelector('#editor');

/* ----------------------------------- TIPTAP ----------------------------- */

import { Editor, Extension } from 'https://esm.sh/@tiptap/core@2.11.5';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.11.5';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.11.5';
import Underline from 'https://esm.sh/@tiptap/extension-underline@2.11.5';
import Link from 'https://esm.sh/@tiptap/extension-link@2.11.5';
import Table from 'https://esm.sh/@tiptap/extension-table@2.11.5';
import TableRow from 'https://esm.sh/@tiptap/extension-table-row@2.11.5';
import TableCell from 'https://esm.sh/@tiptap/extension-table-cell@2.11.5';
import TableHeader from 'https://esm.sh/@tiptap/extension-table-header@2.11.5';
import Image from 'https://esm.sh/@tiptap/extension-image@2.11.5';
import Superscript from 'https://esm.sh/@tiptap/extension-superscript';
import Subscript from 'https://esm.sh/@tiptap/extension-subscript';

import { Mark, mergeAttributes } from 'https://esm.sh/@tiptap/core@2.11.5';
import { Node } from 'https://esm.sh/@tiptap/core@2.11.5';
import DOMPurify from 'https://esm.sh/dompurify';

const InlineSvg = Node.create({
  name: 'inlineSvg',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      svg: {
        default: '',
        parseHTML: el => el.outerHTML,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'svg' }]
  },

  renderHTML({ node }) {
    const tpl = document.createElement('template')
    tpl.innerHTML = DOMPurify.sanitize(node.attrs.svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    })
    return tpl.content.firstElementChild
  },
});

const CustomSpan = Mark.create({
  name: 'customSpan',
  
  parseHTML() {
    return [{ tag: 'span[class], span[style]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        }
      }
    };
  }
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {}),
      },
    }
  },
});

const IndentExtension = Extension.create({
    name: 'indent',
    addOptions() {
    return {
        types: ['paragraph', 'heading', 'blockquote'],
        minLevel: 0,
        maxLevel: 6,
    };
    },
    addGlobalAttributes() {
    return [
        {
        types: this.options.types,
        attributes: {
            indent: {
            default: 0,
            parseHTML: element => {
                const level = parseInt(element.getAttribute('data-indent'), 10);
                return level && !isNaN(level) ? level : 0;
            },
            renderHTML: attributes => {
                if (!attributes.indent || attributes.indent <= this.options.minLevel) return {};
                return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * 2}em;`,
                };
            },
            },
        },
        },
    ];
    },
    addCommands() {
    const setNodeIndentMarkup = (tr, pos, delta) => {
        const node = tr?.doc?.nodeAt(pos);
        if (node) {
        const nextLevel = (node.attrs.indent || 0) + delta;
        const { minLevel, maxLevel } = this.options;
        const indent = nextLevel < minLevel ? minLevel : nextLevel > maxLevel ? maxLevel : nextLevel;
        if (indent !== node.attrs.indent) {
            const { indent: oldIndent, ...currentAttrs } = node.attrs;
            const nodeAttrs = indent > minLevel ? { ...currentAttrs, indent } : currentAttrs;
            return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks);
        }
        }
        return tr;
    };

    const updateIndentLevel = (tr, delta) => {
        const { doc, selection } = tr;
        if (doc && selection) {
        const { from, to } = selection;
        doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
            tr = setNodeIndentMarkup(tr, pos, delta);
            return false;
            }
            return true;
        });
        }
        return tr;
    };

    const applyIndent = direction => () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr = tr.setSelection(selection);
        tr = updateIndentLevel(tr, direction);
        if (tr.docChanged) {
        dispatch?.(tr);
        return true;
        }
        return false;
    };

    return {
        indent: applyIndent(1),
        outdent: applyIndent(-1),
    };
    },
    addKeyboardShortcuts() {
    return {
        Tab: () => this.editor.commands.indent(),
        'Shift-Tab': () => this.editor.commands.outdent(),
    };
    },
});

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: { default: null },
    }
  },
});

const editor = new Editor({
    element: editorElement,
    editable: true,
    extensions: [
        StarterKit.configure({ heading: { levels: [1, 2] } }),
        Underline,
        Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        IndentExtension,
        TextAlign.configure({
            types: ['heading', 'paragraph', 'blockquote'],
            alignments: ['left', 'center', 'right', 'justify'],
            defaultAlignment: 'left'
        }),
        CustomSpan,
        CustomTableCell,
        CustomImage.configure({ inline: true, allowBase64: true }),
        InlineSvg,
        Superscript, Subscript
    ],
    content: `
<h1>Document title</h1>
<p>Start writing your document here (type -- for an en-dash).</p>
<h2>Section heading</h2>
This is an inspiring block-quote.`,
    //onSelectionUpdate: updateToolbar,
    onTransaction: () => {
        //updateToolbar();
        //checkPageHeight();
    },
    editorProps: {
        attributes: {
            spellcheck: 'true',
            'aria-label': 'Document content'
        },
        handleTextInput: (view, from, to, text) => {
            if (text === '-' && from > 1) {
                const $from = view.state.doc.resolve(from);
                const prevChar = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1),$from.parentOffset);
                if (prevChar === '-') {
                    view.dispatch(view.state.tr.replaceWith(from - 1, to, view.state.schema.text('–')));
                    return true;
                }
            }
            return false;
        }
    }
});

/*function checkPageHeight() {
    const contentHeight = editorElement.offsetHeight;
    const onePageHeightPx = 267 * 3.7795; // 297mm height minus 30mm top/bottom padding
    const neededPages = Math.max(1, Math.ceil(contentHeight / onePageHeightPx));
    pageContainer.style.minHeight = `${neededPages * 297}mm`;
}

function updateToolbar() {
    if (!editor || editor.isDestroyed) return;

    document.querySelectorAll('[data-command]').forEach(button => {
    const command = button.dataset.command;
    let active = false;

    if (['bold', 'italic', 'underline', 'link', 'bulletList', 'orderedList'].includes(command)) {
        active = editor.isActive(command);
    }

    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    });

    document.querySelectorAll('[data-align]').forEach(button => {
    const align = button.dataset.align;
    const active = editor.isActive({ textAlign: align });
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    });

    if (editor.isActive('heading', { level: 1 })) {
    blockType.value = 'h1';
    } else if (editor.isActive('heading', { level: 2 })) {
    blockType.value = 'h2';
    } else if (editor.isActive('blockquote')) {
    blockType.value = 'blockquote';
    } else {
    blockType.value = 'paragraph';
    }
}*/

document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
        const command = button.dataset.command;
        const commands = {
            undo: () => editor.chain().focus().undo().run(),
            redo: () => editor.chain().focus().redo().run(),
            indent: () => editor.commands.indent(),
            outdent: () => editor.commands.outdent(),
            bold: () => editor.chain().focus().toggleBold().run(),
            italic: () => editor.chain().focus().toggleItalic().run(),
            chenar: () => editor.chain().focus().toggleMark('customSpan', { class: 'chenar' }).run(),
            underline: () => editor.chain().focus().toggleUnderline().run(),
            nbsp: () => editor.commands.insertContent({ type: 'text', text: '\u00A0' }),
            left: () => editor.chain().focus().setTextAlign('left').run(),
            center: () => editor.chain().focus().setTextAlign('center').run(),
            right: () => editor.chain().focus().setTextAlign('right').run(),
            justify: () => editor.chain().focus().setTextAlign('justify').run(),
            link: async () => {
                const selection = window.getSelection(); if (selection.isCollapsed) return;
                const inp = await showPrompt('Enter the link address (URL like https://...)', 'https://');
                if (inp == '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
                else editor.chain().focus().extendMarkRange('link').setLink({ href: inp }).run();
      
            },
            h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            bulletList: () => editor.chain().focus().toggleBulletList().run(),
            orderedList: () => editor.chain().focus().toggleOrderedList().run(),
            sect: () => editor.commands.insertContent('§'),
            UpperCase: () => {
                const sel = window.getSelection();
                if (!sel.isCollapsed) editor.commands.insertContent(sel.toString().toUpperCase()); },
            LowerCase: () => {
                const sel = window.getSelection();
                if (!sel.isCollapsed) editor.commands.insertContent(sel.toString().toLowerCase()); },
            removeFormat: () => editor.chain().focus().unsetAllMarks().run(),
            sup: () => editor.chain().focus().toggleSuperscript().run(),
            sub: () => editor.chain().focus().toggleSubscript().run(),
            horizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
            frag: () => {
            editor.chain().focus()
            .insertContent('<span class="material-symbols-outlined" style="font-size: 3lh;float: left;margin-right: 10px;">nest_clock_farsight_analog</span>')
            .run();
            }
        };
        commands[command]?.();
    });
});


/* ----------------------------------- FUNCTIONS ----------------------------- */
let savedRange = null;

function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0);
    }
}

function restoreSelection() {
    const selection = window.getSelection();
    if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }
}

function makeOptions(grp, arr) {
  grp.replaceChildren();
  for(let x of arr) {
    const el = document.createElement('input'),
      lb = document.createElement('label');
    lb.className = 'radioBtn';
    el.type = 'radio'; el.name = 'promptRadio';
    lb.append(el);
    if(x.startsWith('*')) { el.checked = true; lb.append(x.slice(1)); }
    else lb.append(x);
    grp.append(lb);
  }
}

function showPrompt(message, defaultValue = '', tip = 'inp') {
    return new Promise((resolve) => {
        saveSelection();
        const modal = document.getElementById('PromptModal');
        const inputEl = modal.querySelector('#promptInput');
        const grp = modal.querySelector('#radioGroup');
        const submitBtn = modal.querySelector('#promptSubmit');
        const cancelBtn = modal.querySelector('#promptCancel');

        modal.querySelector('#promptMessage').innerHTML = message;
        if(tip == 'inp') {
          inputEl.style.display = 'block';
          inputEl.value = defaultValue;
          inputEl.focus();
        }
        else if(tip == 'opt') {
          makeOptions(grp, defaultValue);
          grp.style.display = 'grid';
          grp.style.gridTemplateColumns = `repeat(${defaultValue.length}, auto)`;
          grp.focus();
        }
        else submitBtn.focus();
        
        modal.showModal();

        const onSubmit = () => {
            let val;
            if(tip == 'inp') val = inputEl.value;
            else if(tip == 'opt') val = grp.querySelector('label:has(input:checked)').textContent;
            else val = true;
            cleanup();
            resolve(val);
        };

        const onCancel = () => {
            cleanup();
            resolve(null);
        };

        const cleanup = () => {
            modal.close();
            submitBtn.removeEventListener('click', onSubmit);
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('keydown', onKeydown);
            inputEl.style.display = 'none';
            grp.style.display = 'none';
            editorElement.focus();
            restoreSelection();
        };

        const onKeydown = (e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
          if (e.key === 'Escape') onCancel();
        };

        submitBtn.addEventListener('click', onSubmit);
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('keydown', onKeydown);
    });
}

function getAddress(flag) {
    if(flag == 'date') {
        const now = new Date();
        return `${('0' + now.getDate()).slice(-2)}.${('0' + (now.getMonth() + 1)).slice(-2)}.${now.getFullYear()}`;
    }
    return `${flag == 'from' ? '[Absender]<br>Abs.:' : '[Empfänger]<br>An:'} Vorname Nachname<br>Goethestraße 42<br>60313 Frankfurt am Main<br>Germany`;
}

document.getElementById('titlu').addEventListener('click', () => {
    const tbl = `<table><tbody>
    <tr><td style="width:100%;padding:0 .6em .6em 0;border-right:1px solid #000;vertical-align:bottom;"><h1>REQUEST</h1></td>
        <td style="width: 1%; white-space: nowrap;padding:0 0 .6em 1em;">${getAddress('to')}</td>
    </tr>
    <tr><td colspan="2" style="border:1px solid #000;padding:.6em 0;"><p style="text-align: center">The description of the subject-matter<br>to be brought to the attention.</p></td></tr>
    </tbody></table>`;
    editor.chain().focus().insertContent(tbl, {
        parseOptions: { preserveWhitespace: false },
    }).run();      
});

document.querySelector('#address').addEventListener('click', () => {
    const t = `<table><tr>
        <td>${getAddress('from')}</td>
        <td style="width:1%;white-space: nowrap;">${getAddress('to')}</td>
    </tr></table><p></p><p>Datum: ${getAddress('date')}</p>`;
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
});

function makeRemark(mod) {
  let svg;
  switch(mod) {
    case 'quote':
      svg = '<svg width="24" fill="currentColor" viewBox="0 0 24 24"><path d="M14 21v-7q1-9 9-11l1 2q-4 2-4 6h4v10zM0 21v-7Q1 5 9 3l1 2q-4 2-4 6h4v10z"/></svg>';
      break;
    case 'note':
      svg = '<svg width="28" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56-23t-24-57v-560q0-33 24-56t56-24h357l-80 80H200v560h560v-278l80-80v358q0 33-23 57t-57 23zm160-240v-170l367-367q12-12 27-18t30-6q16 0 31 6t26 18l56 57q11 12 17 27t6 29-5 30-18 26L530-360zm481-424-56-56zM440-440h56l232-232-28-28-29-28-231 231zm260-260-29-28zl28 28z"/></svg>';
      break;
    case 'warning':
      svg = '<svg width="28" fill="currentColor" viewBox="0 -960 960 960"><path d="M509-291q11-12 11-29t-11-28-29-12-28 12-12 28 12 29 28 11 29-11m-69-149h80v-240h-80zm40 360q-83 0-156-31t-127-86-85-127-32-156 32-156 85-127 127-85 156-32 156 32 127 85 86 127 31 156-31 156-86 127-127 86-156 31m0-80q134 0 227-93t93-227-93-227-227-93-227 93-93 227 93 227 227 93m0-320"/></svg>';
      break;
    case 'bulb':
      svg = '<svg width="28" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-80q-26 0-47-12t-33-34q-33 0-56-23t-24-57v-142q-59-39-94-103t-36-139q0-121 85-205t205-85 206 85 84 205q0 77-35 140t-95 102v142q0 33-23 57t-57 23q-12 21-33 34t-47 12m-80-126h160v-36H400zm0-76h160v-38H400zm-8-118h58v-108l-88-88 42-42 76 76 76-76 42 42-88 88v108h58q54-26 88-76t34-114q0-88-61-149t-149-61-149 61-61 149q0 63 34 114t88 76m88-200"/></svg>';
      break;
    case 'decision':
      svg = '<svg width="28" fill="currentColor" viewBox="0 -960 960 960"><path d="M160-120v-80h480v80zm226-194L160-540l84-86 228 226zm254-254L414-796l86-84 226 226zm184 408L302-682l56-56 522 522z"/></svg>';
      break;
    case 'attach':
      svg = '<svg width="28" fill="currentColor" viewBox="0 -960 960 960"><path d="M720-330q0 104-73 177T470-80t-177-73-73-177v-370q0-75 53-127t127-53 128 53 52 127v350q0 46-32 78t-78 32-78-32-32-78v-370h80v370q0 13 9 22t21 8 22-8 8-22v-350q-1-42-29-71t-71-29-71 29-29 71v370q-1 71 49 121t121 49q70 0 119-49t51-121v-390h80z"/></svg>';
      break;
    case 'keep':
      svg = '<svg width="28" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12l2,2v2H13v6l-1,1l-1-1V16H6V14l2-2V5H7V3H17V5H16v7ZM8.85,14h6.3L14,12.85V5H10v7.85L8.85,14ZM12,14Z"/></svg>';
      break;
    default: svg = '>';
  }
  const selection = window.getSelection();
  const sel = selection.isCollapsed ? '...' : selection.toString();
  const t = `<table><tr>
      <td style="border-right: .8px solid #000; width: 40px;">${svg}</td>
      <td style="padding-left: 1em;">${sel}</td></tr></table>`;
  
  editor.chain().focus().insertContent(t, {
    parseOptions: { preserveWhitespace: false },
  }).run();
}

document.querySelectorAll('[data-remark]').forEach(button => {
  button.addEventListener('click', () => {
      makeRemark(button.dataset.remark);
  });
});

document.querySelector('#signature').addEventListener('click', async () => {
  const inp = await showPrompt('How many signatories?',['1','*2','3'], 'opt');
  if (!inp) return;
  const blk = '<td style="width:30%;border-top: .8px solid #000; padding-top: .2em;">Signatory,<br>position</td>';

  let t = '<table style="line-height: 1.1;"><tr>';
  if(inp == 1) t += `${blk}<td style="width:70%"></td>`;
  else if(inp == 2) t += `${blk}<td style="width:40%"></td>${blk}`;
  else t += `${blk}<td style="width:5%"></td>${blk}<td style="width:5%"></td>${blk}`;
  t += '</tr></table><br>';

  editor.chain().focus().insertContent(t, {
    parseOptions: { preserveWhitespace: false },
  }).run();
});

function getCurrentElement() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const anchorNode = selection.anchorNode;
    //return anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
    //return anchorNode.isText ? anchorNode.parentElement : anchorNode;
    //return anchorNode.type.name === 'text' ? anchorNode.parentElement : anchorNode;
    return anchorNode.parentElement;
  }
  return null;
}

var tableElement;
document.getElementById('insertTable') .addEventListener('click', () => {
  tableElement = getCurrentElement();
  if(!tableElement) return;
  saveSelection();
  tableElement = tableElement.closest('tr,#editor');
  if(tableElement.tagName == 'TR') document.getElementById('modifyTable').showModal();
  else document.getElementById('insertTableDlg').showModal();
});

function reNum(tbl) {
  if(!tbl.hasAttribute('renewable')) return;
  const rgx = />(.)<\/div>/;
  const lttr = tbl.rows[0].cells[0].innerHTML.match(rgx);
  let tip = -1;
  if(lttr) tip = lttr[0].charCodeAt(1); else { console.log('Letter ERROR'); return; }
  if(tip >= 48 && tip <= 57) tip = 0;
  else if(tip >= 65 && tip <= 90) tip = 1;
  else if(tip >= 97 && tip <= 122) tip = 2;
  if(tip == -1) { console.log('LETTER ERROR'); return; }
  let iCnt = 0;
  for (const r of tbl.rows) {
    let clc = (tip == 0) ? (iCnt+1) : String.fromCharCode(iCnt + ((tip == 1) ? 65 : 97));
    r.cells[0].innerHTML = r.cells[0].innerHTML.replace(rgx, (match, cnt) => {
      return `>${clc}</span>`;
    });
    iCnt++;
  }
}

function makeBrd(Tbl, flag) {
  const rs = Tbl.rows.length, cs = Tbl.rows[0].cells.length;
  let st, ln = flag ? 'border-top: .8px solid #000;' : '';
  for(let i = 0; i < rs; i++) {
    for(let c = 0; c < cs; c++) {
      let t = '.5em', r = t, b = t, l = t;
      let brd = ln;
      if(c == 0) l=0; else if(c == cs-1) r=0;
      if(i == 0) { brd=''; t=0; }
      else if(i == rs-1) b=0;
      st = Tbl.rows[i].cells[c].style;
      st.cssText = `width: ${st.width}; padding: ${t} ${r} ${b} ${l}; ${brd}`;
    }
  }
}


function getTableIndexes() {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'tableRow') {
      const tableDepth = d - 1,
        tbl = $from.node(tableDepth),
        from = $from.before(tableDepth),
        to = from + tbl.nodeSize;
      return {
        tbl,
        row: $from.index(tableDepth),
        col: $from.index(d),
        from,
        to
      }
    }
  }
  return null;
}

window.modTable = function(elm, flag) {
  const loc = getTableIndexes(); if(!loc) return;
  const T = loc.tbl.toJSON(), R = T.content[ loc.row ];
  const EL = R.content[0].content[0].content[0];
  const { from, to } = loc;

  function reNumer() {
    if(!EL.marks || EL.marks[0].type != 'customSpan') return;
    let tip = EL.text.charCodeAt(0);
    if(tip >= 48 && tip <= 57) tip = 0;
    else if(tip >= 65 && tip <= 90) tip = 1;
    else if(tip >= 97 && tip <= 122) tip = 2;
    let iCnt = 1;
    for(let r of T.content) {
      r.content[0].content[0].content[0].text = ((tip == 0) ?
        iCnt.toString() :
        String.fromCharCode(iCnt + ((tip == 1) ? 64 : 96)));
      iCnt++;
    }
  }

  closeDlg(elm);

  if(flag < 2) {                    //---- insert before and after
    const newRow = structuredClone(R);
    T.content.splice(loc.row + flag, 0, newRow);
    reNumer();
    editor.chain().focus().insertContentAt({ from, to }, T).run();
    return;  
  }

  if(flag == 6 || flag == 7) {       //---- move up and down
    if(flag == 6) {
      if(loc.row == 0) return;
      [T.content[loc.row], T.content[loc.row-1]] = [T.content[loc.row-1], T.content[loc.row]];
    }
    else {
      if(loc.row == T.content.length - 1) return;
      [T.content[loc.row], T.content[loc.row+1]] = [T.content[loc.row+1], T.content[loc.row]];
    }
    reNumer();
    editor.chain().focus().insertContentAt({ from, to }, T).run();
    return;
  }
  if(flag == 2) {
    if(T.content.length == 1) { editor.chain().focus().deleteTable().run(); return; }
    T.content.splice(loc.row, 1);
    reNumer();
    editor.chain().focus().insertContentAt({ from, to }, T).run();
    return;
  }
  if(flag == 3) editor.chain().focus().deleteTable().run();

    /*switch(flag) {
      case 4: makeBrd(T, true); return;
      case 5: makeBrd(T, false); return;
    }*/
}

window.closeDlg = function(el) {
  el.closest('dialog').close();
  restoreSelection();
  editorElement.focus();
};

function getSelectedLines() {
    if(savedRange.collapsed) return null;
    const con = document.createElement("div");
    con.appendChild(savedRange.cloneContents());
    document.body.appendChild(con);
    const txt = con.innerText;
    document.body.removeChild(con);
    return txt.split(/\r?\n/).filter(line => line.length > 0);
}

document.getElementById('tableModalInsert').addEventListener('click', (e) => {
  const T = tableElement.closest('table');
  const val = document.querySelector('dialog input[name="tbl_opt"]:checked').value;
  let lines = getSelectedLines(),
      rows = lines ? lines.length : document.getElementById('tableRows').value;

  if(val == 'one') {
    closeDlg(e.target);
    restoreSelection();
    editorElement.focus();
    const t = `<table><tr><td style="border: .8px solid #000; border-radius:6px;padding: 1em;">${lines?lines.join('<br>'):'...'}</td></tr></table><p></p>`;
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }

  if(val == 'square') {
    closeDlg(e.target);
    restoreSelection();
    const t = `<table><tr>
        <td style="width:1em;border: .8px solid #000; border-right:none; border-radius: 6px 0 0 6px;"><p></p></td>
        <td style="width:auto;padding: .6em 0;">${lines?lines.join('<br>'):'...'}</td>
        <td style="width:1em;border: .8px solid #000; border-left:none; border-radius:0 6px 6px 0;"><p></p></td>
    </tr></table><p></p>`;
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }

  if(val.startsWith('listDash')) {
    closeDlg(e.target);
    restoreSelection();
    const brd = (val == 'listDash') ? true : false;
    let t = '<table>';
    for(let r = 0; r < rows; r++) {
        t += `<tr><td style="width:2em;${ brd ? 'padding:0 1em 1em 0;border-right:.8px solid #000;' : 'padding:0 1em 1em 0;' }">&ndash;</td>
        <td style="width:100%;padding:${brd ? '0 0 1em 1em':'0 0 1em 0'};">${lines?lines[r]:'...'}</td></tr>`;
    }
    t += '</table><p></p>';
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }

  if(val == 'table') {
    closeDlg(e.target);
    restoreSelection();
    const parts = document.getElementById('tableCols').value.split(' '), L = parts.length;
    let t = '<table>';
    for(let r = 0; r < rows; r++) {
      t += '<tr>';
      let btm1 = '0 1em 1em 0', btm2 = '0 0 1em 0';
      if(r == rows-1) { btm1 = '0 1em 0 0'; btm2 = '0 0 0 0'; }
      for(let c = 0; c < L; c++) {
        t += `<td style="width:${parts[c]};padding:${ (c < L-1) ? btm1 : btm2 }">...</td>`;
      }
      t += '</tr>';
    }
    t += '</table><p></p>';
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }

  if(val.startsWith('list_')) {
    closeDlg(e.target);
    restoreSelection();

    const lttr = document.querySelector('dialog input[name="list_lttr"]:checked').value;
    let lt, btm = ' style="padding-bottom: .8em;"', t = '<table renewable>';
    for (let r = 0; r < rows; r++) {

      if(r == rows-1) btm = '';
      if(lttr == '1') lt = (r+1).toString();
      else if(lttr == 'A') lt = String.fromCharCode(r + 65);
      else lt = String.fromCharCode(r + 97);

      let cnt = lines ? lines[r] : '...';

      if(val == 'list_1') t += `<tr><td style="width: 40px;">
        <span style="display:inline-block;text-align:center;line-height:2em;width:2em;height:2em;border:.8px solid #000;border-radius:50%;">${lt}</span>
        </td><td${btm}>${cnt}</td></tr>`;
      else if(val == 'list_A') t += `<tr><td style="width: 40px;">
        <span style="display:inline-block; height:2em; width:2em; line-height:2em; padding-left:.5em; border: .8px solid #000; border-top-right-radius: 50%; border-bottom-right-radius: 50%;">${lt}</span>
        </td><td${btm}>${cnt}</td></tr>`;
      else if(val == 'list_s') t += `<tr><td style="width: 40px;">
        <span style="display:inline-block;height:30px;aspect-ratio:1;padding:4px 8px;border-top:.8px solid #000;border-left:.8px solid #000;border-top-left-radius: 8px;">${lt}</span>
        </td><td${btm}>${cnt}</td></tr>`;
      else t += `<tr><td style="width: 40px;">
        <span style="display:inline-block;width:1.4em;aspect-ratio:1;padding: 0 6px 6px 0;border-right: .8px solid #000;border-bottom: .8px solid #000;border-bottom-right-radius: 60%;">${lt}</span>
        </td><td${btm}>${cnt}</td></tr>`;
    }
    t += '</table>';
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }

  if(val.startsWith('twoPanel')) {
    closeDlg(e.target);
    restoreSelection();
    const flg = (val == 'twoPanel');
    let i = 0, t = '<table><p></p>';
    if(lines) {
      if(rows % 2 == 1) { rows++; lines[rows-1] = '...'; }
      rows /= 2;
    }
    for (let r = 0, i = 0; r < rows; r++, i += 2) {
      t += `<tr><td style="${flg ? 'border-right: .8px solid #000;' : ''}padding: ${r==0?'0':'1em'} .6em 0 0; width: 50%;">${lines?lines[i]:'...'}</td>
        <td style="padding: ${r==0?'0':'1em'} 0 0 .6em;">${lines?lines[i+1]:'...'}</td></tr>`;
    }
    t += '</table><p></p>';
    editor.chain().focus().insertContent(t, {
        parseOptions: { preserveWhitespace: false },
    }).run();
    return;
  }
});

document.querySelector('#fineprint').addEventListener('click', () => {
  const selection = window.getSelection();
  editor.commands.insertContent(`<span class="fineprint">${selection.isCollapsed ? '...' : selection.toString()}</span>`);
});
/* ------------- Insert Image --------------- */

document.querySelector('#uploadFile').addEventListener('click', () => {
  saveSelection();
  document.getElementById('insertImageDlg').showModal();
});

document.getElementById('imageModalInsert').addEventListener('click', (e) => {
    const elm = getCurrentElement();
    const srcImg = document.querySelector('#previewImage');
    if(srcImg.src == '') return;

    const img_width = document.querySelector('dialog input[name="image_width"]:checked').value;
    const img_align = document.querySelector('dialog input[name="image_align"]:checked').value;
    const img_filter = document.querySelector('dialog input[name="image_filter"]:checked').value;
/* -- by HTML -- */
    let algn = 'display:inline-block;';
    const avatar = document.getElementById('image_avatar').checked;
    if(avatar) {
      const avSize = parseInt(document.getElementById('avatar_size').value,10);
      const avTip = document.querySelector('dialog input[name="avatar_tip"]:checked').value;
      let avT = 'border-radius: 50%;';
      if(avTip == 'octagon') avT = 'clip-path: polygon(29% 0,71% 0,100% 29%,100% 71%,71% 100%,29% 100%,0 71%,0 29%);'
      else if(avTip == 'arrow') avT = 'clip-path: polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%);'
      algn += `width:${avSize}px;height:${avSize}px;${avT}object-fit: cover;`;
    }
    else algn += (img_width == 'lines') ? `height:${document.getElementById('byLines').value}lh; width:auto;` : `width:${img_width};`;
    const shdw = document.querySelector('#image_shadow').checked;
    if(img_filter != 'normal' || shdw)
      algn += `filter:${img_filter != 'normal' ? img_filter : ''}${shdw?' drop-shadow(0px 2px 3px #666)':''};`;
    if(img_align == 'left') algn += 'margin-right:.8em; float:left;';
    else if(img_align == 'right') algn += 'margin-left:.8em; float:right;';
    else algn += 'margin:0;';
    if(document.querySelector('#image_border').checked) algn += 'border:.5px solid #888;';
    if(!avatar && document.querySelector('#image_radius').checked) algn += 'border-radius:.6em;';

    closeDlg(e.target);
    restoreSelection();
    editor.chain().focus().setImage({
        src: srcImg.src,
        style: algn
    }).run();
});

document.querySelector('#fileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64File = e.target.result;
    document.getElementById('placeHolder').style.display = "none";
    document.getElementById('previewImage').src = base64File;
  };
  reader.readAsDataURL(file);
});

document.querySelector('#clearAll').addEventListener('click', async() => {
  if(await showPrompt('<b style="color:red">Remove</b> all format?','','ask')) {
    editor.chain().focus().selectAll().unsetAllMarks().clearNodes().run();
  }
});

editor.commands.focus('start');