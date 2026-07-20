// Aggiorna dinamicamente il dropdown Progetto al cambio Cliente
function initClienteProgettoFilter(clienteSelId, progettoSelId) {
    const clienteSel = document.getElementById(clienteSelId);
    const progettoSel = document.getElementById(progettoSelId);
    if (!clienteSel || !progettoSel) return;

    clienteSel.addEventListener('change', function () {
        const cid = this.value;
        progettoSel.innerHTML = '<option value="">— tutti —</option>';
        if (!cid) return;
        fetch('/api/progetti?cliente_id=' + cid)
            .then(r => r.json())
            .then(data => {
                data.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.nome;
                    progettoSel.appendChild(opt);
                });
            });
    });
}

// Copia percorso di rete negli appunti
function copyPercorso(el) {
    const text = el.dataset.path;
    navigator.clipboard.writeText(text).then(() => {
        el.title = 'Copiato!';
        setTimeout(() => { el.title = 'Copia percorso'; }, 1500);
    });
}

// Toggle sezione "aggiungi" (ordini, varianti, allegati, articoli)
function toggleAddForm(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Apri modale anteprima file (qualsiasi tipo) via /file/anteprima
function apriAnteprima(path, nome) {
    const modal = document.getElementById('modalAnteprima');
    if (!modal) return;
    const iframe = document.getElementById('previewIframe');
    const titolo = document.getElementById('modalAnteprimaTitolo');
    const dlLink = document.getElementById('previewDownloadLink');
    const previewUrl = '/file/anteprima?path=' + encodeURIComponent(path);
    const serveUrl = '/file/serve?path=' + encodeURIComponent(path);
    titolo.textContent = nome || path.split(/[\\/]/).pop();
    iframe.src = previewUrl;
    dlLink.href = serveUrl;
    new bootstrap.Modal(modal).show();
    // Pulisci iframe alla chiusura
    modal.addEventListener('hidden.bs.modal', function onHide() {
        iframe.src = '';
        modal.removeEventListener('hidden.bs.modal', onHide);
    }, { once: true });
}

// Gestione delegata per pulsanti anteprima (usa data-anteprima-path/nome)
document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-anteprima-path]');
    if (btn) {
        apriAnteprima(btn.dataset.anteprimaPath, btn.dataset.anteprimaNome || '');
    }
});

// ============================================================
// SELETTORE FILE — attinge alla cartella documenti condivisa
// (invece di dover digitare/incollare manualmente il percorso)
// ============================================================
let _selettoreFileCache = null;
let _selettoreFileTargetInput = null;
let _selettoreFileTargetLabel = null;

const ICONE_ESTENSIONE = {
    pdf: 'bi-file-earmark-pdf text-danger',
    docx: 'bi-file-earmark-word text-primary',
    doc: 'bi-file-earmark-word text-primary',
    xlsx: 'bi-file-earmark-excel text-success',
    xls: 'bi-file-earmark-excel text-success',
    png: 'bi-file-earmark-image text-secondary',
    jpg: 'bi-file-earmark-image text-secondary',
    jpeg: 'bi-file-earmark-image text-secondary',
    gif: 'bi-file-earmark-image text-secondary',
    webp: 'bi-file-earmark-image text-secondary'
};

// Apre il selettore: inputId è l'input (anche hidden) da valorizzare col percorso,
// labelId è l'elemento che mostra il nome file scelto all'utente.
function apriSelettoreFile(inputId, labelId) {
    _selettoreFileTargetInput = document.getElementById(inputId);
    _selettoreFileTargetLabel = labelId ? document.getElementById(labelId) : null;

    const modal = document.getElementById('modalSelettoreFile');
    const lista = document.getElementById('selettoreFileLista');
    const filtro = document.getElementById('selettoreFileFiltro');
    filtro.value = '';
    lista.innerHTML = '<div class="text-muted small p-2">Caricamento elenco documenti…</div>';
    new bootstrap.Modal(modal).show();

    const render = () => renderSelettoreFile(_selettoreFileCache, '');

    if (_selettoreFileCache) {
        render();
    } else {
        fetch('/file/browse')
            .then(r => r.json())
            .then(data => {
                _selettoreFileCache = data.cartelle || [];
                render();
            })
            .catch(() => {
                lista.innerHTML = '<div class="text-danger small p-2">Impossibile caricare l\'elenco documenti.</div>';
            });
    }

    filtro.oninput = () => renderSelettoreFile(_selettoreFileCache, filtro.value.trim().toLowerCase());
}

function renderSelettoreFile(cartelle, filtroTesto) {
    const lista = document.getElementById('selettoreFileLista');
    if (!cartelle) return;
    lista.innerHTML = '';

    let trovati = 0;
    cartelle.forEach(cartella => {
        const fileFiltrati = cartella.file.filter(f =>
            !filtroTesto || f.nome.toLowerCase().includes(filtroTesto));
        if (fileFiltrati.length === 0) return;
        trovati += fileFiltrati.length;

        const gruppo = document.createElement('div');
        gruppo.className = 'mb-2';
        gruppo.innerHTML = `<div class="small fw-semibold text-muted text-uppercase mb-1">${cartella.nome}</div>`;

        const elenco = document.createElement('div');
        elenco.className = 'list-group';
        fileFiltrati.forEach(f => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action py-1 px-2 d-flex align-items-center gap-2';
            const icona = ICONE_ESTENSIONE[f.estensione] || 'bi-file-earmark';
            item.innerHTML = `<i class="bi ${icona}"></i><span class="text-truncate">${f.nome}</span>`;
            item.addEventListener('click', () => selezionaFile(f));
            elenco.appendChild(item);
        });
        gruppo.appendChild(elenco);
        lista.appendChild(gruppo);
    });

    if (trovati === 0) {
        lista.innerHTML = '<div class="text-muted small p-2">Nessun documento trovato.</div>';
    }
}

function selezionaFile(f) {
    if (_selettoreFileTargetInput) {
        _selettoreFileTargetInput.value = f.percorso;
    }
    if (_selettoreFileTargetLabel) {
        _selettoreFileTargetLabel.textContent = f.nome;
        _selettoreFileTargetLabel.classList.remove('text-muted');
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalSelettoreFile'));
    if (modal) modal.hide();
}

document.addEventListener('DOMContentLoaded', function () {
    // Chiudi alert flash dopo 4s
    document.querySelectorAll('.alert.alert-success, .alert.alert-warning').forEach(a => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(a);
            bsAlert.close();
        }, 4000);
    });

    // Rendi ridimensionabili le colonne delle tabelle marcate .table-resizable
    document.querySelectorAll('table.table-resizable').forEach(initResizableTable);
});

// Aggiunge maniglie di ridimensionamento a ciascuna intestazione di colonna
function initResizableTable(table) {
    table.style.tableLayout = 'fixed';
    const headers = table.querySelectorAll('thead th');

    headers.forEach(th => {
        if (!th.style.width) {
            th.style.width = th.offsetWidth + 'px';
        }
        const handle = document.createElement('span');
        handle.className = 'col-resize-handle';
        th.style.position = 'relative';
        th.appendChild(handle);

        let startX, startWidth;

        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            startX = e.pageX;
            startWidth = th.offsetWidth;
            document.body.classList.add('col-resizing');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            const newWidth = Math.max(40, startWidth + (e.pageX - startX));
            th.style.width = newWidth + 'px';
        }

        function onMouseUp() {
            document.body.classList.remove('col-resizing');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    });
}
