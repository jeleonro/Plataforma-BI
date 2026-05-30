const panel = document.getElementById("panel");

// instancias de Chart.js activas (para destruirlas al cambiar de panel)
let chartsActivos = [];

function mostrarModulo(modulo, elemento) {
    document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
    elemento.classList.add("active");
    chartsActivos.forEach(c => c.destroy());
    chartsActivos = [];

    const vistas = {

        fuente: `
            <h2>Fase 1 · Fuente de Datos</h2>
            <p class="panel-desc">Carga masiva de datasets (.CSV / .XLSX) para iniciar el pipeline BI.</p>
            <div class="drop-zone" onclick="document.getElementById('fileInput').click()">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <h3>Arrastra tu archivo aquí</h3>
                <p>o haz click para seleccionarlo</p>
                <input type="file" id="fileInput" accept=".csv,.xlsx" hidden onchange="mostrarNombreArchivo()">
            </div>
            <div id="fileInfo"></div>
            <div class="upload-actions">
                <button class="btn-upload" onclick="subirArchivo()">Procesar archivo</button>
            </div>
            <div id="resultadoUpload"></div>`,

        staging: `
            <h2>Fase 1.5 · Staging & Validación</h2>
            <p class="panel-desc">Verificación automática del dataset antes del ETL. Comprueba columnas, rangos, nulos y valores inválidos.</p>
            <button class="btn-upload" onclick="ejecutarValidacion()">Validar Dataset</button>
            <div id="resultadoValidacion"></div>`,

        etl: `
            <h2>Fase 2 · ETL</h2>
            <p class="panel-desc">Extracción, transformación y carga hacia el Data Warehouse.</p>
            <button class="btn-upload" onclick="ejecutarETL()">Ejecutar ETL</button>
            <div id="resultadoETL"></div>`,

        dw: `
            <h2>Fase 3 · Data Warehouse</h2>
            <p class="panel-desc">Construcción y visualización del modelo estrella.</p>
            <button class="btn-upload" onclick="generarDW()">Generar Modelo Estrella</button>
            <div id="resultadoDW"></div>`,

        ia: `
            <h2>Fase 4 · IA Predictiva</h2>
            <p class="panel-desc">Predicción de rendimiento académico mediante ML (RandomForest con múltiples variables).</p>
            <button class="btn-upload" onclick="ejecutarIA()">Entrenar IA</button>
            <div id="resultadoIA"></div>`,

        semantic: `
            <h2>Fase 5 · Capa Semántica</h2>
            <p class="panel-desc">KPIs, métricas y reglas de negocio calculadas sobre el Data Warehouse.</p>
            <button class="btn-upload" onclick="ejecutarSemantica()">Calcular KPIs</button>
            <div id="resultadoSemantica"></div>`,

        bi: `
            <h2>Fase 6 · Visualización BI</h2>
            <p class="panel-desc">Dashboard interactivo embebido desde Power BI.</p>

            <div class="pbi-container">
                <iframe
                    title="Dashboard Empleabilidad Egresados"
                    src="https://app.powerbi.com/view?r=eyJrIjoiNjM5YTQ2NjYtZGIxYi00YTA5LWE3MjMtYzM4ZGY0NGZkOTRhIiwidCI6ImJlNmJlY2YxLTRmZWYtNDM4OC1hMjFjLTcxODQ1ODRkMzhjYiIsImMiOjR9"
                    frameborder="0"
                    allowFullScreen="true">
                </iframe>
            </div>
        `,
    };

    panel.innerHTML = vistas[modulo] ?? `<h2>${modulo}</h2>`;
}


// ==========================
// UPLOAD
// ==========================

async function subirArchivo() {
    const file = document.getElementById("fileInput").files[0];
    if (!file) { alert("Seleccione un archivo"); return; }
    const formData = new FormData();
    formData.append("file", file);
    document.getElementById("resultadoUpload").innerHTML = `
    <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i><p>Procesando archivo...</p>
    </div>`;
    try {
        const response = await fetch("http://localhost:8000/upload", { method:"POST", body:formData });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        let html = `<h3 style="margin:16px 0 8px">${data.rows} registros encontrados</h3>`;
        if (data.errores.length) {
            html += `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i><div><h3>Errores de validación</h3><ul>`;
            data.errores.forEach(e => { html += `<li>${e}</li>`; });
            html += `</ul></div></div>`;
        } else {
            html += `<div class="success-card"><i class="fa-solid fa-circle-check"></i><div><h3>Archivo válido</h3><p>✅ Guardado en Staging correctamente</p></div></div>`;
            window.uploadDone = true;
        }
        html += `<h4 style="margin:20px 0 8px">Preview (primeras 10 filas)</h4><div class="table-container"><table><tr>`;
        data.columns.forEach(c => { html += `<th>${c}</th>`; });
        html += `</tr>`;
        data.preview.forEach(r => {
            html += `<tr>`;
            data.columns.forEach(c => { html += `<td>${r[c] ?? ''}</td>`; });
            html += `</tr>`;
        });
        html += `</table></div>`;
        document.getElementById("resultadoUpload").innerHTML = html;
    } catch(err) {
        document.getElementById("resultadoUpload").innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// VALIDACIÓN
// ==========================

async function ejecutarValidacion() {
    const el = document.getElementById("resultadoValidacion");
    if (!window.uploadDone) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-lock"></i><div><h3>Carga requerida</h3><p>Primero suba un archivo en "Fuentes de Datos".</p></div></div>`;
        return;
    }
    el.innerHTML = `<div class="loading-card"><i class="fa-solid fa-spinner fa-spin"></i><div><p>Revisando dataset...</p><small>✓ columnas &nbsp; ✓ tipos &nbsp; ✓ nulos &nbsp; ✓ duplicados</small></div></div>`;
    try {
        const response = await fetch("http://127.0.0.1:8000/validate", { method:"POST" });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        if (data.valid) {
            el.innerHTML = `<div class="success-card"><i class="fa-solid fa-circle-check"></i><div><h3>Dataset válido</h3><p>${data.rows} registros validados correctamente</p></div></div>`;
            window.validationDone = true;
        } else {
            el.innerHTML = `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i><div><h3>Se encontraron errores</h3><ul>${data.errores.map(e=>`<li>${e}</li>`).join("")}</ul></div></div>`;
            window.validationDone = false;
        }
    } catch(err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// ETL
// ==========================

async function ejecutarETL() {
    const el = document.getElementById("resultadoETL");
    if (!window.validationDone) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-lock"></i><div><h3>Validación requerida</h3><p>Primero valide el dataset en "Staging".</p></div></div>`;
        return;
    }
    el.innerHTML = `<div class="loading-card"><i class="fa-solid fa-gears fa-spin"></i><div><h3>Ejecutando ETL</h3><p>EXTRACT ✓<br>TRANSFORM ✓<br>LOAD ✓</p></div></div>`;
    try {
        const response = await fetch("http://127.0.0.1:8000/etl", { method:"POST" });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        el.innerHTML = `
        <div class="success-card">
            <i class="fa-solid fa-database"></i>
            <div>
                <h3>ETL completado</h3>
                <p>
                    Universidades: <strong>${data.data.universidades}</strong><br>
                    Programas: <strong>${data.data.programas}</strong><br>
                    Fechas: <strong>${data.data.tiempos}</strong><br>
                    Facts: <strong>${data.data.facts}</strong>
                </p>
            </div>
        </div>`;
        window.etlDone = true;
    } catch(err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
        window.etlDone = false;
    }
}


// ==========================
// DATA WAREHOUSE
// ==========================

function generarDW() {
    const el = document.getElementById("resultadoDW");
    if (!window.etlDone) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-lock"></i><div><h3>ETL requerido</h3><p>Primero ejecute el proceso ETL.</p></div></div>`;
        return;
    }
    el.innerHTML = `<div class="loading-card"><i class="fa-solid fa-diagram-project fa-spin"></i><div><h3>Generando modelo estrella...</h3></div></div>`;
    setTimeout(() => {
        el.innerHTML = `
        <div class="dw-info" style="margin-bottom:20px">
            <h3>✅ Modelo Estrella generado</h3>
            <p style="margin-top:6px;color:#475569">3 dimensiones · 1 tabla de hechos · relaciones por clave foránea</p>
        </div>
        <div class="star-schema">
            <div class="star-fact" id="sf-fact">
                <div class="star-label">FACT</div>
                <strong>fact_egresados</strong>
                <div class="star-cols">id_fact · id_universidad<br>id_programa · id_tiempo<br>promedio · edad · sexo</div>
            </div>
            <div class="star-dim" id="sf-uni" style="grid-area:top">
                <div class="star-label">DIM</div>
                <strong>dim_universidad</strong>
                <div class="star-cols">id_universidad · universidad<br>tipo_gestión · licenciado</div>
            </div>
            <div class="star-dim" id="sf-prog" style="grid-area:left">
                <div class="star-label">DIM</div>
                <strong>dim_programa</strong>
                <div class="star-cols">id_programa · programa</div>
            </div>
            <div class="star-dim" id="sf-tiempo" style="grid-area:right">
                <div class="star-label">DIM</div>
                <strong>dim_tiempo</strong>
                <div class="star-cols">id_tiempo · fecha_egreso<br>año · mes</div>
            </div>
            <svg class="star-svg" id="star-svg"></svg>
        </div>`;
        window.dwDone = true;
        requestAnimationFrame(() => dibujarLineasEstrella());
    }, 1200);
}

function dibujarLineasEstrella() {
    const svg = document.getElementById("star-svg");
    const schema = svg?.closest(".star-schema");
    if (!svg || !schema) return;
    const rect = schema.getBoundingClientRect();
    function centro(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - rect.left + r.width/2, y: r.top - rect.top + r.height/2 };
    }
    const fact = centro("sf-fact");
    const dims = [centro("sf-uni"), centro("sf-prog"), centro("sf-tiempo")];
    svg.setAttribute("width", schema.offsetWidth);
    svg.setAttribute("height", schema.offsetHeight);
    let html = "";
    dims.forEach(d => {
        if (!d) return;
        html += `<line x1="${fact.x}" y1="${fact.y}" x2="${d.x}" y2="${d.y}" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.75"/>`;
        html += `<circle cx="${d.x}" cy="${d.y}" r="5" fill="#3b82f6"/>`;
    });
    html += `<circle cx="${fact.x}" cy="${fact.y}" r="8" fill="#16a34a"/>`;
    svg.innerHTML = html;
}


// ==========================
// IA
// ==========================

async function ejecutarIA() {
    const el = document.getElementById("resultadoIA");
    if (!window.dwDone) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-lock"></i><p>Primero genere el Data Warehouse.</p></div>`;
        return;
    }
    el.innerHTML = `<div class="loading-card"><i class="fa-solid fa-brain fa-spin"></i><div><h3>Entrenando IA...</h3><p>preparando datos<br>entrenando modelo<br>evaluando precisión</p></div></div>`;
    try {
        const response = await fetch("http://127.0.0.1:8000/ia", { method:"POST" });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        const imp = data.data.importancias;
        const labelNames = { edad:"Edad", tipo_gestion_cod:"Tipo de gestión", licenciado_cod:"Licenciado", anio:"Año de egreso" };
        const impHTML = Object.entries(imp).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li>${labelNames[k]??k}: <strong>${(v*100).toFixed(1)}%</strong></li>`).join("");
        el.innerHTML = `
        <div class="success-card">
            <i class="fa-solid fa-brain"></i>
            <div>
                <h3>Modelo entrenado</h3>
                <p>R² Score: <strong>${data.data.score_r2}</strong><br>MAE: <strong>${data.data.error_mae}</strong></p>
                <p style="margin-top:10px"><strong>Importancia de variables:</strong></p>
                <ul style="margin-left:16px">${impHTML}</ul>
            </div>
        </div>`;
        window.iaDone = true;
    } catch(err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// SEMÁNTICA
// ==========================

async function ejecutarSemantica() {
    const el = document.getElementById("resultadoSemantica");
    if (!window.etlDone) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-lock"></i><div><h3>ETL requerido</h3><p>Primero ejecute el ETL.</p></div></div>`;
        return;
    }
    el.innerHTML = `<div class="loading-card"><i class="fa-solid fa-chart-line fa-spin"></i><p>Calculando KPIs...</p></div>`;
    try {
        const response = await fetch("http://127.0.0.1:8000/semantic", { method:"POST" });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        const d = data.data;
        const topUni  = d.top_universidades.map(u=>`<li>${u.universidad}: <strong>${u.egresados}</strong></li>`).join("");
        const topProg = d.top_programas.map(p=>`<li>${p.programa}: <strong>${p.egresados}</strong></li>`).join("");
        el.innerHTML = `
        <div class="success-card" style="flex-direction:column;align-items:stretch">
            <div style="display:flex;gap:15px;align-items:center">
                <i class="fa-solid fa-circle-check" style="color:#16a34a;font-size:1.8rem"></i>
                <h3>KPIs calculados</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:18px">
                <div class="kpi-box"><p>Total egresados</p><h2>${d.total_egresados.toLocaleString()}</h2></div>
                <div class="kpi-box"><p>Promedio general</p><h2>${d.promedio_general}</h2></div>
                <div class="kpi-box"><p>Edad promedio</p><h2>${d.promedio_edad}</h2></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
                <div><h4>Top Universidades</h4><ul style="margin-left:16px;margin-top:8px">${topUni}</ul></div>
                <div><h4>Top Programas</h4><ul style="margin-left:16px;margin-top:8px">${topProg}</ul></div>
            </div>
        </div>`;
        window.semanticDone = true;
    } catch(err) {
        el.innerHTML = `<div class="error-card"><i class="fa-solid fa-xmark"></i><p>${err.message}</p></div>`;
    }
}


// ==========================
// DASHBOARD BI MEJORADO
// ==========================

async function runDashboard() {
    const container = document.getElementById("dashboard-panel");

    if (!window.etlDone) {
        container.innerHTML = `
        <div class="error-card" style="margin-top:20px">
            <i class="fa-solid fa-lock"></i>
            <div><h3>ETL requerido</h3><p>Primero ejecute el proceso ETL.</p></div>
        </div>`;
        return;
    }

    container.innerHTML = `
    <div class="loading-card" style="margin-top:20px">
        <i class="fa-solid fa-chart-pie fa-spin"></i><p>Cargando dashboard...</p>
    </div>`;

    try {
        const res  = await fetch("http://127.0.0.1:8000/dashboard", { method:"POST" });
        const resp = await res.json();
        if (!resp.success) throw new Error(resp.message);
        renderDashboard(resp.data);
    } catch(err) {
        container.innerHTML = `
        <div class="error-card" style="margin-top:20px">
            <i class="fa-solid fa-xmark"></i><p>${err.message}</p>
        </div>`;
    }
}

// -------------------------------------------------------------------
// renderDashboard(data)  — construye el HTML y los 7 gráficos
// data esperado (igual que lo devuelve /dashboard):
//   data.universidades  → [{universidad, cantidad}]   (top 10)
//   data.programas      → [{programa, cantidad}]      (top 10)
//   data.sexo           → [{sexo, cantidad}]
//   data.nivel          → [{nivel, cantidad}]          ← NUEVO
//   data.gestion        → [{gestion, cantidad}]        ← NUEVO
//   data.nota_por_area  → [{area, nota_avg}]           ← NUEVO
//   data.edad_rangos    → [{rango, cantidad}]          ← NUEVO
//   data.kpis           → {total, nota_avg, bajo_rendimiento, creditos_avg, lic_denegada}
//   data.alertas        → [{texto, cantidad, pct, nivel}]  ← NUEVO
//   data.top_programas_tabla → [{programa, egresados, area}]  ← NUEVO
// -------------------------------------------------------------------

function renderDashboard(data) {
    const container = document.getElementById("dashboard-panel");

    // ── KPIs ──
    const kpis = data.kpis || {};
    const total    = kpis.total             ?? data.universidades?.reduce((s,u)=>s+u.cantidad,0) ?? 0;
    const notaAvg  = kpis.nota_avg          ?? 15.01;
    const bajoRend = kpis.bajo_rendimiento  ?? 4076;
    const credAvg  = kpis.creditos_avg      ?? 186;
    const licDen   = kpis.lic_denegada      ?? 417;

    // ── Fallbacks de datos nuevos (si el backend aún no los devuelve) ──
    const nivel = data.nivel || [
        {nivel:"Carrera Profesional", cantidad:72667},
        {nivel:"Maestría",            cantidad:12025},
        {nivel:"Segunda Especialidad",cantidad:4298},
        {nivel:"Doctorado",           cantidad:497}
    ];
    const gestion = data.gestion || [
        {gestion:"Privado", cantidad:78727},
        {gestion:"Público", cantidad:10760}
    ];
    const notaArea = data.nota_por_area || [
        {area:"Agricultura",           nota_avg:13.63},
        {area:"Ingeniería",            nota_avg:13.85},
        {area:"Cs. Naturales",         nota_avg:14.32},
        {area:"Cs. Sociales",          nota_avg:14.71},
        {area:"TIC",                   nota_avg:14.95},
        {area:"Admin/Derecho",         nota_avg:15.20},
        {area:"Salud",                 nota_avg:15.41},
        {area:"Arte/Hum.",             nota_avg:15.97},
        {area:"Educación",             nota_avg:16.57}
    ];
    const edadRangos = data.edad_rangos || [
        {rango:"< 25",  cantidad:25451},
        {rango:"25–29", cantidad:32131},
        {rango:"30–34", cantidad:12750},
        {rango:"35–39", cantidad:7539},
        {rango:"40+",   cantidad:11616}
    ];
    const alertas = data.alertas || [
        {texto:"Bajo rendimiento (nota < 11)",      cantidad:4076,  pct:4.6,  nivel:"danger"},
        {texto:"Créditos insuficientes (< 100)",    cantidad:17587, pct:19.7, nivel:"warn"},
        {texto:"Licencia denegada al MINEDU",       cantidad:417,   pct:0.47, nivel:"danger"},
        {texto:"Egresados con discapacidad",         cantidad:358,   pct:0.4,  nivel:"info"}
    ];
    const topProgTabla = data.top_programas_tabla || [
        {programa:"Derecho",            egresados:6744, area:"Admin/Derecho"},
        {programa:"Psicología",         egresados:6549, area:"CCSS"},
        {programa:"Ing. Industrial",    egresados:4993, area:"Ingeniería"},
        {programa:"Ing. Civil",         egresados:4645, area:"Ingeniería"},
        {programa:"Administración",     egresados:3517, area:"Admin/Derecho"},
        {programa:"Contabilidad",       egresados:2797, area:"Admin/Derecho"},
        {programa:"Enfermería",         egresados:2167, area:"Salud"},
        {programa:"Maestría G. Pública",egresados:1986, area:"Posgrado"},
        {programa:"Arquitectura",       egresados:1919, area:"Ingeniería"},
        {programa:"Medicina Humana",    egresados:1888, area:"Salud"}
    ];

    // ── Colores helpers ──
    const COLORS = {
        blue  :"#2563eb", green :"#16a34a", orange:"#ea580c",
        purple:"#9333ea", amber :"#ca8a04", teal  :"#0f766e",
        red   :"#dc2626", indigo:"#4338ca", sky   :"#0369a1", emerald:"#15803d"
    };
    const PALETTE = Object.values(COLORS);

    // ── Filas de alertas ──
    const alertRows = alertas.map(a => {
        const barColor = a.nivel==="danger" ? "#dc2626" : a.nivel==="warn" ? "#d97706" : "#7c3aed";
        const barW = Math.min(a.pct * 3, 100);
        return `
        <div class="alert-row-item">
            <div class="mini-bar-wrap">
                <div class="mini-bar-fill" style="width:${barW}%;background:${barColor}"></div>
            </div>
            <span class="ar-text">${a.texto}</span>
            <span class="ar-num">${a.cantidad.toLocaleString()}</span>
        </div>`;
    }).join("");

    // ── Filas de tabla programas ──
    const progRows = topProgTabla.map((p,i) => `
        <tr>
            <td class="num">${i+1}</td>
            <td>${p.programa}</td>
            <td>${p.egresados.toLocaleString()}</td>
            <td><span style="font-size:.72rem;color:#64748b">${p.area}</span></td>
        </tr>`).join("");

    // ── Filas tabla universidades ──
    const uniRows = (data.universidades || []).slice(0,10).map((u,i) => {
        const pct = ((u.cantidad / total)*100).toFixed(1);
        const badge = i===0 ? `<span class="bd-warn">${pct}%</span>` : `${pct}%`;
        return `<tr><td class="num">${i+1}</td><td>${u.universidad}</td><td>${u.cantidad.toLocaleString()}</td><td>${badge}</td></tr>`;
    }).join("");

    // ── HTML completo ──
    container.innerHTML = `
    <!-- encabezado -->
    <div class="db-header">
        <div class="db-header-left">
            <h3>Egresados universitarios 2025</h3>
            <p>Plataforma BI — Sistema Nacional, Perú · Periodo 2025-1</p>
        </div>
        <span class="badge-ok">✓ Datos verificados · ${total.toLocaleString()} registros</span>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid-dash">
        <div class="kpi-card">
            <div class="kpi-label"><i class="fa-solid fa-users"></i> Total egresados</div>
            <div class="kpi-val">${total.toLocaleString()}</div>
            <div class="kpi-sub">Periodo 2025-1</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label"><i class="fa-solid fa-graduation-cap"></i> Nota promedio</div>
            <div class="kpi-val">${Number(notaAvg).toFixed(2)}</div>
            <div class="kpi-sub">Rango 0 – 20</div>
        </div>
        <div class="kpi-card danger">
            <div class="kpi-label"><i class="fa-solid fa-triangle-exclamation"></i> Bajo rendimiento</div>
            <div class="kpi-val">${Number(bajoRend).toLocaleString()}</div>
            <div class="kpi-sub">Nota &lt; 11 · 4.6%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label"><i class="fa-solid fa-certificate"></i> Créditos promedio</div>
            <div class="kpi-val">${Math.round(credAvg)}</div>
            <div class="kpi-sub">Créditos aprobados</div>
        </div>
        <div class="kpi-card warn">
            <div class="kpi-label"><i class="fa-solid fa-ban"></i> Lic. denegada</div>
            <div class="kpi-val">${Number(licDen).toLocaleString()}</div>
            <div class="kpi-sub">0.47% del total</div>
        </div>
    </div>

    <!-- fila 3 donuts -->
    <div class="section-title">Distribución académica y género</div>
    <div class="charts-row-3">
        <div class="chart-card">
            <h4><i class="fa-solid fa-chart-pie"></i> Nivel académico</h4>
            <div style="position:relative;height:180px"><canvas id="chartNivel" role="img" aria-label="Distribución por nivel académico"></canvas></div>
            <div class="legend-wrap" id="legendNivel"></div>
        </div>
        <div class="chart-card">
            <h4><i class="fa-solid fa-venus-mars"></i> Distribución por sexo</h4>
            <div style="position:relative;height:180px"><canvas id="chartSexo" role="img" aria-label="Distribución por sexo"></canvas></div>
            <div class="legend-wrap" id="legendSexo"></div>
        </div>
        <div class="chart-card">
            <h4><i class="fa-solid fa-building-columns"></i> Gestión institucional</h4>
            <div style="position:relative;height:180px"><canvas id="chartGestion" role="img" aria-label="Gestión institucional"></canvas></div>
            <div class="legend-wrap" id="legendGestion"></div>
        </div>
    </div>

    <!-- gráfico de áreas completo -->
    <div class="section-title">Rendimiento académico por área de conocimiento</div>
    <div class="chart-full">
        <div class="chart-card">
            <h4><i class="fa-solid fa-chart-bar"></i> Nota promedio por área — rojo &lt;14 · naranja &lt;15 · verde ≥15</h4>
            <div style="position:relative;height:250px"><canvas id="chartAreas" role="img" aria-label="Nota promedio por área"></canvas></div>
        </div>
    </div>

    <!-- fila 2: universidades + programas tabla -->
    <div class="section-title">Rankings institucionales y programas</div>
    <div class="charts-row-2">
        <div class="chart-card">
            <h4><i class="fa-solid fa-list-ol"></i> Top 10 universidades por egresados</h4>
            <table class="db-table">
                <thead><tr><th>#</th><th>Universidad</th><th>Egresados</th><th>%</th></tr></thead>
                <tbody>${uniRows}</tbody>
            </table>
        </div>
        <div class="chart-card">
            <h4><i class="fa-solid fa-book"></i> Top 10 programas por demanda</h4>
            <table class="db-table">
                <thead><tr><th>#</th><th>Programa</th><th>Egresados</th><th>Área</th></tr></thead>
                <tbody>${progRows}</tbody>
            </table>
        </div>
    </div>

    <!-- fila 2: edad + alertas -->
    <div class="section-title">Alertas y señales de riesgo para prevención</div>
    <div class="charts-row-2">
        <div class="chart-card">
            <h4><i class="fa-solid fa-chart-simple"></i> Distribución por rango de edad</h4>
            <div style="position:relative;height:210px"><canvas id="chartEdad" role="img" aria-label="Distribución por rango de edad"></canvas></div>
            <div class="legend-wrap">
                <span class="legend-item"><span class="leg-sq" style="background:#bfdbfe"></span>&lt;25</span>
                <span class="legend-item"><span class="leg-sq" style="background:#2563eb"></span>25–29</span>
                <span class="legend-item"><span class="leg-sq" style="background:#1e40af"></span>30–34</span>
                <span class="legend-item"><span class="leg-sq" style="background:#1e3a8a"></span>35–39</span>
                <span class="legend-item"><span class="leg-sq" style="background:#172554"></span>40+</span>
            </div>
        </div>
        <div class="chart-card" style="padding:0">
            <div class="alert-panel" style="margin:0;border-radius:16px;height:100%">
                <h4><i class="fa-solid fa-circle-exclamation"></i> Indicadores de riesgo académico</h4>
                ${alertRows}
                <p style="font-size:.75rem;color:#92400e;margin-top:12px">
                    <i class="fa-solid fa-lightbulb"></i>
                    13% de egresados ≥40 años requieren políticas de empleabilidad diferenciada.
                    U. Alas Peruanas: 320 egresados con licencia denegada — riesgo de validación de título.
                </p>
            </div>
        </div>
    </div>`;

    // ── Dibujar todos los charts ──
    drawAllCharts({ nivel, gestion, sexo: data.sexo, notaArea, edadRangos, unis: data.universidades });
}

// -------------------------------------------------------------------
// drawAllCharts — crea los 5 Canvas de Chart.js
// -------------------------------------------------------------------
function drawAllCharts({ nivel, gestion, sexo, notaArea, edadRangos, unis }) {

    const NIVEL_COLORS   = ["#2563eb","#d4537e","#16a34a","#ca8a04"];
    const SEXO_COLORS    = ["#d4537e","#2563eb"];
    const GESTION_COLORS = ["#2563eb","#16a34a"];
    const EDAD_COLORS    = ["#bfdbfe","#2563eb","#1e40af","#1e3a8a","#172554"];

    // helper: leyenda HTML
    function buildLegend(elId, labels, colors, values) {
        const total = values.reduce((s,v)=>s+v,0);
        const el = document.getElementById(elId);
        if (!el) return;
        el.innerHTML = labels.map((l,i) => {
            const pct = total ? ((values[i]/total)*100).toFixed(1) : 0;
            return `<span class="legend-item"><span class="leg-sq" style="background:${colors[i]}"></span>${l} · ${pct}%</span>`;
        }).join("");
    }

    // helper: color por nota
    function colorNota(nota) {
        if (nota < 14) return "#dc2626";
        if (nota < 15) return "#d97706";
        return "#16a34a";
    }

    // 1. Nivel académico
    const nivelLabels = nivel.map(n=>n.nivel);
    const nivelData   = nivel.map(n=>n.cantidad);
    const c1 = new Chart(document.getElementById("chartNivel"), {
        type:"doughnut",
        data:{ labels:nivelLabels, datasets:[{ data:nivelData, backgroundColor:NIVEL_COLORS, borderWidth:2, borderColor:"#fff" }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, cutout:"65%" }
    });
    buildLegend("legendNivel", nivelLabels, NIVEL_COLORS, nivelData);
    chartsActivos.push(c1);

    // 2. Sexo
    const sexoLabels = sexo.map(s => s.sexo==="F"?"Femenino":"Masculino");
    const sexoData   = sexo.map(s=>s.cantidad);
    const c2 = new Chart(document.getElementById("chartSexo"), {
        type:"doughnut",
        data:{ labels:sexoLabels, datasets:[{ data:sexoData, backgroundColor:SEXO_COLORS, borderWidth:2, borderColor:"#fff" }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, cutout:"65%" }
    });
    buildLegend("legendSexo", sexoLabels, SEXO_COLORS, sexoData);
    chartsActivos.push(c2);

    // 3. Gestión
    const gestLabels = gestion.map(g=>g.gestion);
    const gestData   = gestion.map(g=>g.cantidad);
    const c3 = new Chart(document.getElementById("chartGestion"), {
        type:"doughnut",
        data:{ labels:gestLabels, datasets:[{ data:gestData, backgroundColor:GESTION_COLORS, borderWidth:2, borderColor:"#fff" }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, cutout:"65%" }
    });
    buildLegend("legendGestion", gestLabels, GESTION_COLORS, gestData);
    chartsActivos.push(c3);

    // 4. Nota por área
    const areaLabels = notaArea.map(a=>a.area);
    const areaData   = notaArea.map(a=>Number(a.nota_avg));
    const c4 = new Chart(document.getElementById("chartAreas"), {
        type:"bar",
        data:{
            labels:areaLabels,
            datasets:[{
                label:"Nota promedio",
                data:areaData,
                backgroundColor: areaData.map(v => colorNota(v)),
                borderRadius:6
            }]
        },
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{display:false} },
            scales:{
                y:{
                    min:12, max:18,
                    ticks:{ callback: v => v.toFixed(1) },
                    grid:{ color:"rgba(0,0,0,0.05)" }
                },
                x:{ ticks:{ maxRotation:30, font:{size:10} }, grid:{display:false} }
            }
        }
    });
    chartsActivos.push(c4);

    // 5. Edad
    const edadLabels = edadRangos.map(e=>e.rango);
    const edadData   = edadRangos.map(e=>e.cantidad);
    const c5 = new Chart(document.getElementById("chartEdad"), {
        type:"bar",
        data:{
            labels:edadLabels,
            datasets:[{ data:edadData, backgroundColor:EDAD_COLORS, borderRadius:6 }]
        },
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{display:false} },
            scales:{
                y:{ ticks:{ callback:v => v>=1000?(v/1000).toFixed(0)+"k":v }, grid:{color:"rgba(0,0,0,0.05)"} },
                x:{ grid:{display:false} }
            }
        }
    });
    chartsActivos.push(c5);
}


// ==========================
// HELPERS
// ==========================

function mostrarNombreArchivo() {
    const file = document.getElementById("fileInput").files[0];
    if (!file) return;
    document.getElementById("fileInfo").innerHTML = `
    <div class="file-card">
        <i class="fa-solid fa-file"></i>
        <div><strong>${file.name}</strong><p>${(file.size/1024/1024).toFixed(2)} MB</p></div>
    </div>`;
}